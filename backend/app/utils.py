"""
Utility functions for TTS service
"""
import edge_tts
from typing import List, Dict, Any
from datetime import datetime, timedelta
import asyncio


# Simple in-memory cache for voices list
_voices_cache: Dict[str, Any] = {
    "data": None,
    "expires_at": None
}

# Cache duration: 24 hours
CACHE_DURATION = timedelta(hours=24)


async def get_available_voices(use_cache: bool = True) -> List[Dict[str, Any]]:
    """
    Retrieve the list of available voices from edge-tts.

    Uses a 24-hour in-memory cache to avoid repeated API calls.

    Args:
        use_cache: Whether to use cached data if available

    Returns:
        List of voice dictionaries with keys: Name, ShortName, Gender, Locale, etc.

    Raises:
        Exception: If fetching voices fails
    """
    global _voices_cache

    # Check if cache is valid
    if use_cache and _voices_cache["data"] is not None:
        if _voices_cache["expires_at"] and datetime.now() < _voices_cache["expires_at"]:
            return _voices_cache["data"]

    # Fetch fresh data
    voices = await edge_tts.list_voices()

    # Update cache
    _voices_cache["data"] = voices
    _voices_cache["expires_at"] = datetime.now() + CACHE_DURATION

    return voices


async def validate_voice(voice_name: str) -> bool:
    """
    Validate if a voice name exists in the available voices list.

    Args:
        voice_name: The voice ShortName to validate

    Returns:
        True if voice exists, False otherwise
    """
    voices = await get_available_voices()
    voice_short_names = [v.get("ShortName") for v in voices]
    return voice_name in voice_short_names


def clear_voices_cache():
    """
    Clear the voices cache. Useful for testing or forced refresh.
    """
    global _voices_cache
    _voices_cache["data"] = None
    _voices_cache["expires_at"] = None
