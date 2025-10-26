"""
Логгер приложения
Реализация паттерна Singleton для логирования
"""

import logging
from typing import Optional

class AppLogger:
    """
    Логгер приложения с использованием паттерна Singleton
    
    Предоставляет централизованное логирование для всего приложения
    с выводом в консоль
    """

    _instance: Optional['AppLogger'] = None
    _logger: Optional[logging.Logger] = None

    def __new__(cls) -> 'AppLogger':
        """
        Создает единственный экземпляр логгера (Singleton)
        
        Returns:
            AppLogger: Единственный экземпляр логгера
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_logger()
        return cls._instance

    def _initialize_logger(self) -> None:
        """
        Инициализирует логгер с настройками конфигурации
        
        Настраивает форматтер для вывода логов и создает консольный обработчик
        """
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
        """
        Логирует информационное сообщение
        
        Args:
            message (str): Текст сообщения
        """
        if self._logger:
            self._logger.info(message)

    def error(self, message: str) -> None:
        """
        Логирует сообщение об ошибке
        
        Args:
            message (str): Текст сообщения об ошибке
        """
        if self._logger:
            self._logger.error(message)

    def debug(self, message: str) -> None:
        """
        Логирует отладочное сообщение
        
        Args:
            message (str): Текст отладочного сообщения
        """
        if self._logger:
            self._logger.debug(message)

    def warning(self, message: str) -> None:
        """
        Логирует предупреждение
        
        Args:
            message (str): Текст предупреждения
        """
        if self._logger:
            self._logger.warning(message)

# Глобальный экземпляр логгера
logger = AppLogger()
