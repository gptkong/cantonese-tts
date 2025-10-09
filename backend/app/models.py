"""
Pydantic models for request validation
"""
from pydantic import BaseModel, Field
from typing import Optional


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
