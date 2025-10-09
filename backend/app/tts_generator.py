"""
Core TTS generation logic using edge-tts
"""
import edge_tts
from typing import AsyncGenerator
from app.models import TTSRequest


async def generate_speech_stream(request: TTSRequest) -> AsyncGenerator[bytes, None]:
    """
    Generate speech audio stream from text using edge-tts.

    This function uses an async generator to stream audio chunks,
    enabling efficient memory usage for large audio files.

    Args:
        request: TTSRequest object containing text and voice parameters

    Yields:
        bytes: Audio data chunks in MP3 format

    Raises:
        Exception: If TTS generation fails
    """
    # Create communicate instance with the provided parameters
    communicate = edge_tts.Communicate(
        text=request.text,
        voice=request.voice,
        rate=request.rate,
        volume=request.volume,
        pitch=request.pitch
    )

    # Stream audio chunks
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]
