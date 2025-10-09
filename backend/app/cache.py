"""
TTS Audio Caching System

This module provides a comprehensive caching solution for TTS-generated audio files.
It includes both file system caching for audio data and in-memory caching for metadata.
"""
import os
import hashlib
import json
import aiofiles
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path
import logging

from app.models import TTSRequest

logger = logging.getLogger(__name__)


class TTSCache:
    """
    TTS Audio Cache Manager
    
    Provides file-based caching for generated audio with metadata tracking.
    Uses SHA-256 hashing of request parameters to generate unique cache keys.
    """
    
    def __init__(self, cache_dir: str = "cache", max_cache_size_mb: int = 500, 
                 default_ttl_hours: int = 24 * 7):  # 7 days default
        """
        Initialize the TTS cache system.
        
        Args:
            cache_dir: Directory to store cached audio files
            max_cache_size_mb: Maximum cache size in MB
            default_ttl_hours: Default time-to-live for cached items in hours
        """
        self.cache_dir = Path(cache_dir)
        self.max_cache_size_bytes = max_cache_size_mb * 1024 * 1024
        self.default_ttl = timedelta(hours=default_ttl_hours)
        
        # In-memory metadata cache
        self._metadata_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_stats = {
            "hits": 0,
            "misses": 0,
            "total_requests": 0,
            "cache_size_bytes": 0,
            "files_count": 0
        }
        
        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Flag to track if metadata is loaded
        self._metadata_loaded = False
    
    def _generate_cache_key(self, request: TTSRequest) -> str:
        """
        Generate a unique cache key based on TTS request parameters.
        
        Args:
            request: TTSRequest object
            
        Returns:
            SHA-256 hash string as cache key
        """
        # Create a normalized string representation of the request
        cache_data = {
            "text": request.text.strip(),
            "voice": request.voice,
            "rate": request.rate,
            "volume": request.volume,
            "pitch": request.pitch
        }
        
        # Sort keys for consistent hashing
        cache_string = json.dumps(cache_data, sort_keys=True, ensure_ascii=False)
        
        # Generate SHA-256 hash
        return hashlib.sha256(cache_string.encode('utf-8')).hexdigest()
    
    def _get_cache_file_path(self, cache_key: str) -> Path:
        """Get the file path for a cache key."""
        return self.cache_dir / f"{cache_key}.mp3"
    
    def _get_metadata_file_path(self) -> Path:
        """Get the metadata file path."""
        return self.cache_dir / "metadata.json"
    
    async def _load_metadata(self):
        """Load metadata from disk on startup."""
        metadata_file = self._get_metadata_file_path()
        if metadata_file.exists():
            try:
                async with aiofiles.open(metadata_file, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    data = json.loads(content)
                    self._metadata_cache = data.get("cache", {})
                    self._cache_stats.update(data.get("stats", {}))
                    logger.info(f"Loaded {len(self._metadata_cache)} cached items from metadata")
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")
                self._metadata_cache = {}
        
        # Update cache statistics
        await self._update_cache_stats()
    
    async def _save_metadata(self):
        """Save metadata to disk."""
        metadata_file = self._get_metadata_file_path()
        try:
            data = {
                "cache": self._metadata_cache,
                "stats": self._cache_stats,
                "last_updated": datetime.now().isoformat()
            }
            async with aiofiles.open(metadata_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(data, indent=2, ensure_ascii=False))
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
    
    async def _ensure_metadata_loaded(self):
        """Ensure metadata is loaded before any cache operations."""
        if not self._metadata_loaded:
            await self._load_metadata()
            self._metadata_loaded = True

    async def _update_cache_stats(self):
        """Update cache statistics by scanning the cache directory."""
        total_size = 0
        files_count = 0
        
        try:
            for file_path in self.cache_dir.glob("*.mp3"):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
                    files_count += 1
            
            self._cache_stats["cache_size_bytes"] = total_size
            self._cache_stats["files_count"] = files_count
        except Exception as e:
            logger.error(f"Failed to update cache stats: {e}")
    
    async def get(self, request: TTSRequest) -> Optional[bytes]:
        """
        Retrieve cached audio data for a TTS request.
        
        Args:
            request: TTSRequest object
            
        Returns:
            Audio data as bytes if found and valid, None otherwise
        """
        await self._ensure_metadata_loaded()
        cache_key = self._generate_cache_key(request)
        self._cache_stats["total_requests"] += 1
        
        # Check if cache key exists in metadata
        if cache_key not in self._metadata_cache:
            self._cache_stats["misses"] += 1
            return None
        
        metadata = self._metadata_cache[cache_key]
        
        # Check if cache item has expired
        created_at = datetime.fromisoformat(metadata["created_at"])
        ttl = timedelta(hours=metadata.get("ttl_hours", self.default_ttl.total_seconds() / 3600))
        
        if datetime.now() > created_at + ttl:
            # Cache expired, remove it
            await self._remove_cache_item(cache_key)
            self._cache_stats["misses"] += 1
            return None
        
        # Try to read the cached file
        cache_file = self._get_cache_file_path(cache_key)
        if not cache_file.exists():
            # File missing, remove from metadata
            await self._remove_cache_item(cache_key)
            self._cache_stats["misses"] += 1
            return None
        
        try:
            async with aiofiles.open(cache_file, 'rb') as f:
                audio_data = await f.read()
            
            # Update access time
            metadata["last_accessed"] = datetime.now().isoformat()
            metadata["access_count"] = metadata.get("access_count", 0) + 1
            
            self._cache_stats["hits"] += 1
            logger.info(f"Cache hit for key: {cache_key[:16]}...")
            return audio_data
            
        except Exception as e:
            logger.error(f"Failed to read cached file {cache_file}: {e}")
            await self._remove_cache_item(cache_key)
            self._cache_stats["misses"] += 1
            return None
    
    async def put(self, request: TTSRequest, audio_data: bytes, ttl_hours: Optional[int] = None) -> bool:
        """
        Store audio data in cache for a TTS request.
        
        Args:
            request: TTSRequest object
            audio_data: Audio data as bytes
            ttl_hours: Time-to-live in hours (optional)
            
        Returns:
            True if successfully cached, False otherwise
        """
        await self._ensure_metadata_loaded()
        cache_key = self._generate_cache_key(request)
        cache_file = self._get_cache_file_path(cache_key)
        
        try:
            # Check if we need to clean up cache first
            await self._ensure_cache_size_limit(len(audio_data))
            
            # Write audio data to file
            async with aiofiles.open(cache_file, 'wb') as f:
                await f.write(audio_data)
            
            # Update metadata
            now = datetime.now()
            self._metadata_cache[cache_key] = {
                "created_at": now.isoformat(),
                "last_accessed": now.isoformat(),
                "access_count": 0,
                "file_size": len(audio_data),
                "ttl_hours": ttl_hours or (self.default_ttl.total_seconds() / 3600),
                "request_params": {
                    "text_length": len(request.text),
                    "voice": request.voice,
                    "rate": request.rate,
                    "volume": request.volume,
                    "pitch": request.pitch
                }
            }
            
            # Update statistics
            self._cache_stats["cache_size_bytes"] += len(audio_data)
            self._cache_stats["files_count"] += 1
            
            # Save metadata periodically
            await self._save_metadata()
            
            logger.info(f"Cached audio for key: {cache_key[:16]}... (size: {len(audio_data)} bytes)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache audio data: {e}")
            # Clean up partial file if it exists
            if cache_file.exists():
                try:
                    cache_file.unlink()
                except:
                    pass
            return False
    
    async def _remove_cache_item(self, cache_key: str):
        """Remove a cache item and its metadata."""
        cache_file = self._get_cache_file_path(cache_key)
        
        # Remove metadata
        if cache_key in self._metadata_cache:
            file_size = self._metadata_cache[cache_key].get("file_size", 0)
            del self._metadata_cache[cache_key]
            self._cache_stats["cache_size_bytes"] = max(0, self._cache_stats["cache_size_bytes"] - file_size)
            self._cache_stats["files_count"] = max(0, self._cache_stats["files_count"] - 1)
        
        # Remove file
        if cache_file.exists():
            try:
                cache_file.unlink()
            except Exception as e:
                logger.error(f"Failed to remove cache file {cache_file}: {e}")
    
    async def _ensure_cache_size_limit(self, new_file_size: int):
        """Ensure cache doesn't exceed size limit by removing old items."""
        if self._cache_stats["cache_size_bytes"] + new_file_size <= self.max_cache_size_bytes:
            return
        
        # Sort cache items by last accessed time (oldest first)
        cache_items = [
            (key, metadata["last_accessed"]) 
            for key, metadata in self._metadata_cache.items()
        ]
        cache_items.sort(key=lambda x: x[1])
        
        # Remove oldest items until we have enough space
        bytes_to_free = (self._cache_stats["cache_size_bytes"] + new_file_size) - self.max_cache_size_bytes
        bytes_freed = 0
        
        for cache_key, _ in cache_items:
            if bytes_freed >= bytes_to_free:
                break
            
            file_size = self._metadata_cache[cache_key].get("file_size", 0)
            await self._remove_cache_item(cache_key)
            bytes_freed += file_size
            logger.info(f"Removed old cache item: {cache_key[:16]}... (freed {file_size} bytes)")
    
    async def clear_expired(self) -> int:
        """
        Remove all expired cache items.
        
        Returns:
            Number of items removed
        """
        await self._ensure_metadata_loaded()
        expired_keys = []
        now = datetime.now()
        
        for cache_key, metadata in self._metadata_cache.items():
            created_at = datetime.fromisoformat(metadata["created_at"])
            ttl = timedelta(hours=metadata.get("ttl_hours", self.default_ttl.total_seconds() / 3600))
            
            if now > created_at + ttl:
                expired_keys.append(cache_key)
        
        for cache_key in expired_keys:
            await self._remove_cache_item(cache_key)
        
        if expired_keys:
            await self._save_metadata()
            logger.info(f"Removed {len(expired_keys)} expired cache items")
        
        return len(expired_keys)
    
    async def clear_all(self) -> int:
        """
        Clear all cached items.
        
        Returns:
            Number of items removed
        """
        await self._ensure_metadata_loaded()
        removed_count = len(self._metadata_cache)
        
        # Remove all files
        for cache_key in list(self._metadata_cache.keys()):
            await self._remove_cache_item(cache_key)
        
        # Reset statistics
        self._cache_stats.update({
            "cache_size_bytes": 0,
            "files_count": 0
        })
        
        await self._save_metadata()
        logger.info(f"Cleared all cache items ({removed_count} items)")
        
        return removed_count
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        hit_rate = 0.0
        if self._cache_stats["total_requests"] > 0:
            hit_rate = self._cache_stats["hits"] / self._cache_stats["total_requests"]
        
        return {
            **self._cache_stats,
            "hit_rate": hit_rate,
            "cache_size_mb": round(self._cache_stats["cache_size_bytes"] / (1024 * 1024), 2),
            "max_cache_size_mb": round(self.max_cache_size_bytes / (1024 * 1024), 2)
        }
    
    async def get_cache_info(self) -> List[Dict[str, Any]]:
        """
        Get detailed information about cached items.
        
        Returns:
            List of cache item information
        """
        await self._ensure_metadata_loaded()
        items = []
        
        for cache_key, metadata in self._metadata_cache.items():
            created_at = datetime.fromisoformat(metadata["created_at"])
            last_accessed = datetime.fromisoformat(metadata["last_accessed"])
            ttl_hours = metadata.get("ttl_hours", self.default_ttl.total_seconds() / 3600)
            expires_at = created_at + timedelta(hours=ttl_hours)
            
            items.append({
                "cache_key": cache_key,
                "created_at": metadata["created_at"],
                "last_accessed": metadata["last_accessed"],
                "expires_at": expires_at.isoformat(),
                "access_count": metadata.get("access_count", 0),
                "file_size": metadata.get("file_size", 0),
                "ttl_hours": ttl_hours,
                "is_expired": datetime.now() > expires_at,
                "request_params": metadata.get("request_params", {})
            })
        
        # Sort by last accessed time (most recent first)
        items.sort(key=lambda x: x["last_accessed"], reverse=True)
        
        return items


# Global cache instance
tts_cache = TTSCache()
