"""
Conference Service
Business Logic Layer
"""

import json
from typing import Dict, Any

from app.services.websocket_manager import websocket_manager
from app.core.logger import logger
from app.core.config import settings

class ConferenceService:
    """Conference service implementing business logic"""

    def __init__(self):
        self.manager = websocket_manager
        self.logger = logger

    async def create_room(self, user_id: str, room_id: str) -> Dict[str, Any]:
        """Create new conference room"""
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
        """Join existing conference room"""
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
        """Leave conference room"""
        await self.manager.leave_room(room_id, user_id)

    async def handle_webrtc_message(self, message_data: Dict[str, Any], from_user: str) -> None:
        """Handle WebRTC signaling messages"""
        message_type = message_data.get("type")
        target_user = message_data.get("to")

        if target_user:
            # Добавляем информацию об отправителе
            message_data["from"] = from_user
            message_str = json.dumps(message_data)
            await self.manager.send_to_user(target_user, message_str)

    async def handle_room_message(self, message_data: Dict[str, Any], from_user: str) -> None:
        """Handle room chat messages"""
        room_id = message_data.get("room_id")
        if room_id:
            # Добавляем информацию об отправителе
            message_data["from"] = from_user
            message_str = json.dumps(message_data)
            await self.manager.send_to_room(room_id, message_str, exclude_user=from_user)

    def get_rooms_list(self) -> Dict[str, Any]:
        """Get list of all active rooms"""
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
