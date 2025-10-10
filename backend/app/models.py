"""
Pydantic models for request validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class TTSRequest(BaseModel):
    """
    Request model for text-to-speech generation
    """
    text: str = Field(..., description="The text to convert to speech", min_length=1)
    voice: str = Field(..., description="Voice ShortName (e.g., zh-CN-XiaoxiaoNeural)", min_length=1)
    rate: Optional[str] = Field("+0%", description="Speech rate adjustment (e.g., +20%, -10%)")
    volume: Optional[str] = Field("+0%", description="Volume adjustment (e.g., +20%, -10%)")
    pitch: Optional[str] = Field("+0Hz", description="Pitch adjustment (e.g., +5Hz, -5Hz)")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "你好,世界!",
                "voice": "zh-CN-XiaoxiaoNeural",
                "rate": "+0%",
                "volume": "+0%",
                "pitch": "+0Hz"
            }
        }


class SegmentRequest(BaseModel):
    """
    Request model for Chinese text segmentation
    """
    text: str = Field(..., description="The Chinese text to segment", min_length=1)
    mode: Optional[str] = Field("default", description="Segmentation mode: 'default', 'search', or 'full'")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "我来到北京清华大学",
                "mode": "default"
            }
        }


class CachePreloadRequest(BaseModel):
    """
    Request model for cache preloading
    """
    requests: List[TTSRequest] = Field(..., description="List of TTS requests to preload into cache")
    ttl_hours: Optional[int] = Field(None, description="Custom time-to-live in hours for cached items")

    class Config:
        json_schema_extra = {
            "example": {
                "requests": [
                    {
                        "text": "你好,世界!",
                        "voice": "zh-CN-XiaoxiaoNeural"
                    },
                    {
                        "text": "欢迎使用TTS服务",
                        "voice": "zh-HK-HiuGaaiNeural"
                    }
                ],
                "ttl_hours": 48
            }
        }


class SessionCreateRequest(BaseModel):
    """
    Request model for creating a new session
    """
    text: str = Field(..., description="User input text", min_length=1)
    voice: str = Field(..., description="Selected voice ShortName", min_length=1)
    ttl_hours: Optional[int] = Field(None, description="Custom session time-to-live in hours (default: 1, ignored for persistent sessions)")
    persistent: bool = Field(False, description="Whether to store session in Redis (persistent sessions never expire)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "你好，今天天气很好。\n我们去公园玩吧。",
                "voice": "zh-HK-HiuMaanNeural",
                "ttl_hours": 2,
                "persistent": False
            }
        }


class SessionResponse(BaseModel):
    """
    Response model for session operations
    """
    session_id: str = Field(..., description="Unique session identifier")
    text: str = Field(..., description="Session text")
    voice: str = Field(..., description="Session voice")
    persistent: bool = Field(False, description="Whether this is a persistent session")
    created_at: str = Field(..., description="Session creation timestamp (ISO format)")
    expires_at: str = Field(..., description="Session expiration timestamp (ISO format)")
    sentences: Optional[List[Dict[str, Any]]] = Field(None, description="Segmentation results")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Session metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "text": "你好，今天天气很好。",
                "voice": "zh-HK-HiuMaanNeural",
                "persistent": False,
                "created_at": "2025-10-10T09:30:00.000Z",
                "expires_at": "2025-10-10T10:30:00.000Z",
                "sentences": None,
                "metadata": {}
            }
        }
