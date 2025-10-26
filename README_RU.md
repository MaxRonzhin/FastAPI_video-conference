## README на других языках: [Английскмй](README.md)


# Видеоконференц-приложение

WebRTC-приложение для видеоконференций, построенное с использованием современных архитектурных паттернов и лучших практик разработки.

## 🏗️ Архитектурные паттерны

### Паттерн Singleton (Одиночка)
- **WebSocketManager**: Единственный экземпляр для управления всеми WebSocket-соединениями
- **AppLogger**: Централизованная система логирования
- **ConferenceService**: Координация бизнес-логики

### Паттерн Observer (Наблюдатель)
- **WebSocketClient**: Событийно-ориентированная коммуникация с подпиской на события
- **Обработка сообщений**: Децентрализованная обработка событий

### Паттерн Mediator (Посредник)
- **ConferenceManager**: Координирует взаимодействие между WebRTC, WebSocket и UI компонентами
- **Централизованное управление**: Снижение связанности компонентов

### Data Classes (Классы данных)
- **Модель Room**: Структурированное представление данных
- **Модели сообщений**: Типобезопасные структуры данных

### Разделение ответственности (Separation of Concerns)
```
app/
├── core/          # Конфигурация и утилиты
├── models/        # Модели данных и структуры
├── services/      # Бизнес-логика и сервисы
├── api/           # HTTP эндпоинты и WebSocket обработчики
└── utils/         # Вспомогательные функции
```

## 🚀 Возможности

- **Видеоконференции в реальном времени**: P2P-соединения через WebRTC
- **Поддержка нескольких комнат**: Создание и присоединение к конференц-залам
- **Чат**: Обмен сообщениями в реальном времени внутри комнат
- **Демонстрация экрана**: Совместное использование экрана с участниками
- **Управление медиа**: Включение/выключение видео и аудио
- **Адаптивный дизайн**: Работа на десктопах и мобильных устройствах

## 📁 Структура проекта

```
video-conference/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Точка входа приложения
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Конфигурация приложения (Singleton)
│   │   └── logger.py          # Централизованное логирование (Singleton)
│   ├── models/
│   │   ├── __init__.py
│   │   └── room.py            # Модели данных (Data Classes)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── websocket_manager.py    # Управление WebSocket (Singleton)
│   │   └── conference_service.py   # Бизнес-логика (Singleton)
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py          # HTTP/WebSocket эндпоинты
│   └── utils/
│       ├── __init__.py
│       └── helpers.py         # Вспомогательные функции
├── static/
│   ├── index.html             # Главная страница приложения
│   ├── css/
│   │   └── style.css          # Стилизация приложения
│   └── js/
│       ├── app.js             # Точка входа JavaScript
│       └── components/
│           ├── websocket.js   # WebSocket клиент (Observer Pattern)
│           └── conference.js  # Менеджер конференций (Mediator Pattern)
├── tests/
│   ├── __init__.py
│   └── test_websocket.py      # Модульные тесты
├── requirements.txt           # Зависимости
├── README.md                  # Этот файл
└── run.py                     # Запуск приложения
```

## 🛠️ Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd video-conference

# Создание виртуального окружения
python -m venv venv

# Активация виртуального окружения
# На Windows:
venv\Scripts\activate
# На macOS/Linux:
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt
```

## ▶️ Запуск приложения

```bash
# Запуск приложения
python run.py

# Или запуск напрямую через uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 🌐 Доступ

Откройте браузер и перейдите по адресу: `http://localhost:8000`

## 🧪 Тестирование

```bash
# Запуск всех тестов
pytest tests/

# Запуск тестов с покрытием
pytest tests/ --cov=app/

# Запуск конкретного тест-файла
pytest tests/test_websocket.py
```

## 📡 API эндпоинты

### HTTP эндпоинты
- `GET /` - Главная страница приложения
- `GET /rooms` - Список всех активных комнат с количеством участников
- `GET /room/{room_id}/participants` - Участники в конкретной комнате
- `GET /favicon.ico` - Иконка приложения
- `GET /apple-touch-icon.png` - Иконка для мобильных устройств

### WebSocket эндпоинт
- `WebSocket /ws/{user_id}` - Канал связи в реальном времени

## 📨 Типы WebSocket сообщений

### Управление комнатами
```json
{
  "type": "create_room",
  "room_id": "название_комнаты"
}
```

```json
{
  "type": "join_room", 
  "room_id": "название_комнаты"
}
```

```json
{
  "type": "leave_room",
  "room_id": "название_комнаты"
}
```

### WebRTC сигналинг
```json
{
  "type": "offer",
  "to": "id_получателя",
  "sdp": { /* SDP offer */ }
}
```

```json
{
  "type": "answer",
  "to": "id_получателя", 
  "sdp": { /* SDP answer */ }
}
```

```json
{
  "type": "ice-candidate",
  "to": "id_получателя",
  "candidate": { /* ICE кандидат */ }
}
```

### Чат-сообщения
```json
{
  "type": "room_message",
  "room_id": "название_комнаты",
  "message": "Привет всем!"
}
```

## 🎨 Подробное описание паттернов

### 1. Паттерн Singleton (Одиночка)

```python
class WebSocketManager:
    _instance: Optional['WebSocketManager'] = None
    
    def __new__(cls) -> 'WebSocketManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
```

**Преимущества:**
- Единая точка управления WebSocket-соединениями
- Согласованное состояние по всему приложению
- Эффективное использование ресурсов

### 2. Паттерн Observer (Наблюдатель)

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

**Преимущества:**
- Децентрализованная обработка событий
- Гибкая модель подписки
- Легкость расширения новыми событиями

### 3. Паттерн Mediator (Посредник)

```javascript
class ConferenceManager {
    constructor() {
        this.wsClient = wsClient;  // Посредник WebSocket коммуникации
        this.peerConnections = new Map();  // Посредник WebRTC соединений
        this.videoElements = new Map();    // Посредник UI элементов
    }
    
    handleWebSocketMessage(data) {
        // Координирует различные типы сообщений
        switch (data.type) {
            case 'user_joined': this.handleUserJoined(data); break;
            case 'offer': this.handleOffer(data); break;
            // ... другие случаи
        }
    }
}
```

**Преимущества:**
- Централизованная логика управления
- Сниженная связанность компонентов
- Простота обслуживания и отладки

### 4. Data Classes (Классы данных)

```python
@dataclass
class Room:
    id: str
    participants: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    created_by: Optional[str] = None
```

**Преимущества:**
- Типобезопасность
- Автоматическая генерация методов
- Чистый, читаемый код

## 🔧 Конфигурация

### Переменные окружения
Создайте файл `.env` в корневой директории:

```env
PROJECT_NAME=Video Conference Server
VERSION=1.0.0
ALLOWED_ORIGINS=["*"]
```

### Управление настройками
```python
class Settings:
    PROJECT_NAME: str = "Video Conference Server"
    VERSION: str = "1.0.0"
    STUN_SERVERS: List[str] = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
    ]
```

## 📊 Логирование

Централизованное логирование с различными уровнями:
- **INFO**: Общий поток работы приложения
- **ERROR**: Ошибочные состояния
- **DEBUG**: Подробная отладочная информация
- **WARNING**: Предупреждающие состояния

## 🔒 Вопросы безопасности

- Конфигурация CORS для контролируемого доступа
- Валидация и санитизация входных данных
- Безопасные WebSocket соединения (возможность перехода на WSS)
- Рассмотрение ограничения частоты запросов

## 🚀 Развертывание

### Продакшн развертывание
```bash
# Установка зависимостей для продакшна
pip install -r requirements.txt

# Запуск через uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker развертывание (Опционально)
Создайте `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🧪 Стратегия тестирования

### Модульные тесты
- Управление WebSocket соединениями
- Логика создания и присоединения к комнатам
- Обработка сообщений

### Интеграционные тесты
- Сквозная WebSocket коммуникация
- Управление участниками комнат
- Поток WebRTC сигналинга

### Цели покрытия тестами
- Основная бизнес-логика: 90%+
- API эндпоинты: 80%+
- Обработчики WebSocket: 85%+

## 📈 Рассмотрение производительности

- Асинхронная обработка WebSocket
- Пул соединений для WebSocketManager
- Эффективная сериализация JSON
- Управление памятью для WebRTC соединений

## 🆘 Устранение неполадок

### Частые проблемы

1. **Ошибка WebSocket соединения**
   - Проверьте запущен ли сервер
   - Проверьте сетевое соединение
   - Проверьте консоль браузера на наличие ошибок

2. **Видео не работает**
   - Убедитесь в разрешениях камеры/микрофона
   - Проверьте поддержку WebRTC в браузере
   - Проверьте конфигурацию STUN сервера

3. **Проблемы с созданием комнат**
   - Проверьте уникальность ID комнаты
   - Проверьте аутентификацию пользователя

### Советы по отладке

```bash
# Включение отладочного логирования
export LOG_LEVEL=DEBUG

# Мониторинг WebSocket соединений
# Проверьте вкладку Network в браузере для WebSocket фреймов
```

## 🤝 Участие в разработке

1. Сделайте форк репозитория
2. Создайте ветку с новой функцией
3. Зафиксируйте изменения
4. Отправьте в свою ветку
5. Создайте Pull Request

## 📄 Лицензия

Лицензия MIT - смотрите файл `LICENSE` для подробностей.
