"""
Application Logger
Singleton Pattern Implementation
"""

import logging
from typing import Optional

class AppLogger:
    """Application logger using Singleton pattern"""

    _instance: Optional['AppLogger'] = None
    _logger: Optional[logging.Logger] = None

    def __new__(cls) -> 'AppLogger':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_logger()
        return cls._instance

    def _initialize_logger(self) -> None:
        """Initialize logger with proper configuration"""
        self._logger = logging.getLogger("video_conference")
        self._logger.setLevel(logging.INFO)

        # Создаем форматтер
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        self._logger.addHandler(console_handler)

    def info(self, message: str) -> None:
        """Log info message"""
        if self._logger:
            self._logger.info(message)

    def error(self, message: str) -> None:
        """Log error message"""
        if self._logger:
            self._logger.error(message)

    def debug(self, message: str) -> None:
        """Log debug message"""
        if self._logger:
            self._logger.debug(message)

    def warning(self, message: str) -> None:
        """Log warning message"""
        if self._logger:
            self._logger.warning(message)

# Глобальный экземпляр логгера
logger = AppLogger()
