// VibeCast - Real-time Chat Application using PubNub
// Uses PubNub demo keys for quick testing

class VibeCastApp {
    constructor() {
        // PubNub Configuration with Demo Keys
        this.pubnub = null;
        this.currentChannel = null;
        this.currentUser = null;
        this.typingTimer = null;

        // DOM Elements
        this.joinScreen = document.getElementById('joinScreen');
        this.chatScreen = document.getElementById('chatScreen');
        this.usernameInput = document.getElementById('usernameInput');
        this.channelInput = document.getElementById('channelInput');
        this.joinButton = document.getElementById('joinButton');
        this.leaveButton = document.getElementById('leaveButton');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.messages = document.getElementById('messages');
        this.channelName = document.getElementById('channelName');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.userList = document.getElementById('userList');
        this.userCount = document.getElementById('userCount');
        this.typingIndicator = document.getElementById('typingIndicator');

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Join button
        this.joinButton.addEventListener('click', () => this.joinChat());

        // Enter key on join screen
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinChat();
        });
        this.channelInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinChat();
        });

        // Leave button
        this.leaveButton.addEventListener('click', () => this.leaveChat());

        // Send message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Typing indicator
        this.messageInput.addEventListener('input', () => this.handleTyping());
    }

    joinChat() {
        const username = this.usernameInput.value.trim();
        const channel = this.channelInput.value.trim();

        if (!username) {
            alert('Please enter your name');
            return;
        }

        if (!channel) {
            alert('Please enter a channel name');
            return;
        }

        this.currentUser = username;
        this.currentChannel = channel;

        // Initialize PubNub with Demo keys
        this.pubnub = new PubNub({
            publishKey: 'demo',
            subscribeKey: 'demo',
            uuid: username,
            heartbeatInterval: 30
        });

        // Set up listeners
        this.setupPubNubListeners();

        // Subscribe to channel
        this.pubnub.subscribe({
            channels: [channel],
            withPresence: true
        });

        // Show chat screen
        this.joinScreen.classList.add('hidden');
        this.chatScreen.classList.remove('hidden');
        this.channelName.textContent = `#${channel}`;
        this.connectionStatus.textContent = 'Connected';
        this.connectionStatus.classList.remove('connecting');
        this.connectionStatus.classList.add('connected');

        // Load message history
        this.loadHistory();

        // Get current presence
        this.updatePresence();

        this.messageInput.focus();
    }

    setupPubNubListeners() {
        this.pubnub.addListener({
            message: (event) => {
                if (event.message.type === 'typing') {
                    this.showTypingIndicator(event.publisher);
                } else {
                    this.displayMessage(event);
                }
            },
            presence: (event) => {
                this.handlePresenceEvent(event);
            },
            status: (event) => {
                if (event.category === 'PNConnectedCategory') {
                    this.connectionStatus.textContent = 'Connected';
                    this.connectionStatus.classList.remove('connecting');
                    this.connectionStatus.classList.add('connected');
                }
            }
        });
    }

    async loadHistory() {
        try {
            const response = await this.pubnub.fetchMessages({
                channels: [this.currentChannel],
                count: 25
            });

            if (response.channels[this.currentChannel]) {
                const messages = response.channels[this.currentChannel];
                messages.forEach(msg => {
                    this.displayMessage({
                        message: msg.message,
                        publisher: msg.uuid,
                        timetoken: msg.timetoken
                    }, true);
                });
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    async updatePresence() {
        try {
            const response = await this.pubnub.hereNow({
                channels: [this.currentChannel],
                includeUUIDs: true
            });

            const channelData = response.channels[this.currentChannel];
            if (channelData) {
                const occupants = channelData.occupants || [];
                this.updateUserList(occupants.map(o => o.uuid));
            }
        } catch (error) {
            console.error('Error fetching presence:', error);
        }
    }

    handlePresenceEvent(event) {
        const username = event.uuid;

        if (event.action === 'join') {
            this.addSystemMessage(`${username} joined the channel`);
        } else if (event.action === 'leave' || event.action === 'timeout') {
            this.addSystemMessage(`${username} left the channel`);
        }

        this.updatePresence();
    }

    updateUserList(users) {
        this.userList.innerHTML = '';
        this.userCount.textContent = users.length;

        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            if (user === this.currentUser) {
                li.textContent += ' (you)';
                li.style.fontWeight = '600';
            }
            this.userList.appendChild(li);
        });
    }

    sendMessage() {
        const text = this.messageInput.value.trim();

        if (!text) return;

        this.pubnub.publish({
            channel: this.currentChannel,
            message: {
                type: 'message',
                text: text,
                sender: this.currentUser,
                timestamp: Date.now()
            }
        });

        this.messageInput.value = '';
    }

    displayMessage(event, isHistory = false) {
        const msg = event.message;
        const sender = event.publisher || msg.sender;
        const text = msg.text;
        const timestamp = msg.timestamp || Math.floor(event.timetoken / 10000);

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';

        if (sender === this.currentUser) {
            messageDiv.classList.add('own');
        }

        const time = new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${sender}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${this.escapeHtml(text)}</div>
        `;

        this.messages.appendChild(messageDiv);

        if (!isHistory) {
            this.scrollToBottom();
        }
    }

    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = text;
        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    handleTyping() {
        clearTimeout(this.typingTimer);

        // Send typing signal
        this.pubnub.publish({
            channel: this.currentChannel,
            message: {
                type: 'typing',
                user: this.currentUser
            }
        });

        this.typingTimer = setTimeout(() => {
            // Typing stopped
        }, 1000);
    }

    showTypingIndicator(user) {
        if (user === this.currentUser) return;

        this.typingIndicator.querySelector('span').textContent = `${user} is typing`;
        this.typingIndicator.classList.remove('hidden');

        setTimeout(() => {
            this.typingIndicator.classList.add('hidden');
        }, 2000);
    }

    leaveChat() {
        if (this.pubnub) {
            this.pubnub.unsubscribe({
                channels: [this.currentChannel]
            });
            this.pubnub.stop();
        }

        this.chatScreen.classList.add('hidden');
        this.joinScreen.classList.remove('hidden');
        this.messages.innerHTML = '';
        this.messageInput.value = '';
        this.currentChannel = null;
        this.currentUser = null;
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new VibeCastApp();
});
