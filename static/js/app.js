/**
 * Main Application Entry Point
 */

// Приложение инициализируется в index.html
console.log('Video Conference Application Loaded');

// Экспортируем для глобального доступа если нужно
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WebSocketClient,
        ConferenceManager,
        wsClient
    };
}
