/**
 * WebSocket Client Component
 * Observer Pattern Implementation
 */

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.userId = '';
        this.observers = new Map(); // Observer pattern
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    // Observer pattern methods
    subscribe(eventType, callback) {
        if (!this.observers.has(eventType)) {
            this.observers.set(eventType, []);
        }
        this.observers.get(eventType).push(callback);
    }

    unsubscribe(eventType, callback) {
        if (this.observers.has(eventType)) {
            const callbacks = this.observers.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notify(eventType, data) {
        if (this.observers.has(eventType)) {
            this.observers.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in observer callback:', error);
                }
            });
        }
    }

    connect(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        this.userId = userId;
        const wsUrl = `ws://localhost:8000/ws/${encodeURIComponent(userId)}`;

        try {
            this.socket = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.notify('connection_error', { error: error.message });
        }
    }

    setupEventHandlers() {
        this.socket.onopen = (event) => {
            this.reconnectAttempts = 0;
            this.notify('connected', { userId: this.userId });
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.notify('message', data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
                this.notify('message_error', { error: error.message, data: event.data });
            }
        };

        this.socket.onclose = (event) => {
            this.notify('disconnected', { code: event.code, reason: event.reason });
            this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.notify('error', { error: error.message });
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connect(this.userId);
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.log('Max reconnection attempts reached');
            this.notify('reconnect_failed', { attempts: this.reconnectAttempts });
        }
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            try {
                const message = typeof data === 'string' ? data : JSON.stringify(data);
                this.socket.send(message);
                return true;
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
                return false;
            }
        }
        return false;
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.reconnectAttempts = 0;
    }

    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    getReadyState() {
        if (!this.socket) return WebSocket.CLOSED;
        return this.socket.readyState;
    }
}

// Глобальный экземпляр WebSocket клиента
const wsClient = new WebSocketClient();
