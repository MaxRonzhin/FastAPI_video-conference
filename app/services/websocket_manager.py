"""
WebSocket Connection Manager
Singleton Pattern Implementation
"""

import json
from typing import Dict, List, Optional
import asyncio
from fastapi import WebSocket

from app.core.logger import logger
from app.models.room import Room

class WebSocketManager:
    """WebSocket connection manager using Singleton pattern"""

    _instance: Optional['WebSocketManager'] = None

    def __new__(cls) -> 'WebSocketManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self) -> None:
        """Initialize manager"""
        self.active_connections: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Room] = {}
        self.logger = logger

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """Connect user"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.logger.info(f"User {user_id} connected")

    def disconnect(self, user_id: str) -> None:
        """Disconnect user"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            self.logger.info(f"User {user_id} disconnected")

            # Удаляем пользователя из всех комнат
            self._remove_user_from_all_rooms(user_id)

    async def send_to_user(self, user_id: str, message: str) -> bool:
        """Send message to specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
                return True
            except Exception as e:
                self.logger.error(f"Failed to send message to {user_id}: {e}")
                return False
        return False

    async def send_to_room(self, room_id: str, message: str, exclude_user: str = None) -> None:
        """Send message to all room participants"""
        if room_id in self.rooms:
            tasks = []
            for user_id in self.rooms[room_id].participants:
                if user_id != exclude_user and user_id in self.active_connections:
                    tasks.append(self.send_to_user(user_id, message))

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    def create_room(self, room_id: str, creator_id: str) -> bool:
        """Create new room"""
        if room_id in self.rooms:
            return False

        room = Room(id=room_id, created_by=creator_id)
        room.add_participant(creator_id)
        self.rooms[room_id] = room
        self.logger.info(f"Room {room_id} created by {creator_id}")
        return True

    def join_room(self, room_id: str, user_id: str) -> bool:
        """Join existing room"""
        if room_id not in self.rooms:
            return False

        success = self.rooms[room_id].add_participant(user_id)
        if success:
            self.logger.info(f"User {user_id} joined room {room_id}")
        return success

    async def leave_room(self, room_id: str, user_id: str) -> None:
        """Leave room"""
        if room_id in self.rooms:
            self.rooms[room_id].remove_participant(user_id)
            self.logger.info(f"User {user_id} left room {room_id}")

            # Уведомляем остальных участников
            await self._notify_user_left(room_id, user_id)

            # Удаляем пустую комнату
            if self.rooms[room_id].participant_count == 0:
                del self.rooms[room_id]
                self.logger.info(f"Room {room_id} deleted (empty)")

    async def _notify_user_left(self, room_id: str, user_id: str) -> None:
        """Notify room participants about user leaving"""
        if room_id in self.rooms:
            message = json.dumps({
                "type": "user_left",
                "user_id": user_id,
                "room_id": room_id
            })
            await self.send_to_room(room_id, message)

    async def notify_user_joined(self, room_id: str, user_id: str) -> None:
        """Notify all participants about new user"""
        if room_id in self.rooms:
            message = json.dumps({
                "type": "user_joined",
                "user_id": user_id,
                "room_id": room_id,
                "participants": self.rooms[room_id].participants.copy()
            })
            await self.send_to_room(room_id, message)

    def _remove_user_from_all_rooms(self, user_id: str) -> None:
        """Remove user from all rooms"""
        rooms_to_remove = []
        for room_id, room in self.rooms.items():
            if room.remove_participant(user_id):
                self.logger.info(f"User {user_id} removed from room {room_id}")
                if room.participant_count == 0:
                    rooms_to_remove.append(room_id)

        # Удаляем пустые комнаты
        for room_id in rooms_to_remove:
            del self.rooms[room_id]
            self.logger.info(f"Room {room_id} deleted (empty)")

# Глобальный экземпляр менеджера
websocket_manager = WebSocketManager()
