"""
Utility Helper Functions
"""

import json
from typing import Any, Dict, Optional
import re

class MessageValidator:
    """Utility class for message validation"""

    @staticmethod
    def validate_user_id(user_id: str) -> bool:
        """Validate user ID format"""
        if not user_id or not isinstance(user_id, str):
            return False
        return len(user_id.strip()) > 0 and len(user_id) <= 50

    @staticmethod
    def validate_room_id(room_id: str) -> bool:
        """Validate room ID format"""
        if not room_id or not isinstance(room_id, str):
            return False
        return len(room_id.strip()) > 0 and len(room_id) <= 50

    @staticmethod
    def validate_message_type(message_type: str) -> bool:
        """Validate message type"""
        valid_types = {
            'create_room', 'join_room', 'leave_room',
            'offer', 'answer', 'ice-candidate',
            'room_message', 'user_joined', 'user_left'
        }
        return message_type in valid_types

    @staticmethod
    def sanitize_input(text: str) -> str:
        """Sanitize user input"""
        if not text:
            return ""
        # Удаляем потенциально опасные символы
        return re.sub(r'[<>"\']', '', str(text))[:1000]

class JSONHelper:
    """Utility class for JSON operations"""

    @staticmethod
    def safe_json_parse(json_string: str) -> Optional[Dict[Any, Any]]:
        """Safely parse JSON string"""
        try:
            return json.loads(json_string)
        except (json.JSONDecodeError, TypeError):
            return None

    @staticmethod
    def safe_json_dumps(data: Any) -> str:
        """Safely convert data to JSON string"""
        try:
            return json.dumps(data, ensure_ascii=False)
        except (TypeError, ValueError):
            return "{}"

class RoomHelper:
    """Utility class for room operations"""

    @staticmethod
    def generate_room_link(room_id: str, base_url: str = "http://localhost:8000") -> str:
        """Generate room join link"""
        return f"{base_url}/room/{room_id}"

    @staticmethod
    def is_valid_room_name(room_name: str) -> bool:
        """Check if room name is valid"""
        if not room_name:
            return False
        # Разрешаем буквы, цифры, дефисы и подчеркивания
        return bool(re.match(r'^[a-zA-Z0-9_-]+$', room_name))

# Глобальные вспомогательные функции
def get_timestamp() -> str:
    """Get current timestamp"""
    from datetime import datetime
    return datetime.now().isoformat()

def format_participants_count(count: int) -> str:
    """Format participants count for display"""
    if count == 1:
        return "1 участник"
    elif count in [2, 3, 4]:
        return f"{count} участника"
    else:
        return f"{count} участников"

def generate_user_color(user_id: str) -> str:
    """Generate consistent color for user based on ID"""
    # Простой хеш-алгоритм для генерации цвета
    hash_value = hash(user_id) % 360
    return f"hsl({hash_value}, 70%, 60%)"
