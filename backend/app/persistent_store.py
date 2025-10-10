"""
Persistent Session Storage using Redis

Provides Redis-based persistent storage for sessions that need to survive
server restarts or be shared across multiple server instances.
"""
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class PersistentSessionStore:
    """
    Redis-based persistent storage for sessions.

    Features:
    - Async Redis operations
    - JSON serialization/deserialization
    - Connection pooling
    - Error handling and logging
    """

    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        """
        Initialize persistent session store.

        Args:
            redis_url: Redis connection URL (default: redis://localhost:6379/0)
        """
        self.redis_url = redis_url
        self._redis: Optional[redis.Redis] = None
        logger.info(f"PersistentSessionStore initialized with URL: {redis_url}")

    async def connect(self):
        """Establish Redis connection"""
        try:
            # Support both redis:// and rediss:// (TLS) protocols
            self._redis = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                ssl_cert_reqs=None  # Disable SSL certificate verification for Upstash
            )
            # Test connection
            await self._redis.ping()
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self):
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()
            logger.info("Disconnected from Redis")

    def _get_key(self, session_id: str) -> str:
        """Generate Redis key for session"""
        return f"persistent_session:{session_id}"

    async def save_session(self, session_id: str, session_data: Dict[str, Any]) -> bool:
        """
        Save a persistent session to Redis.

        Args:
            session_id: Unique session identifier
            session_data: Session data dictionary (must be JSON serializable)

        Returns:
            True if saved successfully, False otherwise
        """
        if not self._redis:
            logger.error("Redis not connected")
            return False

        try:
            key = self._get_key(session_id)
            data_json = json.dumps(session_data)
            await self._redis.set(key, data_json)
            logger.info(f"Saved persistent session: {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save session {session_id}: {e}")
            return False

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a persistent session from Redis.

        Args:
            session_id: Unique session identifier

        Returns:
            Session data dictionary if found, None otherwise
        """
        if not self._redis:
            logger.error("Redis not connected")
            return None

        try:
            key = self._get_key(session_id)
            data_json = await self._redis.get(key)

            if data_json is None:
                logger.debug(f"Persistent session not found: {session_id}")
                return None

            session_data = json.loads(data_json)
            logger.debug(f"Retrieved persistent session: {session_id}")
            return session_data
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None

    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a persistent session from Redis.

        Args:
            session_id: Unique session identifier

        Returns:
            True if deleted, False if not found or error
        """
        if not self._redis:
            logger.error("Redis not connected")
            return False

        try:
            key = self._get_key(session_id)
            deleted = await self._redis.delete(key)

            if deleted:
                logger.info(f"Deleted persistent session: {session_id}")
                return True
            else:
                logger.warning(f"Persistent session not found for deletion: {session_id}")
                return False
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False

    async def exists(self, session_id: str) -> bool:
        """
        Check if a persistent session exists.

        Args:
            session_id: Unique session identifier

        Returns:
            True if exists, False otherwise
        """
        if not self._redis:
            return False

        try:
            key = self._get_key(session_id)
            return await self._redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Failed to check session existence {session_id}: {e}")
            return False

    async def get_all_session_ids(self) -> List[str]:
        """
        Get all persistent session IDs.

        Returns:
            List of session IDs
        """
        if not self._redis:
            return []

        try:
            pattern = self._get_key("*")
            keys = await self._redis.keys(pattern)
            # Extract session IDs from keys
            session_ids = [key.replace("persistent_session:", "") for key in keys]
            return session_ids
        except Exception as e:
            logger.error(f"Failed to get all session IDs: {e}")
            return []

    async def count_sessions(self) -> int:
        """
        Count total number of persistent sessions.

        Returns:
            Number of persistent sessions
        """
        if not self._redis:
            return 0

        try:
            pattern = self._get_key("*")
            keys = await self._redis.keys(pattern)
            return len(keys)
        except Exception as e:
            logger.error(f"Failed to count sessions: {e}")
            return 0

    async def clear_all(self) -> int:
        """
        Clear all persistent sessions.

        Returns:
            Number of sessions deleted
        """
        if not self._redis:
            return 0

        try:
            pattern = self._get_key("*")
            keys = await self._redis.keys(pattern)

            if not keys:
                return 0

            deleted = await self._redis.delete(*keys)
            logger.info(f"Cleared {deleted} persistent sessions")
            return deleted
        except Exception as e:
            logger.error(f"Failed to clear all sessions: {e}")
            return 0
