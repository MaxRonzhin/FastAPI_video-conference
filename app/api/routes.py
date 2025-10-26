"""
API маршруты и эндпоинты
Определяет все HTTP и WebSocket эндпоинты приложения
"""

import json
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.services.websocket_manager import websocket_manager
from app.services.conference_service import conference_service
from app.core.logger import logger

# Создаем роутер
router = APIRouter()

def get_index_html():
    """
    Читает файл index.html из статической директории
    
    Returns:
        str: Содержимое HTML файла или сообщение об ошибке
    """
    try:
        with open("static/index.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Video Conference Server</h1><p>index.html not found</p>"

@router.get("/", response_class=HTMLResponse)
async def root():
    """
    Корневой эндпоинт приложения
    
    Returns:
        str: HTML страница главной страницы приложения
    """
    return get_index_html()

@router.get("/favicon.ico")
async def favicon():
    """
    Эндпоинт для получения favicon
    
    Returns:
        FileResponse: Файл favicon.ico или пустой ответ
    """
    favicon_path = "static/favicon.ico"
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    return HTMLResponse("", status_code=200)

@router.get("/apple-touch-icon.png")
async def apple_touch_icon():
    """
    Эндпоинт для получения Apple touch иконки
    
    Returns:
        FileResponse: Файл иконки или пустой ответ
    """
    icon_path = "static/apple-touch-icon.png"
    if os.path.exists(icon_path):
        return FileResponse(icon_path)
    return HTMLResponse("", status_code=200)

@router.get("/apple-touch-icon-precomposed.png")
async def apple_touch_icon_precomposed():
    """
    Эндпоинт для получения предварительно обработанной Apple touch иконки
    
    Returns:
        FileResponse: Файл иконки или пустой ответ
    """
    icon_path = "static/apple-touch-icon-precomposed.png"
    if os.path.exists(icon_path):
        return FileResponse(icon_path)
    return HTMLResponse("", status_code=200)

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket эндпоинт для реального времени коммуникации
    
    Args:
        websocket (WebSocket): WebSocket соединение
        user_id (str): Уникальный идентификатор пользователя
    """
    await websocket_manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message_data = {}

            try:
                message_data = json.loads(data)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON from {user_id}: {data}")
                continue

            message_type = message_data.get("type")

            if message_type == "create_room":
                response = await conference_service.create_room(
                    user_id, message_data.get("room_id")
                )
                await websocket_manager.send_to_user(user_id, json.dumps(response))

            elif message_type == "join_room":
                response = await conference_service.join_room(
                    user_id, message_data.get("room_id")
                )
                await websocket_manager.send_to_user(user_id, json.dumps(response))

            elif message_type == "leave_room":
                await conference_service.leave_room(
                    user_id, message_data.get("room_id")
                )

            elif message_type in ["offer", "answer", "ice-candidate"]:
                await conference_service.handle_webrtc_message(message_data, user_id)

            elif message_type == "room_message":
                await conference_service.handle_room_message(message_data, user_id)

    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket connection for {user_id}: {e}")
        websocket_manager.disconnect(user_id)

@router.get("/rooms")
async def get_rooms():
    """
    Получает список всех активных комнат
    
    Returns:
        dict: Словарь со списком активных комнат и их участников
    """
    return conference_service.get_rooms_list()

@router.get("/room/{room_id}/participants")
async def get_room_participants(room_id: str):
    """
    Получает список участников в конкретной комнате
    
    Args:
        room_id (str): Идентификатор комнаты
        
    Returns:
        dict: Словарь с ID комнаты и списком участников
    """
    if room_id in websocket_manager.rooms:
        participants = websocket_manager.rooms[room_id].participants.copy()
        return {"room_id": room_id, "participants": participants}
    return {"room_id": room_id, "participants": []}
