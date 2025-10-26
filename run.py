#!/usr/bin/env python3
"""
Приложение видеоконференций
Главная точка входа для запуска сервера
"""

import sys
import os

# Добавляем текущую директорию в путь поиска модулей
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from app.main import app

if __name__ == "__main__":
    """
    Запускает сервер FastAPI с настройками разработки
    
    Использует uvicorn для запуска приложения с автоматической
    перезагрузкой при изменении кода (режим разработки)
    """
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
