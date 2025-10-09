"""
Core TTS generation logic using edge-tts with caching support
"""
import edge_tts
import logging
from typing import AsyncGenerator, Optional
from app.models import TTSRequest
from app.cache import tts_cache

logger = logging.getLogger(__name__)


async def generate_speech_stream(request: TTSRequest, use_cache: bool = True) -> AsyncGenerator[bytes, None]:
    """
    Generate speech audio stream from text using edge-tts with caching support.

    This function first checks the cache for existing audio. If found, it streams
    the cached audio. If not found, it generates new audio using edge-tts,
    caches it, and then streams it.

    Args:
        request: TTSRequest object containing text and voice parameters
        use_cache: Whether to use caching (default: True)

    Yields:
        bytes: Audio data chunks in MP3 format

    Raises:
        Exception: If TTS generation fails
    """
    # Try to get cached audio first
    if use_cache:
        cached_audio = await tts_cache.get(request)
        if cached_audio:
            logger.info(f"Serving cached audio for text: {request.text[:50]}...")
            # Stream cached audio in chunks
            chunk_size = 8192  # 8KB chunks
            for i in range(0, len(cached_audio), chunk_size):
                yield cached_audio[i:i + chunk_size]
            return

    # Generate new audio if not cached
    logger.info(f"Generating new audio for text: {request.text[:50]}...")
    
    # Create communicate instance with the provided parameters
    communicate = edge_tts.Communicate(
        text=request.text,
        voice=request.voice,
        rate=request.rate,
        volume=request.volume,
        pitch=request.pitch
    )

    # Collect audio data for caching
    audio_chunks = []
    
    # Stream audio chunks
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data = chunk["data"]
            audio_chunks.append(audio_data)
            yield audio_data
    
    # Cache the complete audio data if caching is enabled
    if use_cache and audio_chunks:
        complete_audio = b''.join(audio_chunks)
        success = await tts_cache.put(request, complete_audio)
        if success:
            logger.info(f"Successfully cached audio (size: {len(complete_audio)} bytes)")
        else:
            logger.warning("Failed to cache audio data")


async def generate_speech_bytes(request: TTSRequest, use_cache: bool = True) -> bytes:
    """
    Generate speech audio as complete bytes from text using edge-tts with caching support.

    This is a convenience function that returns the complete audio data as bytes
    instead of streaming it. Useful for scenarios where you need the complete
    audio data at once.

    Args:
        request: TTSRequest object containing text and voice parameters
        use_cache: Whether to use caching (default: True)

    Returns:
        bytes: Complete audio data in MP3 format

    Raises:
        Exception: If TTS generation fails
    """
    # Try to get cached audio first
    if use_cache:
        cached_audio = await tts_cache.get(request)
        if cached_audio:
            logger.info(f"Serving cached audio for text: {request.text[:50]}...")
            return cached_audio

    # Generate new audio if not cached
    logger.info(f"Generating new audio for text: {request.text[:50]}...")
    
    # Create communicate instance with the provided parameters
    communicate = edge_tts.Communicate(
        text=request.text,
        voice=request.voice,
        rate=request.rate,
        volume=request.volume,
        pitch=request.pitch
    )

    # Collect all audio chunks
    audio_chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
    
    # Combine all chunks
    complete_audio = b''.join(audio_chunks)
    
    # Cache the complete audio data if caching is enabled
    if use_cache and complete_audio:
        success = await tts_cache.put(request, complete_audio)
        if success:
            logger.info(f"Successfully cached audio (size: {len(complete_audio)} bytes)")
        else:
            logger.warning("Failed to cache audio data")
    
    return complete_audio


async def pregenerate_and_cache(request: TTSRequest, ttl_hours: Optional[int] = None) -> bool:
    """
    Pre-generate and cache audio for a TTS request.

    This function is useful for pre-warming the cache with commonly used
    text and voice combinations.

    Args:
        request: TTSRequest object containing text and voice parameters
        ttl_hours: Custom time-to-live in hours for this cache entry

    Returns:
        bool: True if successfully generated and cached, False otherwise

    Raises:
        Exception: If TTS generation fails
    """
    try:
        # Check if already cached
        cached_audio = await tts_cache.get(request)
        if cached_audio:
            logger.info(f"Audio already cached for text: {request.text[:50]}...")
            return True

        # Generate new audio
        logger.info(f"Pre-generating audio for text: {request.text[:50]}...")
        
        communicate = edge_tts.Communicate(
            text=request.text,
            voice=request.voice,
            rate=request.rate,
            volume=request.volume,
            pitch=request.pitch
        )

        # Collect all audio chunks
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
        
        # Combine and cache
        complete_audio = b''.join(audio_chunks)
        if complete_audio:
            success = await tts_cache.put(request, complete_audio, ttl_hours)
            if success:
                logger.info(f"Successfully pre-cached audio (size: {len(complete_audio)} bytes)")
                return True
            else:
                logger.error("Failed to cache pre-generated audio")
                return False
        else:
            logger.error("No audio data generated")
            return False
            
    except Exception as e:
        logger.error(f"Failed to pre-generate audio: {e}")
        return False
