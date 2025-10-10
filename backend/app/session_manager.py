"""
Session Management for TTS Service

Provides session-based state management to avoid passing large text data in URLs.
Sessions store text, voice settings, and segmentation results.
"""
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class SessionData:
    """
    Session data model containing user input and segmentation results.
    """
    session_id: str
    text: str
    voice: str
    name: Optional[str] = None  # Optional custom name for the session
    persistent: bool = False  # Whether this is a persistent session (stored in Redis)
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: datetime = field(default=None)
    sentences: Optional[List[Dict[str, Any]]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Set expiration time if not provided"""
        if self.expires_at is None:
            # Sessions expire after 1 hour by default
            self.expires_at = self.created_at + timedelta(hours=1)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        # Convert datetime objects to ISO format strings
        data['created_at'] = self.created_at.isoformat()
        data['expires_at'] = self.expires_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionData':
        """Create SessionData from dictionary"""
        # Convert ISO format strings to datetime objects
        data = data.copy()
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        data['expires_at'] = datetime.fromisoformat(data['expires_at'])
        return cls(**data)

    def is_expired(self) -> bool:
        """Check if session has expired"""
        # Persistent sessions never expire
        if self.persistent:
            return False
        return datetime.utcnow() > self.expires_at


class SessionManager:
    """
    Manages user sessions with automatic cleanup of expired sessions.

    Features:
    - UUID-based session IDs
    - Automatic expiration and cleanup
    - Thread-safe operations
    - In-memory storage for temporary sessions
    - Redis storage for persistent sessions
    """

    def __init__(
        self,
        default_ttl_hours: int = 1,
        cleanup_interval_seconds: int = 300,
        persistent_store = None
    ):
        """
        Initialize session manager.

        Args:
            default_ttl_hours: Default time-to-live for sessions in hours
            cleanup_interval_seconds: Interval for automatic cleanup task in seconds
            persistent_store: Optional PersistentSessionStore instance for Redis storage
        """
        self._sessions: Dict[str, SessionData] = {}  # In-memory temporary sessions
        self._persistent_store = persistent_store  # Redis storage for persistent sessions
        self._lock = asyncio.Lock()
        self._default_ttl = timedelta(hours=default_ttl_hours)
        self._cleanup_interval = cleanup_interval_seconds
        self._cleanup_task = None

        logger.info(f"SessionManager initialized with TTL={default_ttl_hours}h, cleanup={cleanup_interval_seconds}s, persistent_store={'enabled' if persistent_store else 'disabled'}")

    async def create_session(
        self,
        text: str,
        voice: str,
        name: Optional[str] = None,
        ttl_hours: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        persistent: bool = False
    ) -> SessionData:
        """
        Create a new session.

        Args:
            text: User input text
            voice: Selected voice
            name: Optional custom name for the session
            ttl_hours: Optional custom TTL in hours (ignored for persistent sessions)
            metadata: Optional metadata dictionary
            persistent: Whether to store session in Redis (persistent sessions never expire)

        Returns:
            SessionData object with generated session_id
        """
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()

        ttl = timedelta(hours=ttl_hours) if ttl_hours else self._default_ttl
        expires_at = now + ttl

        session = SessionData(
            session_id=session_id,
            text=text,
            voice=voice,
            name=name,
            persistent=persistent,
            created_at=now,
            expires_at=expires_at,
            metadata=metadata or {}
        )

        if persistent and self._persistent_store:
            # Save to Redis for persistent storage
            await self._persistent_store.save_session(session_id, session.to_dict())
            logger.info(f"Persistent session created: {session_id}")
        else:
            # Save to memory for temporary storage
            async with self._lock:
                self._sessions[session_id] = session
            logger.info(f"Temporary session created: {session_id}, expires at {expires_at.isoformat()}")

        return session

    async def get_session(self, session_id: str) -> Optional[SessionData]:
        """
        Retrieve a session by ID.

        Args:
            session_id: Session identifier

        Returns:
            SessionData if found and not expired, None otherwise
        """
        # First check memory (temporary sessions)
        async with self._lock:
            session = self._sessions.get(session_id)

            if session is not None:
                if session.is_expired():
                    logger.info(f"Temporary session expired: {session_id}")
                    del self._sessions[session_id]
                    return None
                return session

        # Then check Redis (persistent sessions)
        if self._persistent_store:
            session_data = await self._persistent_store.get_session(session_id)
            if session_data:
                session = SessionData.from_dict(session_data)
                logger.debug(f"Retrieved persistent session: {session_id}")
                return session

        logger.warning(f"Session not found: {session_id}")
        return None

    async def update_session(
        self,
        session_id: str,
        sentences: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update session data.

        Args:
            session_id: Session identifier
            sentences: Segmentation results to store
            metadata: Additional metadata to update

        Returns:
            True if updated successfully, False if session not found
        """
        # Try updating memory session first
        async with self._lock:
            session = self._sessions.get(session_id)

            if session is not None:
                if session.is_expired():
                    logger.warning(f"Cannot update expired session: {session_id}")
                    return False

                if sentences is not None:
                    session.sentences = sentences
                if metadata:
                    session.metadata.update(metadata)

                logger.info(f"Temporary session updated: {session_id}")
                return True

        # Try updating persistent session
        if self._persistent_store:
            session_data = await self._persistent_store.get_session(session_id)
            if session_data:
                session = SessionData.from_dict(session_data)

                if sentences is not None:
                    session.sentences = sentences
                if metadata:
                    session.metadata.update(metadata)

                # Save back to Redis
                await self._persistent_store.save_session(session_id, session.to_dict())
                logger.info(f"Persistent session updated: {session_id}")
                return True

        logger.warning(f"Cannot update session (not found): {session_id}")
        return False

    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.

        Args:
            session_id: Session identifier

        Returns:
            True if deleted, False if not found
        """
        deleted = False

        # Try deleting from memory
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.info(f"Temporary session deleted: {session_id}")
                deleted = True

        # Try deleting from Redis
        if self._persistent_store:
            if await self._persistent_store.delete_session(session_id):
                logger.info(f"Persistent session deleted: {session_id}")
                deleted = True

        return deleted

    async def cleanup_expired(self) -> int:
        """
        Remove all expired sessions.

        Returns:
            Number of sessions removed
        """
        async with self._lock:
            expired_ids = [
                sid for sid, session in self._sessions.items()
                if session.is_expired()
            ]

            for sid in expired_ids:
                del self._sessions[sid]

            if expired_ids:
                logger.info(f"Cleaned up {len(expired_ids)} expired sessions")

            return len(expired_ids)

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get session manager statistics.

        Returns:
            Dictionary with stats
        """
        async with self._lock:
            temp_total = len(self._sessions)
            temp_expired = sum(1 for s in self._sessions.values() if s.is_expired())
            temp_active = temp_total - temp_expired

        # Get persistent session count
        persistent_count = 0
        if self._persistent_store:
            persistent_count = await self._persistent_store.count_sessions()

        return {
            "temporary_sessions": {
                "total": temp_total,
                "active": temp_active,
                "expired": temp_expired
            },
            "persistent_sessions": persistent_count,
            "total_sessions": temp_total + persistent_count,
            "default_ttl_hours": self._default_ttl.total_seconds() / 3600,
            "persistent_store_enabled": self._persistent_store is not None
        }

    async def start_cleanup_task(self):
        """Start background task for automatic cleanup"""
        if self._cleanup_task is not None:
            logger.warning("Cleanup task already running")
            return

        async def cleanup_loop():
            while True:
                try:
                    await asyncio.sleep(self._cleanup_interval)
                    removed = await self.cleanup_expired()
                    if removed > 0:
                        logger.info(f"Auto-cleanup removed {removed} sessions")
                except Exception as e:
                    logger.error(f"Error in cleanup task: {e}")

        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info("Cleanup task started")

    async def stop_cleanup_task(self):
        """Stop background cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
            logger.info("Cleanup task stopped")


# Global session manager instance
# Initialized with Redis support if enabled via environment variables
def _create_session_manager():
    """Create and configure session manager with optional Redis support"""
    from app.config import settings
    from app.persistent_store import PersistentSessionStore

    persistent_store = None
    if settings.REDIS_ENABLED:
        try:
            persistent_store = PersistentSessionStore(redis_url=settings.REDIS_URL)
            logger.info("Redis persistent storage enabled")
        except Exception as e:
            logger.warning(f"Failed to initialize Redis storage: {e}. Persistent sessions will be disabled.")

    return SessionManager(
        default_ttl_hours=settings.SESSION_TTL_HOURS,
        cleanup_interval_seconds=settings.SESSION_CLEANUP_INTERVAL_SECONDS,
        persistent_store=persistent_store
    )

session_manager = _create_session_manager()
