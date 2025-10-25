class VideoConference {
    constructor() {
        this.socket = null;
        this.userId = '';
        this.roomId = '';
        this.localStream = null;
        this.screenStream = null;
        this.peerConnections = new Map();
        this.videoElements = new Map();
        this.isChatOpen = false;
        this.roomUpdateInterval = null;
        this.isInRoom = false;

        // Медиа состояния
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.isScreenSharing = false;

        // Привязываем методы
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.joinRoom = this.joinRoom.bind(this);
        this.createRoom = this.createRoom.bind(this);
        this.leaveRoom = this.leaveRoom.bind(this);
        this.toggleVideo = this.toggleVideo.bind(this);
        this.toggleAudio = this.toggleAudio.bind(this);
        this.toggleScreenShare = this.toggleScreenShare.bind(this);
        this.sendChatMessage = this.sendChatMessage.bind(this);
        this.toggleChat = this.toggleChat.bind(this);
        this.loadExistingRooms = this.loadExistingRooms.bind(this);
        this.selectRoom = this.selectRoom.bind(this);
        this.autoJoinRoom = this.autoJoinRoom.bind(this);
    }

    connect() {
        this.userId = document.getElementById('userId').value.trim();
        if (!this.userId) {
            alert('Введите ваше имя');
            return;
        }

        this.socket = new WebSocket(`ws://localhost:8000/ws/${this.userId}`);

        this.socket.onopen = (event) => {
            this.updateConnectionStatus('connected', 'Подключено');
            document.getElementById('disconnectBtn').disabled = false;
            document.getElementById('roomSection').style.display = 'block';
            this.loadExistingRooms();

            // Обновляем список комнат каждые 5 секунд
            this.roomUpdateInterval = setInterval(() => {
                this.loadExistingRooms();
            }, 5000);
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.socket.onclose = (event) => {
            this.updateConnectionStatus('disconnected', 'Отключено');
            document.getElementById('disconnectBtn').disabled = true;
            this.cleanup();
            if (this.roomUpdateInterval) {
                clearInterval(this.roomUpdateInterval);
                this.roomUpdateInterval = null;
            }
        };

        this.socket.onerror = (error) => {
            console.error('Ошибка WebSocket:', error);
            this.updateConnectionStatus('disconnected', 'Ошибка');
        };
    }

    disconnect() {
        if (this.socket) {
            this.leaveRoom();
            this.socket.close();
        }
        this.cleanup();
        if (this.roomUpdateInterval) {
            clearInterval(this.roomUpdateInterval);
            this.roomUpdateInterval = null;
        }
    }

    async createRoom() {
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
        this.socket.send(JSON.stringify(createMessage));
    }

    async joinRoom() {
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
        this.socket.send(JSON.stringify(joinMessage));
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

    leaveRoom() {
        if (this.roomId && this.socket) {
            const leaveMessage = {
                type: 'leave_room',
                room_id: this.roomId
            };
            this.socket.send(JSON.stringify(leaveMessage));
        }
        this.cleanupRoom();
        this.isInRoom = false;
        // Показываем панель управления
        document.getElementById('controlPanel').style.display = 'block';
        // Скрываем ID комнаты
        document.getElementById('roomIdDisplay').style.display = 'none';
    }

    async getMediaStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Отображаем локальное видео
            this.addParticipantTile(this.userId, this.localStream, true);

        } catch (error) {
            console.error('Ошибка получения медиа потока:', error);
            throw error;
        }
    }

    handleMessage(data) {
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
        }
    }

    handleRoomCreationResponse(data) {
        if (data.success) {
            this.isInRoom = true;
            this.joinRoomInternal();
            this.displaySystemMessage('Комната создана успешно');
            // Скрываем панель управления
            document.getElementById('controlPanel').style.display = 'none';
            // Показываем ID комнаты
            this.showRoomId(data.room_id);
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
            // Скрываем панель управления
            document.getElementById('controlPanel').style.display = 'none';
            // Показываем ID комнаты
            this.showRoomId(data.room_id);
        } else {
            alert(data.message);
            this.displaySystemMessage(data.message);
        }
    }

    handleUserJoined(data) {
        console.log('User joined:', data);

        if (data.user_id === this.userId) {
            // Это мы присоединились
            this.updateRoomStatus('connected', `В комнате: ${data.participants.length}`);
            document.getElementById('mediaSection').style.display = 'grid';

            // Создаем соединения со всеми уже существующими участниками
            data.participants.forEach(participant => {
                if (participant !== this.userId) {
                    console.log('Creating connection with existing participant:', participant);
                    this.createPeerConnection(participant);
                }
            });
        } else {
            // Это другой участник присоединился
            this.updateRoomStatus('connected', `В комнате: ${data.participants.length}`);
            console.log('Creating connection with new participant:', data.user_id);
            this.createPeerConnection(data.user_id);
            this.displaySystemMessage(`${data.user_id} присоединился`);
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
                this.socket.send(JSON.stringify(candidateMessage));
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

        // Создаем offer если мы инициатор (для новых участников)
        if (this.userId < userId) {
            console.log('Creating offer to:', userId);
            setTimeout(() => {
                this.createOffer(userId, peerConnection);
            }, 100); // Небольшая задержка для стабильности
        }
    }

    async createOffer(userId, peerConnection) {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            const offerMessage = {
                type: 'offer',
                to: userId,
                sdp: offer
            };
            this.socket.send(JSON.stringify(offerMessage));
        } catch (error) {
            console.error('Ошибка создания offer:', error);
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

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            const answerMessage = {
                type: 'answer',
                to: data.from,
                sdp: answer
            };
            this.socket.send(JSON.stringify(answerMessage));
        } catch (error) {
            console.error('Ошибка обработки offer:', error);
        }
    }

    async handleAnswer(data) {
        console.log('Received answer from:', data.from);
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } catch (error) {
                console.error('Ошибка установки answer:', error);
            }
        }
    }

    async handleIceCandidate(data) {
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection && data.candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Ошибка добавления ICE кандидата:', error);
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

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = isLocal; // Мьютим локальное видео
        video.srcObject = stream;

        const nameTag = document.createElement('div');
        nameTag.className = 'participant-name';
        nameTag.textContent = isLocal ? `${userId} (вы)` : userId;

        tile.appendChild(video);
        tile.appendChild(nameTag);
        grid.appendChild(tile);

        this.videoElements.set(userId, tile);
    }

    removeParticipantTile(userId) {
        const tile = this.videoElements.get(userId);
        if (tile) {
            tile.remove();
            this.videoElements.delete(userId);
        }
    }

    removePeerConnection(userId) {
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(userId);
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
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

        // Возвращаем камеру
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            this.peerConnections.forEach((pc, userId) => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
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

        this.socket.send(JSON.stringify(chatMessage));
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

    selectRoom(roomId) {
        const roomIdInput = document.getElementById('roomId');
        if (roomIdInput) {
            roomIdInput.value = roomId;
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
        document.getElementById('controlPanel').style.display = 'block';
        document.getElementById('roomIdDisplay').style.display = 'none';

        // Очищаем список комнат
        const roomsList = document.getElementById('roomsList');
        if (roomsList) {
            roomsList.innerHTML = '';
        }
    }

    cleanupRoom() {
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

        this.roomId = '';
        this.updateRoomStatus('disconnected', 'Не в комнате');

        // Закрываем чат
        this.isChatOpen = false;
        const chatSidebar = document.getElementById('chatSidebar');
        chatSidebar.classList.remove('open');
    }
}
