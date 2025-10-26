"""
WebSocket Tests
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, Mock

from app.services.websocket_manager import WebSocketManager
from app.services.conference_service import ConferenceService

class TestWebSocketManager:
    """Test WebSocket Manager functionality"""

    def setup_method(self):
        """Setup test method"""
        # Создаем новый экземпляр для каждого теста
        WebSocketManager._instance = None
        self.manager = WebSocketManager()

    def test_singleton_pattern(self):
        """Test that WebSocketManager is a singleton"""
        manager1 = WebSocketManager()
        manager2 = WebSocketManager()
        assert manager1 is manager2

    def test_create_room(self):
        """Test room creation"""
        result = self.manager.create_room("test_room", "user1")
        assert result is True

        # Попытка создать комнату с тем же ID должна вернуть False
        result = self.manager.create_room("test_room", "user2")
        assert result is False

    def test_join_room(self):
        """Test joining room"""
        # Создаем комнату
        self.manager.create_room("test_room", "user1")

        # Присоединяем пользователя
        result = self.manager.join_room("test_room", "user2")
        assert result is True

        # Попытка присоединиться к несуществующей комнате
        result = self.manager.join_room("nonexistent_room", "user3")
        assert result is False

class TestConferenceService:
    """Test Conference Service functionality"""

    def setup_method(self):
        """Setup test method"""
        WebSocketManager._instance = None
        self.service = ConferenceService()
        self.manager = self.service.manager

    @pytest.mark.asyncio
    async def test_create_room_success(self):
        """Test successful room creation"""
        # Мокаем метод отправки сообщений
        self.manager.send_to_user = AsyncMock()

        result = await self.service.create_room("user1", "test_room")

        assert result["success"] is True
        assert result["room_id"] == "test_room"
        self.manager.send_to_user.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_room_duplicate(self):
        """Test creating duplicate room"""
        # Мокаем метод отправки сообщений
        self.manager.send_to_user = AsyncMock()

        # Создаем комнату первый раз
        await self.service.create_room("user1", "test_room")

        # Пытаемся создать комнату с тем же ID
        result = await self.service.create_room("user2", "test_room")

        assert result["success"] is False
        assert "уже существует" in result["message"]

if __name__ == "__main__":
    pytest.main([__file__])
