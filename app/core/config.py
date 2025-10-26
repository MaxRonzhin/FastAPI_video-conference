"""
Конфигурация приложения
Реализация паттерна Singleton для настроек
"""

from typing import List
import os

class Settings:
    """
    Настройки приложения с использованием паттерна Singleton
    
    Содержит константы для работы видеоконференции:
    - Название проекта, версия, описание
    - CORS настройки
    - STUN серверы для WebRTC
    - Лимиты размера комнат и сообщений
    """

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
    MAX_ROOM_SIZE: int = 50  # Максимальное количество участников в комнате
    MAX_MESSAGE_SIZE: int = 1024 * 1024  # 1MB - максимальный размер сообщения

    class Config:
        """
        Класс конфигурации для загрузки переменных окружения
        """
        env_file = ".env"

# Singleton instance
settings = Settings()
