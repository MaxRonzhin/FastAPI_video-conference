/**
 * Conference Manager Component
 * Mediator Pattern Implementation
 */

class ConferenceManager {
    constructor() {
        this.wsClient = wsClient; // Используем глобальный WebSocket клиент
        this.userId = '';
        this.roomId = '';
        this.localStream = null;
        this.screenStream = null;
        this.peerConnections = new Map();
        this.videoElements = new Map();
        this.isChatOpen = false;
        this.isMenuOpen = false;
        this.roomUpdateInterval = null;
        this.isInRoom = false;

        // Медиа состояния
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.isScreenSharing = false;

        // Состояния поднятой руки
        this.isHandRaised = false;
        this.raisedHands = []; // Список пользователей с поднятыми руками

        this.initializeWebSocket();
        this.setupEventListeners();
    }

    initializeWebSocket() {
        // Подписываемся на события WebSocket
        this.wsClient.subscribe('connected', (data) => {
            this.onWebSocketConnected(data);
        });

        this.wsClient.subscribe('disconnected', (data) => {
            this.onWebSocketDisconnected(data);
        });

        this.wsClient.subscribe('message', (data) => {
            this.handleWebSocketMessage(data);
        });

        this.wsClient.subscribe('error', (data) => {
            this.onWebSocketError(data);
        });
    }

    setupEventListeners() {
        // Автоматическое обновление списка комнат
        setInterval(() => {
            if (this.wsClient.isConnected()) {
                this.loadExistingRooms();
            }
        }, 5000);
    }

    onWebSocketConnected(data) {
        console.log('WebSocket connected:', data);
        this.updateConnectionStatus('connected', 'Подключено');
        document.getElementById('disconnectBtn').disabled = false;
        document.getElementById('roomSection').style.display = 'block';
        this.loadExistingRooms();
    }

    onWebSocketDisconnected(data) {
        console.log('WebSocket disconnected:', data);
        this.updateConnectionStatus('disconnected', 'Отключено');
        document.getElementById('disconnectBtn').disabled = true;
        this.cleanup();
        if (this.roomUpdateInterval) {
            clearInterval(this.roomUpdateInterval);
            this.roomUpdateInterval = null;
        }
    }

    onWebSocketError(data) {
        console.error('WebSocket error:', data);
        this.updateConnectionStatus('disconnected', 'Ошибка подключения');
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'room_creation_response':
                this.handleRoomCreationResponse(data);
                break;
            case 'room_join_response':
                this.handleRoomJoinResponse(data);
                break;
            case 'user_joined':
                this.handleUserJoined(data);
                break;
            case 'user_left':
                this.handleUserLeft(data);
                break;
            case 'offer':
                this.handleOffer(data);
                break;
            case 'answer':
                this.handleAnswer(data);
                break;
            case 'ice-candidate':
                this.handleIceCandidate(data);
                break;
            case 'room_message':
                this.displayChatMessage(data.from, data.message, 'received');
                break;
            case 'hand_raised':
                this.handleHandRaised(data);
                break;
            case 'hand_lowered':
                this.handleHandLowered(data);
                break;
        }
    }

    // Public API methods
    connect() {
        this.userId = document.getElementById('userId').value.trim();
        if (!this.userId) {
            alert('Введите ваше имя');
            return;
        }

        try {
            this.wsClient.connect(this.userId);
        } catch (error) {
            console.error('Connection error:', error);
            alert('Ошибка подключения: ' + error.message);
        }
    }

    disconnect() {
        this.leaveRoom();
        this.wsClient.disconnect();
    }

    createRoom() {
        const roomId = document.getElementById('roomId').value.trim();
        if (!roomId) {
            alert('Введите ID комнаты');
            return;
        }
        this.roomId = roomId;

        const createMessage = {
            type: 'create_room',
            room_id: this.roomId
        };
        this.wsClient.send(createMessage);
    }

    joinRoom() {
        const roomId = document.getElementById('roomId').value.trim();
        if (!roomId) {
            alert('Введите ID комнаты');
            return;
        }
        this.roomId = roomId;

        const joinMessage = {
            type: 'join_room',
            room_id: this.roomId
        };
        this.wsClient.send(joinMessage);
    }

    leaveRoom() {
        if (this.roomId) {
            const leaveMessage = {
                type: 'leave_room',
                room_id: this.roomId
            };
            this.wsClient.send(leaveMessage);
        }
        this.cleanupRoom();
        this.isInRoom = false;
        // Показываем панель управления
        document.getElementById('controlPanel').style.display = 'block';
        // Скрываем ID комнаты и кнопку выхода
        document.getElementById('roomIdDisplay').style.display = 'none';
        document.getElementById('leaveRoomBtn').style.display = 'none';
    }

    // Private methods
    async getMediaStream() {
        try {
            // Пробуем получить и видео, и аудио
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
            } catch (videoError) {
                console.warn('Не удалось получить доступ к камере, пытаемся получить только аудио:', videoError);
                // Если не получилось получить видео, пробуем только аудио
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                });
            }

            // Отображаем локальное видео
            this.addParticipantTile(this.userId, this.localStream, true);

        } catch (error) {
            console.error('Ошибка получения медиа потока:', error);
            throw error;
        }
    }

    async joinRoomInternal() {
        try {
            // Получаем медиа поток
            await this.getMediaStream();
        } catch (error) {
            console.error('Ошибка получения медиа потока:', error);
            alert('Не удалось получить доступ к камере/микрофону');
        }
    }

    handleRoomCreationResponse(data) {
        if (data.success) {
            this.isInRoom = true;
            this.joinRoomInternal();
            this.displaySystemMessage('Комната создана успешно');
            // Показываем ID комнаты и кнопку выхода
            this.showRoomId(data.room_id);
            document.getElementById('leaveRoomBtn').style.display = 'block';
            document.getElementById('raisedHandsBtn').style.display = 'inline-flex';
            document.getElementById('raiseHandHeaderBtn').style.display = 'block';
        } else {
            alert(data.message);
            this.displaySystemMessage(data.message);
        }
    }

    handleRoomJoinResponse(data) {
        if (data.success) {
            this.isInRoom = true;
            this.joinRoomInternal();
            this.displaySystemMessage('Вы присоединились к комнате');
            // Показываем ID комнаты и кнопку выхода
            this.showRoomId(data.room_id);
            document.getElementById('leaveRoomBtn').style.display = 'block';
            document.getElementById('raisedHandsBtn').style.display = 'inline-flex';
            document.getElementById('raiseHandHeaderBtn').style.display = 'block';
        } else {
            alert(data.message);
            this.displaySystemMessage(data.message);
        }
    }

    handleUserJoined(data) {
        console.log('User joined data:', data);

        // Обновляем статус комнаты с количеством участников
        this.updateRoomStatus('connected', `В комнате: ${data.participants.length}`);

        if (data.user_id === this.userId) {
            // Это мы присоединились
            document.getElementById('mediaSection').style.display = 'grid';
            this.displaySystemMessage('Вы присоединились к комнате');

            // Создаем соединения со всеми уже существующими участниками
            data.participants.forEach(participant => {
                if (participant !== this.userId) {
                    console.log('Creating connection with existing participant:', participant);
                    setTimeout(() => {
                        this.createPeerConnection(participant);
                    }, 100);
                }
            });
        } else {
            // Это другой участник присоединился
            this.displaySystemMessage(`${data.user_id} присоединился`);
            // Создаем соединение с новым участником
            console.log('Creating connection with new participant:', data.user_id);
            setTimeout(() => {
                this.createPeerConnection(data.user_id);
            }, 100);
        }
    }

    handleUserLeft(data) {
        this.removePeerConnection(data.user_id);
        this.removeParticipantTile(data.user_id);
        this.displaySystemMessage(`${data.user_id} покинул комнату`);

        // Обновляем статус комнаты
        this.updateRoomStatus('connected', 'Участник покинул комнату');
    }

    createPeerConnection(userId) {
        console.log('Creating peer connection with:', userId);

        // Если соединение уже существует, закрываем его
        if (this.peerConnections.has(userId)) {
            console.log('Closing existing connection with:', userId);
            this.peerConnections.get(userId).close();
            this.peerConnections.delete(userId);
        }

        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const peerConnection = new RTCPeerConnection(configuration);

        // Добавляем локальный поток
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Обработчики ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const candidateMessage = {
                    type: 'ice-candidate',
                    to: userId,
                    candidate: event.candidate
                };
                this.wsClient.send(candidateMessage);
            }
        };

        // Обработчик получения удаленного потока
        peerConnection.ontrack = (event) => {
            console.log('Received remote track from:', userId);
            this.addParticipantTile(userId, event.streams[0], false);
        };

        // Обработчики состояния соединения
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
        };

        this.peerConnections.set(userId, peerConnection);

        // Создаем offer если мы инициатор
        if (this.userId < userId) {
            console.log('Creating offer to:', userId);
            setTimeout(() => {
                this.createOffer(userId, peerConnection);
            }, 200);
        }
    }

    async createOffer(userId, peerConnection) {
        try {
            console.log('Creating offer for:', userId);
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);

            const offerMessage = {
                type: 'offer',
                to: userId,
                sdp: offer
            };
            this.wsClient.send(offerMessage);
            console.log('Offer sent to:', userId);
        } catch (error) {
            console.error('Ошибка создания offer для', userId, ':', error);
        }
    }

    async handleOffer(data) {
        console.log('Received offer from:', data.from);
        let peerConnection = this.peerConnections.get(data.from);
        if (!peerConnection) {
            this.createPeerConnection(data.from);
            peerConnection = this.peerConnections.get(data.from);
        }

        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));

            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(answer);

            const answerMessage = {
                type: 'answer',
                to: data.from,
                sdp: answer
            };
            this.wsClient.send(answerMessage);
            console.log('Answer sent to:', data.from);
        } catch (error) {
            console.error('Ошибка обработки offer от', data.from, ':', error);
        }
    }

    async handleAnswer(data) {
        console.log('Received answer from:', data.from);
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                console.log('Answer accepted from:', data.from);
            } catch (error) {
                console.error('Ошибка установки answer от', data.from, ':', error);
            }
        }
    }

    async handleIceCandidate(data) {
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection && data.candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('ICE candidate added from:', data.from);
            } catch (error) {
                console.error('Ошибка добавления ICE кандидата от', data.from, ':', error);
            }
        }
    }

    addParticipantTile(userId, stream, isLocal) {
        const grid = document.getElementById('participantsGrid');
        const tileId = `tile-${userId}`;

        // Проверяем, существует ли уже такой тайл
        if (document.getElementById(tileId)) {
            // Обновляем поток
            const video = document.getElementById(tileId).querySelector('video');
            if (video) {
                video.srcObject = stream;
            }
            return;
        }

        const tile = document.createElement('div');
        tile.className = 'participant-tile';
        tile.id = tileId;

        // Проверяем, есть ли видео треки
        const hasVideo = stream && stream.getVideoTracks().length > 0;
        
        if (hasVideo) {
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.muted = isLocal; // Мьютим локальное видео
            video.srcObject = stream;
            tile.appendChild(video);
        } else {
            // Создаем заглушку для участника без видео
            const placeholder = document.createElement('div');
            placeholder.className = 'video-placeholder';
            placeholder.innerHTML = '<div class="placeholder-icon">👤</div>';
            tile.appendChild(placeholder);
        }

        const nameTag = document.createElement('div');
        nameTag.className = 'participant-name';
        nameTag.textContent = isLocal ? `${userId} (вы)` : userId;

        tile.appendChild(nameTag);
        grid.appendChild(tile);

        this.videoElements.set(userId, tile);
        console.log('Added video tile for:', userId);
    }

    removeParticipantTile(userId) {
        const tile = this.videoElements.get(userId);
        if (tile) {
            tile.remove();
            this.videoElements.delete(userId);
            console.log('Removed video tile for:', userId);
        }
    }

    removePeerConnection(userId) {
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(userId);
            console.log('Closed peer connection with:', userId);
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks.forEach(track => {
                    track.enabled = !track.enabled;
                });
                this.isVideoEnabled = !this.isVideoEnabled;
                const videoBtn = document.getElementById('videoBtn');
                if (this.isVideoEnabled) {
                    videoBtn.classList.add('active');
                    videoBtn.textContent = '📹';
                } else {
                    videoBtn.classList.remove('active');
                    videoBtn.textContent = '🚫';
                }
            } else {
                // Если нет видео треков, нельзя включить/выключить видео
                alert('Видео недоступно (нет камеры)');
            }
        }
    }

    toggleAudio() {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            this.isAudioEnabled = !this.isAudioEnabled;
            const audioBtn = document.getElementById('audioBtn');
            if (this.isAudioEnabled) {
                audioBtn.classList.add('active');
                audioBtn.textContent = '🎤';
            } else {
                audioBtn.classList.remove('active');
                audioBtn.textContent = '🔇';
            }
        }
    }

    async toggleScreenShare() {
        try {
            if (!this.isScreenSharing) {
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });

                // Заменяем видео трек в peer connections
                const screenTrack = this.screenStream.getVideoTracks()[0];
                this.peerConnections.forEach((pc, userId) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                this.isScreenSharing = true;
                document.getElementById('screenBtn').textContent = '⏹️';

                // Обработка остановки демонстрации
                screenTrack.onended = () => {
                    this.stopScreenShare();
                };
            } else {
                this.stopScreenShare();
            }
        } catch (error) {
            console.error('Ошибка демонстрации экрана:', error);
            alert('Не удалось начать демонстрацию экрана');
        }
    }

    stopScreenShare() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        // Возвращаем камеру (если есть)
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.peerConnections.forEach((pc, userId) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
            }
        }

        this.isScreenSharing = false;
        document.getElementById('screenBtn').textContent = '🖥️';
    }

    sendChatMessage() {
        const messageInput = document.getElementById('chatMessage');
        const message = messageInput.value.trim();

        if (!message || !this.roomId) {
            return;
        }

        const chatMessage = {
            type: 'room_message',
            room_id: this.roomId,
            message: message
        };

        this.wsClient.send(chatMessage);
        this.displayChatMessage(this.userId, message, 'sent');
        messageInput.value = '';
    }

    displayChatMessage(sender, message, type) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type === 'sent' ? 'own' : ''}`;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    displaySystemMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message system';
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
        const chatSidebar = document.getElementById('chatSidebar');
        if (this.isChatOpen) {
            chatSidebar.classList.add('open');
        } else {
            chatSidebar.classList.remove('open');
        }
    }

    toggleMenu() {
        /**
         * Переключает отображение панели управления
         */
        this.isMenuOpen = !this.isMenuOpen;
        const controlPanel = document.getElementById('controlPanel');
        if (controlPanel) {
            if (this.isMenuOpen) {
                controlPanel.classList.add('open');
            } else {
                controlPanel.classList.remove('open');
            }
        }
    }

    async loadExistingRooms() {
        try {
            const response = await fetch('http://localhost:8000/rooms');
            const data = await response.json();

            const roomsList = document.getElementById('roomsList');
            if (roomsList) {
                roomsList.innerHTML = '';

                if (data.rooms.length === 0) {
                    roomsList.innerHTML = '<div class="room-item" style="text-align: center; color: #666; font-size: 12px;">Нет активных комнат</div>';
                } else {
                    data.rooms.forEach(room => {
                        const roomItem = document.createElement('div');
                        roomItem.className = 'room-item';
                        roomItem.onclick = () => this.autoJoinRoom(room.id);
                        roomItem.innerHTML = `
                            <div class="room-id">${room.id}</div>
                            <div class="room-info">${room.participants_count} участник(ов)</div>
                        `;
                        roomsList.appendChild(roomItem);
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки комнат:', error);
        }
    }

    autoJoinRoom(roomId) {
        const roomIdInput = document.getElementById('roomId');
        if (roomIdInput) {
            roomIdInput.value = roomId;
            this.roomId = roomId;
            this.joinRoom();
        }
    }

    showRoomId(roomId) {
        const roomIdDisplay = document.getElementById('roomIdDisplay');
        if (roomIdDisplay) {
            roomIdDisplay.textContent = `Комната: ${roomId}`;
            roomIdDisplay.style.display = 'block';
        }
    }

    updateConnectionStatus(status, message) {
        const statusDiv = document.getElementById('connectionStatus');
        if (statusDiv) {
            statusDiv.className = `status-badge ${status}`;
            statusDiv.textContent = message;
        }
    }

    updateRoomStatus(status, message) {
        const statusDiv = document.getElementById('roomStatus');
        if (statusDiv) {
            statusDiv.className = `status-badge ${status}`;
            statusDiv.textContent = message;
        }
    }

    cleanup() {
        this.cleanupRoom();
        this.userId = '';
        this.roomId = '';
        document.getElementById('roomSection').style.display = 'none';
        document.getElementById('disconnectBtn').disabled = true;
        document.getElementById('roomIdDisplay').style.display = 'none';
        document.getElementById('leaveRoomBtn').style.display = 'none';
        document.getElementById('raisedHandsBtn').style.display = 'none';
        document.getElementById('raiseHandHeaderBtn').style.display = 'none';

        // Очищаем список комнат
        const roomsList = document.getElementById('roomsList');
        if (roomsList) {
            roomsList.innerHTML = '';
        }
    }

    cleanupRoom() {
        // Очищаем состояние поднятой руки
        this.isHandRaised = false;
        this.raisedHands = [];
        this.updateRaisedHandsDisplay();
        
        // Очищаем все peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();

        // Очищаем видео элементы
        this.videoElements.forEach((element, userId) => {
            element.remove();
        });
        this.videoElements.clear();

        // Очищаем медиа потоки
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        // Очищаем сетку участников
        const grid = document.getElementById('participantsGrid');
        if (grid) {
            grid.innerHTML = '';
        }

        // Скрываем секции
        document.getElementById('mediaSection').style.display = 'none';

        // Сбрасываем кнопку руки
        const raiseHandHeaderBtn = document.getElementById('raiseHandHeaderBtn');
        if (raiseHandHeaderBtn) {
            raiseHandHeaderBtn.classList.remove('raised');
        }

        this.roomId = '';
        this.updateRoomStatus('disconnected', 'Не в комнате');

        // Закрываем чат
        this.isChatOpen = false;
        const chatSidebar = document.getElementById('chatSidebar');
        chatSidebar.classList.remove('open');

        // Закрываем меню
        this.isMenuOpen = false;
        const controlPanel = document.getElementById('controlPanel');
        if (controlPanel) {
            controlPanel.classList.remove('open');
        }
    }

    toggleEmojiPicker() {
        /**
         * Переключает отображение палитры эмодзи
         */
        const emojiPicker = document.getElementById('emojiPicker');
        if (emojiPicker) {
            emojiPicker.classList.toggle('show');
        }
    }

    insertEmoji(emoji) {
        /**
         * Вставляет выбранный эмодзи в поле ввода сообщения
         * @param {string} emoji - Символ эмодзи для вставки
         */
        const chatInput = document.getElementById('chatMessage');
        if (chatInput) {
            // Вставляем эмодзи в текущую позицию курсора
            const start = chatInput.selectionStart;
            const end = chatInput.selectionEnd;
            const text = chatInput.value;
            
            chatInput.value = text.substring(0, start) + emoji + text.substring(end);
            
            // Устанавливаем курсор после вставленного эмодзи
            chatInput.selectionStart = chatInput.selectionEnd = start + emoji.length;
            
            // Фокусируемся на поле ввода
            chatInput.focus();
            
            // Закрываем палитру эмодзи
            const emojiPicker = document.getElementById('emojiPicker');
            if (emojiPicker) {
                emojiPicker.classList.remove('show');
            }
        }
    }

    toggleRaiseHand() {
        /**
         * Переключает состояние поднятой руки
         */
        if (!this.isInRoom || !this.roomId) return;

        const wasRaised = this.isHandRaised;
        this.isHandRaised = !this.isHandRaised;
        
        const raiseHandHeaderBtn = document.getElementById('raiseHandHeaderBtn');
        if (raiseHandHeaderBtn) {
            if (this.isHandRaised) {
                raiseHandHeaderBtn.classList.add('raised');
            } else {
                raiseHandHeaderBtn.classList.remove('raised');
            }
        }

        // Если состояние изменилось, отправляем сообщение
        if (wasRaised !== this.isHandRaised) {
            const message = {
                type: 'raise_hand',
                room_id: this.roomId,
                raised: this.isHandRaised
            };
            this.wsClient.send(message);
        }
    }

    handleHandRaised(data) {
        /**
         * Обрабатывает сообщение о поднятой руке
         * @param {Object} data - Данные о поднятой руке
         */
        if (data.user_id && !this.raisedHands.includes(data.user_id)) {
            this.raisedHands.push(data.user_id);
            this.updateRaisedHandsDisplay();
        }
    }

    handleHandLowered(data) {
        /**
         * Обрабатывает сообщение об опущенной руке
         * @param {Object} data - Данные об опущенной руке
         */
        const index = this.raisedHands.indexOf(data.user_id);
        if (index > -1) {
            this.raisedHands.splice(index, 1);
            this.updateRaisedHandsDisplay();
        }
    }

    updateRaisedHandsDisplay() {
        /**
         * Обновляет отображение счетчика и списка поднятых рук
         */
        const handsCount = document.getElementById('handsCount');
        if (handsCount) {
            handsCount.textContent = this.raisedHands.length;
        }

        // Обновляем выпадающий список
        this.updateRaisedHandsDropdown();
    }

    updateRaisedHandsDropdown() {
        /**
         * Обновляет содержимое выпадающего списка поднятых рук
         */
        const handsList = document.getElementById('handsList');
        if (!handsList) return;

        if (this.raisedHands.length === 0) {
            handsList.innerHTML = '<div class="no-hands">Пока нет поднятых рук</div>';
        } else {
            handsList.innerHTML = this.raisedHands
                .map(userId => `
                    <div class="hand-item">
                        <span class="hand-emoji">✋</span>
                        <span class="hand-name">${userId}</span>
                    </div>
                `).join('');
        }
    }

    showRaisedHands() {
        /**
         * Показывает выпадающее меню с поднятыми руками
         */
        const dropdown = document.getElementById('raisedHandsDropdown');
        if (dropdown) {
            dropdown.classList.add('show');
        }
    }

    hideRaisedHands() {
        /**
         * Скрывает выпадающее меню с поднятыми руками
         */
        const dropdown = document.getElementById('raisedHandsDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
}
