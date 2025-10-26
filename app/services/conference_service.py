"""
Сервис видеоконференций
Слой бизнес-логики для обработки конференций и комнат
"""

import json
from typing import Dict, Any

from app.services.websocket_manager import websocket_manager
from app.core.logger import logger
from app.core.config import settings

class ConferenceService:
    """
    Сервис видеоконференций, реализующий бизнес-логику
    
    Управляет созданием комнат, присоединением пользователей,
    обработкой WebRTC сообщений и сообщений чата
    """

    def __init__(self):
        """
        Инициализирует сервис конференций
        
        Создает связи с менеджером WebSocket соединений и логгером
        """
        self.manager = websocket_manager
        self.logger = logger

    async def create_room(self, user_id: str, room_id: str) -> Dict[str, Any]:
        """
        Создает новую конференц-комнату
        
        Args:
            user_id (str): Идентификатор пользователя-создателя
            room_id (str): Уникальный идентификатор комнаты
            
        Returns:
            Dict[str, Any]: Результат создания комнаты с информацией об успехе
        """
        success = self.manager.create_room(room_id, user_id)

        response = {
            "type": "room_creation_response",
            "success": success,
            "room_id": room_id,
            "message": "Комната создана" if success else "Комната с таким ID уже существует"
        }

        if success:
            await self.manager.notify_user_joined(room_id, user_id)

        return response

    async def join_room(self, user_id: str, room_id: str) -> Dict[str, Any]:
        """
        Присоединяет пользователя к существующей конференц-комнате
        
        Args:
            user_id (str): Идентификатор пользователя
            room_id (str): Идентификатор комнаты
            
        Returns:
            Dict[str, Any]: Результат присоединения к комнате
        """
        success = self.manager.join_room(room_id, user_id)

        response = {
            "type": "room_join_response",
            "success": success,
            "room_id": room_id,
            "message": "Вы присоединились к комнате" if success else "Комната не существует"
        }

        if success:
            await self.manager.notify_user_joined(room_id, user_id)

        return response

    async def leave_room(self, user_id: str, room_id: str) -> None:
        """
        Покидает конференц-комнату
        
        Args:
            user_id (str): Идентификатор пользователя
            room_id (str): Идентификатор комнаты
        """
        await self.manager.leave_room(room_id, user_id)

    async def handle_webrtc_message(self, message_data: Dict[str, Any], from_user: str) -> None:
        """
        Обрабатывает WebRTC signaling сообщения
        
        Args:
            message_data (Dict[str, Any]): Данные WebRTC сообщения
            from_user (str): Идентификатор отправителя
        """
        message_type = message_data.get("type")
        target_user = message_data.get("to")

        if target_user:
            # Добавляем информацию об отправителе
            message_data["from"] = from_user
            message_str = json.dumps(message_data)
            await self.manager.send_to_user(target_user, message_str)

    async def handle_room_message(self, message_data: Dict[str, Any], from_user: str) -> None:
        """
        Обрабатывает сообщения чата комнаты
        
        Args:
            message_data (Dict[str, Any]): Данные сообщения
            from_user (str): Идентификатор отправителя
        """
        room_id = message_data.get("room_id")
        if room_id:
            # Добавляем информацию об отправителе
            message_data["from"] = from_user
            message_str = json.dumps(message_data)
            await self.manager.send_to_room(room_id, message_str, exclude_user=from_user)

    def get_rooms_list(self) -> Dict[str, Any]:
        """
        Получает список всех активных комнат
        
        Returns:
            Dict[str, Any]: Словарь со списком активных комнат и их участников
        """
        rooms_data = []
        for room_id, room in self.manager.rooms.items():
            rooms_data.append({
                "id": room_id,
                "participants_count": room.participant_count,
                "participants": room.participants.copy()
            })

        return {"rooms": rooms_data}

# Глобальный экземпляр сервиса
conference_service = ConferenceService()
