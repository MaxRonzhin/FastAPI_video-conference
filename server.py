from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import asyncio
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Dict, List

app = FastAPI(title="Video Conference Server")

# Разрешаем CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConferenceManager:
    def __init__(self):
        # Храним подключения пользователей
        self.user_connections: Dict[str, WebSocket] = {}
        # Храним комнаты и участников
        self.rooms: Dict[str, List[str]] = {}

    async def connect_user(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.user_connections[user_id] = websocket

    def disconnect_user(self, user_id: str):
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        # Удаляем пользователя из всех комнат
        rooms_to_remove = []
        for room_id, participants in list(self.rooms.items()):
            if user_id in participants:
                participants.remove(user_id)
                # Уведомляем остальных участников
                asyncio.create_task(self.notify_user_left(room_id, user_id))
                # Если комната пуста, помечаем для удаления
                if not participants:
                    rooms_to_remove.append(room_id)

        # Удаляем пустые комнаты
        for room_id in rooms_to_remove:
            if room_id in self.rooms:
                del self.rooms[room_id]

    async def create_room(self, user_id: str, room_id: str) -> bool:
        if room_id in self.rooms:
            return False  # Комната уже существует
        self.rooms[room_id] = [user_id]  # Создатель сразу добавляется в комнату
        return True

    async def join_room(self, user_id: str, room_id: str) -> bool:
        if room_id not in self.rooms:
            return False  # Комната не существует
        if user_id not in self.rooms[room_id]:
            self.rooms[room_id].append(user_id)
        return True

    async def leave_room(self, user_id: str, room_id: str):
        if room_id in self.rooms and user_id in self.rooms[room_id]:
            self.rooms[room_id].remove(user_id)
            # Уведомляем остальных участников
            await self.notify_user_left(room_id, user_id)
            # Если комната пуста, удаляем её
            if not self.rooms[room_id]:
                if room_id in self.rooms:
                    del self.rooms[room_id]

    async def send_to_user(self, user_id: str, message: str):
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_text(message)
            except:
                pass

    async def notify_user_joined(self, room_id: str, user_id: str):
        """Уведомляем всех участников о новом пользователе"""
        if room_id in self.rooms:
            message = {
                "type": "user_joined",
                "user_id": user_id,
                "room_id": room_id,
                "participants": self.rooms[room_id].copy()
            }
            message_str = json.dumps(message)
            tasks = []
            for participant in self.rooms[room_id]:
                if participant in self.user_connections:
                    tasks.append(self.send_to_user(participant, message_str))

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    async def notify_user_left(self, room_id: str, user_id: str):
        """Уведомляем всех участников об уходе пользователя"""
        if room_id in self.rooms:
            message = {
                "type": "user_left",
                "user_id": user_id,
                "room_id": room_id
            }
            message_str = json.dumps(message)
            tasks = []
            for participant in self.rooms[room_id]:
                if participant in self.user_connections:
                    tasks.append(self.send_to_user(participant, message_str))

            # Также отправляем ушедшему пользователю (если он еще подключен)
            if user_id in self.user_connections:
                tasks.append(self.send_to_user(user_id, message_str))

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    async def send_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        if room_id in self.rooms:
            message_str = json.dumps(message)
            tasks = []
            for user_id in self.rooms[room_id]:
                if user_id != exclude_user and user_id in self.user_connections:
                    tasks.append(self.send_to_user(user_id, message_str))

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

manager = ConferenceManager()

# Читаем HTML файл
def get_index_html():
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Video Conference Server</h1><p>index.html not found</p>"

@app.get("/", response_class=HTMLResponse)
async def root():
    return get_index_html()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect_user(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            message_type = message_data.get("type")

            if message_type == "create_room":
                room_id = message_data.get("room_id")
                success = await manager.create_room(user_id, room_id)
                response = {
                    "type": "room_creation_response",
                    "success": success,
                    "room_id": room_id,
                    "message": "Комната создана" if success else "Комната с таким ID уже существует"
                }
                await manager.send_to_user(user_id, json.dumps(response))
                if success:
                    # Уведомляем всех участников (включая создателя) о новом пользователе
                    await manager.notify_user_joined(room_id, user_id)

            elif message_type == "join_room":
                room_id = message_data.get("room_id")
                success = await manager.join_room(user_id, room_id)
                response = {
                    "type": "room_join_response",
                    "success": success,
                    "room_id": room_id,
                    "message": "Вы присоединились к комнате" if success else "Комната не существует"
                }
                await manager.send_to_user(user_id, json.dumps(response))
                if success:
                    # Уведомляем всех участников о новом пользователе
                    await manager.notify_user_joined(room_id, user_id)

            elif message_type == "leave_room":
                room_id = message_data.get("room_id")
                await manager.leave_room(user_id, room_id)

            elif message_type in ["offer", "answer", "ice-candidate"]:
                # WebRTC signaling сообщения
                target_user = message_data.get("to")
                message_data["from"] = user_id
                await manager.send_to_user(target_user, json.dumps(message_data))

            elif message_type == "room_message":
                # Сообщение в комнату
                room_id = message_data.get("room_id")
                message_data["from"] = user_id
                await manager.send_to_room(room_id, message_data, exclude_user=user_id)

    except WebSocketDisconnect:
        manager.disconnect_user(user_id)

@app.get("/rooms")
async def get_rooms():
    return {
        "rooms": [
            {
                "id": room_id,
                "participants_count": len(participants),
                "participants": participants
            }
            for room_id, participants in manager.rooms.items()
        ]
    }

@app.get("/room/{room_id}/participants")
async def get_room_participants(room_id: str):
    participants = manager.rooms.get(room_id, [])
    return {"room_id": room_id, "participants": participants}

# Подключаем статические файлы
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
