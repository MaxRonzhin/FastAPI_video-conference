## README in other languages: [Russian](README_RU.md)

# Video Conference Application

WebRTC-based video conference application built with modern architecture patterns and best practices.

## 🏗️ Architecture Patterns

### Singleton Pattern
- **WebSocketManager**: Single instance managing all WebSocket connections
- **AppLogger**: Centralized logging system
- **ConferenceService**: Business logic coordination

### Observer Pattern
- **WebSocketClient**: Event-driven communication with observer subscriptions
- **Message handling**: Decoupled event processing

### Mediator Pattern
- **ConferenceManager**: Coordinates interactions between WebRTC, WebSocket, and UI components
- **Centralized control**: Reduces component coupling

### Data Classes
- **Room Model**: Structured data representation
- **Message Models**: Type-safe data structures

### Separation of Concerns
```
app/
├── core/          # Configuration and utilities
├── models/        # Data structures and models
├── services/      # Business logic and services
├── api/           # HTTP endpoints and WebSocket handlers
└── utils/         # Helper functions and utilities
```

## 🚀 Features

- **Real-time Video Conferencing**: WebRTC peer-to-peer connections
- **Multi-room Support**: Create and join multiple conference rooms
- **Chat Functionality**: Real-time messaging within rooms
- **Screen Sharing**: Share your screen with room participants
- **Media Controls**: Toggle video/audio on/off
- **Responsive Design**: Works on desktop and mobile devices

## 📁 Project Structure

```
video-conference/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Application configuration (Singleton)
│   │   └── logger.py          # Centralized logging (Singleton)
│   ├── models/
│   │   ├── __init__.py
│   │   └── room.py            # Data models (Data Classes)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── websocket_manager.py    # WebSocket management (Singleton)
│   │   └── conference_service.py   # Business logic (Singleton)
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py          # HTTP/WebSocket endpoints
│   └── utils/
│       ├── __init__.py
│       └── helpers.py         # Utility functions
├── static/
│   ├── index.html             # Main application page
│   ├── css/
│   │   └── style.css          # Application styling
│   └── js/
│       ├── app.js             # Main application entry
│       └── components/
│           ├── websocket.js   # WebSocket client (Observer Pattern)
│           └── conference.js  # Conference manager (Mediator Pattern)
├── tests/
│   ├── __init__.py
│   └── test_websocket.py      # Unit tests
├── requirements.txt           # Dependencies
├── README.md                  # This file
└── run.py                     # Application launcher
```

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd video-conference

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## ▶️ Running the Application

```bash
# Run the application
python run.py

# Or run directly with uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 🌐 Access

Open your browser and navigate to: `http://localhost:8000`

## 🧪 Testing

```bash
# Run all tests
pytest tests/

# Run tests with coverage
pytest tests/ --cov=app/

# Run specific test file
pytest tests/test_websocket.py
```

## 📡 API Endpoints

### HTTP Endpoints
- `GET /` - Main application page
- `GET /rooms` - List all active rooms with participant counts
- `GET /room/{room_id}/participants` - Get participants in a specific room
- `GET /favicon.ico` - Application favicon
- `GET /apple-touch-icon.png` - Mobile device icon

### WebSocket Endpoint
- `WebSocket /ws/{user_id}` - Real-time communication channel

## 📨 WebSocket Message Types

### Room Management
```json
{
  "type": "create_room",
  "room_id": "room_name"
}
```

```json
{
  "type": "join_room", 
  "room_id": "room_name"
}
```

```json
{
  "type": "leave_room",
  "room_id": "room_name"
}
```

### WebRTC Signaling
```json
{
  "type": "offer",
  "to": "target_user_id",
  "sdp": { /* SDP offer */ }
}
```

```json
{
  "type": "answer",
  "to": "target_user_id", 
  "sdp": { /* SDP answer */ }
}
```

```json
{
  "type": "ice-candidate",
  "to": "target_user_id",
  "candidate": { /* ICE candidate */ }
}
```

### Chat Messages
```json
{
  "type": "room_message",
  "room_id": "room_name",
  "message": "Hello everyone!"
}
```

## 🎨 Design Patterns in Detail

### 1. Singleton Pattern Implementation

```python
class WebSocketManager:
    _instance: Optional['WebSocketManager'] = None
    
    def __new__(cls) -> 'WebSocketManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
```

**Benefits:**
- Single point of WebSocket connection management
- Consistent state across application
- Resource efficiency

### 2. Observer Pattern Implementation

```javascript
class WebSocketClient {
    subscribe(eventType, callback) {
        if (!this.observers.has(eventType)) {
            this.observers.set(eventType, []);
        }
        this.observers.get(eventType).push(callback);
    }
    
    notify(eventType, data) {
        if (this.observers.has(eventType)) {
            this.observers.get(eventType).forEach(callback => {
                callback(data);
            });
        }
    }
}
```

**Benefits:**
- Decoupled event handling
- Flexible subscription model
- Easy to extend with new events

### 3. Mediator Pattern Implementation

```javascript
class ConferenceManager {
    constructor() {
        this.wsClient = wsClient;  // Mediates WebSocket communication
        this.peerConnections = new Map();  // Mediates WebRTC connections
        this.videoElements = new Map();    // Mediates UI elements
    }
    
    handleWebSocketMessage(data) {
        // Coordinates different message types
        switch (data.type) {
            case 'user_joined': this.handleUserJoined(data); break;
            case 'offer': this.handleOffer(data); break;
            // ... other cases
        }
    }
}
```

**Benefits:**
- Centralized control logic
- Reduced component coupling
- Easier maintenance and debugging

### 4. Data Classes

```python
@dataclass
class Room:
    id: str
    participants: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    created_by: Optional[str] = None
```

**Benefits:**
- Type safety
- Automatic method generation
- Clean, readable code

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
PROJECT_NAME=Video Conference Server
VERSION=1.0.0
ALLOWED_ORIGINS=["*"]
```

### Settings Management
```python
class Settings:
    PROJECT_NAME: str = "Video Conference Server"
    VERSION: str = "1.0.0"
    STUN_SERVERS: List[str] = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
    ]
```

## 📊 Logging

Centralized logging with different levels:
- **INFO**: General application flow
- **ERROR**: Error conditions
- **DEBUG**: Detailed debugging information
- **WARNING**: Warning conditions

## 🔒 Security Considerations

- CORS configuration for controlled access
- Input validation and sanitization
- Secure WebSocket connections (upgradeable to WSS)
- Rate limiting considerations

## 🚀 Deployment

### Production Deployment
```bash
# Install production dependencies
pip install -r requirements.txt

# Run with uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment (Optional)
Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🧪 Testing Strategy

### Unit Tests
- WebSocket connection management
- Room creation and joining logic
- Message handling

### Integration Tests
- End-to-end WebSocket communication
- Room participant management
- WebRTC signaling flow

### Test Coverage Goals
- Core business logic: 90%+
- API endpoints: 80%+
- WebSocket handlers: 85%+

## 📈 Performance Considerations

- Asynchronous WebSocket handling
- Connection pooling for WebSocketManager
- Efficient JSON serialization
- Memory management for WebRTC connections

## 🆘 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if server is running
   - Verify network connectivity
   - Check browser console for errors

2. **Video Not Working**
   - Ensure camera/microphone permissions
   - Check browser WebRTC support
   - Verify STUN server configuration

3. **Room Creation Issues**
   - Check room ID uniqueness
   - Verify user authentication

### Debugging Tips

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Monitor WebSocket connections
# Check browser Network tab for WebSocket frames
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see `LICENSE` file for details.
