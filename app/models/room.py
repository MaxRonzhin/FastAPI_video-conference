"""
Модель данных для комнат видеоконференций
Определяет классы данных и структуры для работы с комнатами и сообщениями
"""

from typing import List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class Room:
    """
    Модель конференц-комнаты
    
    Attributes:
        id (str): Уникальный идентификатор комнаты
        participants (List[str]): Список идентификаторов участников
        created_at (datetime): Время создания комнаты
        created_by (Optional[str]): ID пользователя-создателя комнаты
    """
    id: str
    participants: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    created_by: Optional[str] = None

    def add_participant(self, user_id: str) -> bool:
        """
        Добавляет участника в комнату
        
        Args:
            user_id (str): Идентификатор пользователя
            
        Returns:
            bool: True если участник добавлен, False если уже существует
        """
        if user_id not in self.participants:
            self.participants.append(user_id)
            return True
        return False

    def remove_participant(self, user_id: str) -> bool:
        """
        Удаляет участника из комнаты
        
        Args:
            user_id (str): Идентификатор пользователя
            
        Returns:
            bool: True если участник удален, False если не найден
        """
        if user_id in self.participants:
            self.participants.remove(user_id)
            return True
        return False

    @property
    def participant_count(self) -> int:
        """
        Получает количество участников в комнате
        
        Returns:
            int: Количество участников
        """
        return len(self.participants)

@dataclass
class WebSocketMessage:
    """
    Модель WebSocket сообщения
    
    Attributes:
        type (str): Тип сообщения
        data (Dict): Данные сообщения
        from_user (Optional[str]): ID отправителя сообщения
        to_user (Optional[str]): ID получателя сообщения
    """
    type: str
    data: Dict
    from_user: Optional[str] = None
    to_user: Optional[str] = None
