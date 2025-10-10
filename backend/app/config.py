"""
Application Configuration

Loads configuration from environment variables with sensible defaults.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""

    # Redis Configuration
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "false").lower() == "true"
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Session Configuration
    SESSION_TTL_HOURS: int = int(os.getenv("SESSION_TTL_HOURS", "1"))
    SESSION_CLEANUP_INTERVAL_SECONDS: int = int(os.getenv("SESSION_CLEANUP_INTERVAL_SECONDS", "300"))


# Global settings instance
settings = Settings()
