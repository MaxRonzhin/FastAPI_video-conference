"""
Room Model
Data classes and structures
"""

from typing import List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class Room:
    """Conference room model"""
    id: str
    participants: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    created_by: Optional[str] = None

    def add_participant(self, user_id: str) -> bool:
        """Add participant to room"""
        if user_id not in self.participants:
            self.participants.append(user_id)
            return True
        return False

    def remove_participant(self, user_id: str) -> bool:
        """Remove participant from room"""
        if user_id in self.participants:
            self.participants.remove(user_id)
            return True
        return False

    @property
    def participant_count(self) -> int:
        """Get participant count"""
        return len(self.participants)

@dataclass
class WebSocketMessage:
    """WebSocket message model"""
    type: str
    data: Dict
    from_user: Optional[str] = None
    to_user: Optional[str] = None
