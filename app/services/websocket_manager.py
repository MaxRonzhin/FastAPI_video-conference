"""
Менеджер WebSocket соединений
Реализация паттерна Singleton для управления подключениями
"""

import json
from typing import Dict, List, Optional
import asyncio
from fastapi import WebSocket

from app.core.logger import logger
from app.models.room import Room

class WebSocketManager:
    """
    Менеджер WebSocket соединений, использующий паттерн Singleton
    
    Управляет активными подключениями, комнатами конференций
    и пересылкой сообщений между пользователями
    """

    _instance: Optional['WebSocketManager'] = None

    def __new__(cls) -> 'WebSocketManager':
        """
        Создает единственный экземпляр менеджера (Singleton)
        
        Returns:
            WebSocketManager: Единственный экземпляр менеджера
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self) -> None:
        """
        Инициализирует менеджер соединений
        
        Создает словари для активных подключений и комнат
        """
        self.active_connections: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Room] = {}
        self.logger = logger

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """
        Подключает пользователя через WebSocket
        
        Args:
            user_id (str): Идентификатор пользователя
            websocket (WebSocket): WebSocket соединение
        """
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.logger.info(f"User {user_id} connected")

    def disconnect(self, user_id: str) -> None:
        """
        Отключает пользователя и удаляет его из всех комнат
        
        Args:
            user_id (str): Идентификатор пользователя
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            self.logger.info(f"User {user_id} disconnected")

            # Удаляем пользователя из всех комнат
            self._remove_user_from_all_rooms(user_id)

    async def send_to_user(self, user_id: str, message: str) -> bool:
        """
        Отправляет сообщение конкретному пользователю
        
        Args:
            user_id (str): Идентификатор получателя
            message (str): Текст сообщения
            
        Returns:
            bool: True если сообщение отправлено успешно
        """
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
                return True
            except Exception as e:
                self.logger.error(f"Failed to send message to {user_id}: {e}")
                return False
        return False

    async def send_to_room(self, room_id: str, message: str, exclude_user: str = None) -> None:
        """
        Отправляет сообщение всем участникам комнаты
        
        Args:
            room_id (str): Идентификатор комнаты
            message (str): Текст сообщения
            exclude_user (str, optional): ID пользователя, исключаемого из рассылки
        """
        if room_id in self.rooms:
            tasks = []
            for user_id in self.rooms[room_id].participants:
                if user_id != exclude_user and user_id in self.active_connections:
                    tasks.append(self.send_to_user(user_id, message))

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    def create_room(self, room_id: str, creator_id: str) -> bool:
        """
        Создает новую комнату конференции
        
        Args:
            room_id (str): Уникальный идентификатор комнаты
            creator_id (str): ID пользователя-создателя
            
        Returns:
            bool: True если комната создана, False если уже существует
        """
        if room_id in self.rooms:
            return False

        room = Room(id=room_id, created_by=creator_id)
        room.add_participant(creator_id)
        self.rooms[room_id] = room
        self.logger.info(f"Room {room_id} created by {creator_id}")
        return True

    def join_room(self, room_id: str, user_id: str) -> bool:
        """
        Присоединяет пользователя к комнате
        
        Args:
            room_id (str): Идентификатор комнаты
            user_id (str): Идентификатор пользователя
            
        Returns:
            bool: True если пользователь добавлен в комнату
        """
        if room_id not in self.rooms:
            return False

        success = self.rooms[room_id].add_participant(user_id)
        if success:
            self.logger.info(f"User {user_id} joined room {room_id}")
        return success

    async def leave_room(self, room_id: str, user_id: str) -> None:
        """
        Удаляет пользователя из комнаты
        
        Args:
            room_id (str): Идентификатор комнаты
            user_id (str): Идентификатор пользователя
        """
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
        """
        Уведомляет участников комнаты о выходе пользователя
        
        Args:
            room_id (str): Идентификатор комнаты
            user_id (str): Идентификатор покинувшего пользователя
        """
        if room_id in self.rooms:
            message = json.dumps({
                "type": "user_left",
                "user_id": user_id,
                "room_id": room_id
            })
            await self.send_to_room(room_id, message)

    async def notify_user_joined(self, room_id: str, user_id: str) -> None:
        """
        Уведомляет всех участников о присоединении нового пользователя
        
        Args:
            room_id (str): Идентификатор комнаты
            user_id (str): Идентификатор присоединившегося пользователя
        """
        if room_id in self.rooms:
            message = json.dumps({
                "type": "user_joined",
                "user_id": user_id,
                "room_id": room_id,
                "participants": self.rooms[room_id].participants.copy()
            })
            await self.send_to_room(room_id, message)

    def _remove_user_from_all_rooms(self, user_id: str) -> None:
        """
        Удаляет пользователя из всех комнат
        
        Args:
            user_id (str): Идентификатор пользователя
        """
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
