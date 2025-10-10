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

    def is_expired(self) -> bool:
        """Check if session has expired"""
        return datetime.utcnow() > self.expires_at


class SessionManager:
    """
    Manages user sessions with automatic cleanup of expired sessions.

    Features:
    - UUID-based session IDs
    - Automatic expiration and cleanup
    - Thread-safe operations
    - In-memory storage (can be extended to Redis/database)
    """

    def __init__(self, default_ttl_hours: int = 1, cleanup_interval_seconds: int = 300):
        """
        Initialize session manager.

        Args:
            default_ttl_hours: Default time-to-live for sessions in hours
            cleanup_interval_seconds: Interval for automatic cleanup task in seconds
        """
        self._sessions: Dict[str, SessionData] = {}
        self._lock = asyncio.Lock()
        self._default_ttl = timedelta(hours=default_ttl_hours)
        self._cleanup_interval = cleanup_interval_seconds
        self._cleanup_task = None

        logger.info(f"SessionManager initialized with TTL={default_ttl_hours}h, cleanup={cleanup_interval_seconds}s")

    async def create_session(
        self,
        text: str,
        voice: str,
        ttl_hours: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SessionData:
        """
        Create a new session.

        Args:
            text: User input text
            voice: Selected voice
            ttl_hours: Optional custom TTL in hours
            metadata: Optional metadata dictionary

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
            created_at=now,
            expires_at=expires_at,
            metadata=metadata or {}
        )

        async with self._lock:
            self._sessions[session_id] = session

        logger.info(f"Session created: {session_id}, expires at {expires_at.isoformat()}")
        return session

    async def get_session(self, session_id: str) -> Optional[SessionData]:
        """
        Retrieve a session by ID.

        Args:
            session_id: Session identifier

        Returns:
            SessionData if found and not expired, None otherwise
        """
        async with self._lock:
            session = self._sessions.get(session_id)

            if session is None:
                logger.warning(f"Session not found: {session_id}")
                return None

            if session.is_expired():
                logger.info(f"Session expired: {session_id}")
                del self._sessions[session_id]
                return None

            return session

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
        async with self._lock:
            session = self._sessions.get(session_id)

            if session is None or session.is_expired():
                logger.warning(f"Cannot update session: {session_id}")
                return False

            if sentences is not None:
                session.sentences = sentences

            if metadata:
                session.metadata.update(metadata)

            logger.info(f"Session updated: {session_id}")
            return True

    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.

        Args:
            session_id: Session identifier

        Returns:
            True if deleted, False if not found
        """
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.info(f"Session deleted: {session_id}")
                return True
            return False

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
            total = len(self._sessions)
            expired = sum(1 for s in self._sessions.values() if s.is_expired())
            active = total - expired

            return {
                "total_sessions": total,
                "active_sessions": active,
                "expired_sessions": expired,
                "default_ttl_hours": self._default_ttl.total_seconds() / 3600
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
session_manager = SessionManager(
    default_ttl_hours=1,  # Sessions expire after 1 hour
    cleanup_interval_seconds=300  # Cleanup every 5 minutes
)
