"""
Application Configuration
Singleton Pattern Implementation
"""

from typing import List
import os

class Settings:
    """Application settings using Singleton pattern"""

    # Базовые настройки
    PROJECT_NAME: str = "Video Conference Server"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "WebRTC based video conference application"

    # CORS настройки
    ALLOWED_ORIGINS: List[str] = ["*"]

    # WebRTC настройки
    STUN_SERVERS: List[str] = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
    ]

    # Лимиты
    MAX_ROOM_SIZE: int = 50
    MAX_MESSAGE_SIZE: int = 1024 * 1024  # 1MB

    class Config:
        env_file = ".env"

# Singleton instance
settings = Settings()
