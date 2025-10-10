"""
FastAPI TTS Service Application

A production-grade text-to-speech API service using edge-tts.
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
import edge_tts
import jieba

from app.models import TTSRequest, SegmentRequest, CachePreloadRequest, SessionCreateRequest, SessionResponse
from app.tts_generator import generate_speech_stream, pregenerate_and_cache
from app.utils import get_available_voices, validate_voice
from app.cache import tts_cache
from app.session_manager import session_manager


# Create FastAPI application instance
app = FastAPI(
    title="TTS Service API",
    description="High-performance text-to-speech service powered by edge-tts with session management",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


@app.on_event("startup")
async def startup_event():
    """
    Application startup: initialize Redis connection and session cleanup task
    """
    # Connect to Redis if persistent store is enabled
    if session_manager._persistent_store:
        try:
            await session_manager._persistent_store.connect()
        except Exception as e:
            import logging
            logging.error(f"Failed to connect to Redis: {e}")

    # Start session cleanup task
    await session_manager.start_cleanup_task()


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown: stop session cleanup task and disconnect Redis
    """
    # Stop session cleanup task
    await session_manager.stop_cleanup_task()

    # Disconnect from Redis if persistent store is enabled
    if session_manager._persistent_store:
        await session_manager._persistent_store.disconnect()


@app.get("/")
async def root():
    """
    Root endpoint - API health check
    """
    return {
        "service": "TTS Service API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/api/v1/voices", response_model=List[Dict[str, Any]])
async def list_voices():
    """
    Get list of available voices from edge-tts.

    Returns a cached list of all available voices with their properties
    including Name, ShortName, Gender, and Locale.

    The result is cached for 24 hours to improve performance.

    Returns:
        List of voice dictionaries

    Example:
        ```
        [
            {
                "Name": "Microsoft Xiaoxiao Online (Natural) - Chinese (Mandarin, Simplified)",
                "ShortName": "zh-CN-XiaoxiaoNeural",
                "Gender": "Female",
                "Locale": "zh-CN"
            },
            ...
        ]
        ```
    """
    try:
        voices = await get_available_voices()
        return voices
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch voices: {str(e)}"
        )


@app.get("/api/v1/list-voices", response_model=List[Dict[str, Any]])
async def list_voices_direct():
    """
    Get list of available voices directly from edge-tts.list_voices().

    This endpoint uses edge-tts.list_voices() directly without caching,
    providing the most up-to-date voice list from Microsoft Edge TTS service.

    Returns:
        List of voice dictionaries with complete voice information

    Example:
        ```
        [
            {
                "Name": "Microsoft Xiaoxiao Online (Natural) - Chinese (Mandarin, Simplified)",
                "ShortName": "zh-CN-XiaoxiaoNeural",
                "Gender": "Female",
                "Locale": "zh-CN",
                "SuggestedCodec": "audio-24khz-48kbitrate-mono-mp3",
                "FriendlyName": "Microsoft Xiaoxiao Online (Natural) - Chinese (Mandarin, Simplified)",
                "Status": "GA"
            },
            ...
        ]
        ```
    """
    try:
        voices = await edge_tts.list_voices()
        return voices
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch voices from edge-tts: {str(e)}"
        )


@app.post("/api/v1/generate")
async def generate_speech(request: TTSRequest, use_cache: bool = True):
    """
    Generate speech audio from text with caching support.

    Accepts a text string and voice parameters, then streams the generated
    audio back as MP3 format using edge-tts. The service automatically caches
    generated audio to improve performance for repeated requests.

    Args:
        request: TTSRequest containing:
            - text: The text to convert to speech (required)
            - voice: Voice ShortName, e.g., "zh-CN-XiaoxiaoNeural" (required)
            - rate: Speech rate adjustment, e.g., "+20%" (optional, default: "+0%")
            - volume: Volume adjustment, e.g., "+20%" (optional, default: "+0%")
            - pitch: Pitch adjustment, e.g., "+5Hz" (optional, default: "+0Hz")
        use_cache: Whether to use caching (optional, default: True)

    Returns:
        StreamingResponse with audio/mpeg content

    Raises:
        HTTPException 400: If the voice name is invalid
        HTTPException 500: If TTS generation fails

    Example:
        ```bash
        # Generate with caching (default)
        curl -X POST "http://127.0.0.1:8000/api/v1/generate" \\
             -H "Content-Type: application/json" \\
             -d '{"text": "你好,世界!", "voice": "zh-CN-XiaoxiaoNeural"}' \\
             --output output.mp3

        # Generate without caching
        curl -X POST "http://127.0.0.1:8000/api/v1/generate?use_cache=false" \\
             -H "Content-Type: application/json" \\
             -d '{"text": "你好,世界!", "voice": "zh-CN-XiaoxiaoNeural"}' \\
             --output output.mp3
        ```
    """
    # Validate voice name
    is_valid = await validate_voice(request.voice)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid voice name: {request.voice}. Use /api/v1/voices to get available voices."
        )

    try:
        # Generate and stream audio with caching support
        cache_status = "enabled" if use_cache else "disabled"
        return StreamingResponse(
            generate_speech_stream(request, use_cache),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3",
                "X-Cache-Status": cache_status
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate speech: {str(e)}"
        )


@app.post("/api/v1/segment")
async def segment_text(request: SegmentRequest):
    """
    Segment Chinese text into words using jieba.

    Accepts Chinese text and returns a list of segmented words.
    Supports three segmentation modes: 'default', 'search', and 'full'.

    Args:
        request: SegmentRequest containing:
            - text: The Chinese text to segment (required)
            - mode: Segmentation mode (optional, default: "default")
                - "default": Precise mode, suitable for most cases
                - "search": Search engine mode, good for search indexing
                - "full": Full mode, includes all possible word combinations

    Returns:
        JSON response with segmented words

    Example:
        ```bash
        curl -X POST "http://127.0.0.1:8000/api/v1/segment" \\
             -H "Content-Type: application/json" \\
             -d '{"text": "我来到北京清华大学", "mode": "default"}'
        ```

        Response:
        ```json
        {
            "text": "我来到北京清华大学",
            "mode": "default",
            "words": ["我", "来到", "北京", "清华大学"],
            "count": 4
        }
        ```
    """
    try:
        # Validate mode
        valid_modes = ["default", "search", "full"]
        if request.mode not in valid_modes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mode: {request.mode}. Must be one of {valid_modes}"
            )

        # Perform segmentation based on mode
        if request.mode == "default":
            words = list(jieba.cut(request.text))
        elif request.mode == "search":
            words = list(jieba.cut_for_search(request.text))
        else:  # full mode
            words = list(jieba.cut(request.text, cut_all=True))

        return {
            "text": request.text,
            "mode": request.mode,
            "words": words,
            "count": len(words)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to segment text: {str(e)}"
        )


# Cache Management Endpoints

@app.get("/api/v1/cache/stats")
async def get_cache_stats():
    """
    Get cache statistics and performance metrics.

    Returns detailed information about cache usage including hit rate,
    total size, number of files, and performance statistics.

    Returns:
        JSON response with cache statistics

    Example:
        ```bash
        curl "http://127.0.0.1:8000/api/v1/cache/stats"
        ```

        Response:
        ```json
        {
            "hits": 150,
            "misses": 50,
            "total_requests": 200,
            "hit_rate": 0.75,
            "cache_size_bytes": 52428800,
            "cache_size_mb": 50.0,
            "max_cache_size_mb": 500.0,
            "files_count": 25
        }
        ```
    """
    try:
        stats = tts_cache.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache stats: {str(e)}"
        )


@app.get("/api/v1/cache/info")
async def get_cache_info():
    """
    Get detailed information about all cached items.

    Returns a list of all cached items with their metadata including
    creation time, access count, expiration time, and request parameters.

    Returns:
        JSON response with list of cache items

    Example:
        ```bash
        curl "http://127.0.0.1:8000/api/v1/cache/info"
        ```
    """
    try:
        cache_info = await tts_cache.get_cache_info()
        return {
            "cache_items": cache_info,
            "total_items": len(cache_info)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache info: {str(e)}"
        )


@app.post("/api/v1/cache/preload")
async def preload_cache(request: CachePreloadRequest):
    """
    Pre-generate and cache audio for multiple TTS requests.

    This endpoint allows you to pre-warm the cache with commonly used
    text and voice combinations to improve response times for future requests.

    Args:
        request: CachePreloadRequest containing:
            - requests: List of TTSRequest objects to preload
            - ttl_hours: Optional custom time-to-live in hours

    Returns:
        JSON response with preload results

    Example:
        ```bash
        curl -X POST "http://127.0.0.1:8000/api/v1/cache/preload" \\
             -H "Content-Type: application/json" \\
             -d '{
                 "requests": [
                     {"text": "你好,世界!", "voice": "zh-CN-XiaoxiaoNeural"},
                     {"text": "欢迎使用TTS服务", "voice": "zh-HK-HiuGaaiNeural"}
                 ],
                 "ttl_hours": 48
             }'
        ```
    """
    try:
        results = []
        successful = 0
        failed = 0

        for tts_request in request.requests:
            # Validate voice name
            is_valid = await validate_voice(tts_request.voice)
            if not is_valid:
                results.append({
                    "text": tts_request.text[:50] + "..." if len(tts_request.text) > 50 else tts_request.text,
                    "voice": tts_request.voice,
                    "status": "failed",
                    "error": f"Invalid voice name: {tts_request.voice}"
                })
                failed += 1
                continue

            # Preload audio
            success = await pregenerate_and_cache(tts_request, request.ttl_hours)
            if success:
                results.append({
                    "text": tts_request.text[:50] + "..." if len(tts_request.text) > 50 else tts_request.text,
                    "voice": tts_request.voice,
                    "status": "success"
                })
                successful += 1
            else:
                results.append({
                    "text": tts_request.text[:50] + "..." if len(tts_request.text) > 50 else tts_request.text,
                    "voice": tts_request.voice,
                    "status": "failed",
                    "error": "Failed to generate or cache audio"
                })
                failed += 1

        return {
            "total_requests": len(request.requests),
            "successful": successful,
            "failed": failed,
            "results": results
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preload cache: {str(e)}"
        )


@app.delete("/api/v1/cache/clear")
async def clear_cache():
    """
    Clear all cached audio files.

    Removes all cached audio files and resets cache statistics.
    Use with caution as this will force regeneration of all audio.

    Returns:
        JSON response with number of items removed

    Example:
        ```bash
        curl -X DELETE "http://127.0.0.1:8000/api/v1/cache/clear"
        ```

        Response:
        ```json
        {
            "message": "Cache cleared successfully",
            "items_removed": 25
        }
        ```
    """
    try:
        items_removed = await tts_cache.clear_all()
        return {
            "message": "Cache cleared successfully",
            "items_removed": items_removed
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}"
        )


@app.delete("/api/v1/cache/clear-expired")
async def clear_expired_cache():
    """
    Remove expired cached audio files.

    Removes only the cached audio files that have exceeded their time-to-live (TTL).
    This is automatically done during normal cache operations, but can be manually
    triggered for maintenance purposes.

    Returns:
        JSON response with number of expired items removed

    Example:
        ```bash
        curl -X DELETE "http://127.0.0.1:8000/api/v1/cache/clear-expired"
        ```

        Response:
        ```json
        {
            "message": "Expired cache items cleared",
            "expired_items_removed": 5
        }
        ```
    """
    try:
        expired_removed = await tts_cache.clear_expired()
        return {
            "message": "Expired cache items cleared",
            "expired_items_removed": expired_removed
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear expired cache: {str(e)}"
        )


# Session Management Endpoints

@app.post("/api/v1/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: SessionCreateRequest):
    """
    Create a new user session.

    Creates a session to store user input text and voice selection, avoiding
    the need to pass large amounts of data through URL parameters.

    Args:
        request: SessionCreateRequest containing text, voice, and optional TTL

    Returns:
        SessionResponse with session_id and session data

    Example:
        ```bash
        curl -X POST "http://127.0.0.1:8000/api/v1/sessions" \\
             -H "Content-Type: application/json" \\
             -d '{
                 "text": "你好，今天天气很好。",
                 "voice": "zh-HK-HiuMaanNeural",
                 "ttl_hours": 2
             }'
        ```

        Response:
        ```json
        {
            "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "text": "你好，今天天气很好。",
            "voice": "zh-HK-HiuMaanNeural",
            "created_at": "2025-10-10T09:30:00.000Z",
            "expires_at": "2025-10-10T11:30:00.000Z",
            "sentences": null,
            "metadata": {}
        }
        ```
    """
    try:
        # Validate voice
        is_valid = await validate_voice(request.voice)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid voice name: {request.voice}"
            )

        # Create session
        session = await session_manager.create_session(
            text=request.text,
            voice=request.voice,
            ttl_hours=request.ttl_hours,
            metadata=request.metadata,
            persistent=request.persistent
        )

        return SessionResponse(**session.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )


@app.get("/api/v1/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """
    Retrieve session data by session ID.

    Args:
        session_id: Unique session identifier

    Returns:
        SessionResponse with session data

    Raises:
        HTTPException 404: If session not found or expired

    Example:
        ```bash
        curl "http://127.0.0.1:8000/api/v1/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        ```
    """
    try:
        session = await session_manager.get_session(session_id)

        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found or expired: {session_id}"
            )

        return SessionResponse(**session.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session: {str(e)}"
        )


@app.post("/api/v1/sessions/{session_id}/segment")
async def segment_session(session_id: str):
    """
    Segment text for a session and store results.

    Performs text segmentation on the session's text and stores the
    results in the session for future retrieval.

    Args:
        session_id: Unique session identifier

    Returns:
        JSON response with segmentation results

    Raises:
        HTTPException 404: If session not found or expired

    Example:
        ```bash
        curl -X POST "http://127.0.0.1:8000/api/v1/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/segment"
        ```

        Response:
        ```json
        {
            "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "sentences": [
                {
                    "sentence": "你好，今天天气很好。",
                    "words": ["你好", "今天", "天气", "很", "好"]
                }
            ],
            "sentence_count": 1
        }
        ```
    """
    try:
        # Get session
        session = await session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found or expired: {session_id}"
            )

        # Import segmentation function
        from app.api import segment_text_by_sentences

        # Perform segmentation
        sentences = await segment_text_by_sentences(session.text)

        # Update session with results
        await session_manager.update_session(
            session_id=session_id,
            sentences=sentences
        )

        return {
            "session_id": session_id,
            "sentences": sentences,
            "sentence_count": len(sentences)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to segment session text: {str(e)}"
        )


@app.delete("/api/v1/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a session.

    Args:
        session_id: Unique session identifier

    Returns:
        JSON response confirming deletion

    Example:
        ```bash
        curl -X DELETE "http://127.0.0.1:8000/api/v1/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        ```
    """
    try:
        deleted = await session_manager.delete_session(session_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {session_id}"
            )

        return {
            "message": "Session deleted successfully",
            "session_id": session_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )


@app.get("/api/v1/sessions/stats")
async def get_session_stats():
    """
    Get session manager statistics.

    Returns:
        JSON response with session statistics

    Example:
        ```bash
        curl "http://127.0.0.1:8000/api/v1/sessions/stats"
        ```

        Response:
        ```json
        {
            "total_sessions": 10,
            "active_sessions": 8,
            "expired_sessions": 2,
            "default_ttl_hours": 1.0
        }
        ```
    """
    try:
        stats = await session_manager.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session stats: {str(e)}"
        )

