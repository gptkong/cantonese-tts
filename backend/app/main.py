"""
FastAPI TTS Service Application

A production-grade text-to-speech API service using edge-tts.
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any
import edge_tts
import jieba

from app.models import TTSRequest, SegmentRequest
from app.tts_generator import generate_speech_stream
from app.utils import get_available_voices, validate_voice


# Create FastAPI application instance
app = FastAPI(
    title="TTS Service API",
    description="High-performance text-to-speech service powered by edge-tts",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


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
async def generate_speech(request: TTSRequest):
    """
    Generate speech audio from text.

    Accepts a text string and voice parameters, then streams the generated
    audio back as MP3 format using edge-tts.

    Args:
        request: TTSRequest containing:
            - text: The text to convert to speech (required)
            - voice: Voice ShortName, e.g., "zh-CN-XiaoxiaoNeural" (required)
            - rate: Speech rate adjustment, e.g., "+20%" (optional, default: "+0%")
            - volume: Volume adjustment, e.g., "+20%" (optional, default: "+0%")
            - pitch: Pitch adjustment, e.g., "+5Hz" (optional, default: "+0Hz")

    Returns:
        StreamingResponse with audio/mpeg content

    Raises:
        HTTPException 400: If the voice name is invalid
        HTTPException 500: If TTS generation fails

    Example:
        ```bash
        curl -X POST "http://127.0.0.1:8000/api/v1/generate" \\
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
        # Generate and stream audio
        return StreamingResponse(
            generate_speech_stream(request),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3"
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

