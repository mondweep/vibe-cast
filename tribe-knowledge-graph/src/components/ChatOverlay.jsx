
import React, { useState, useEffect, useRef } from 'react';
import './ChatOverlay.css';

const ChatOverlay = ({ pubnub, channel, onUsernameSet }) => {
    const [username, setUsername] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'people'
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!hasJoined) return;

        // 1. Subscribe to Presence & Chat
        const listener = {
            message: (event) => {
                if (event.message.type === 'chat') {
                    const newMsg = event.message.data;
                    setMessages(prev => {
                        // Prevent duplicates
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            },
            presence: (event) => {
                const { action, uuid } = event;
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    if (action === 'join' || action === 'state-change') {
                        newSet.add(uuid);
                    } else if (action === 'leave' || action === 'timeout') {
                        newSet.delete(uuid);
                    }
                    return newSet;
                });
            }
        };

        pubnub.addListener(listener);

        // 2. Get Current Online Users (Here Now)
        pubnub.hereNow({
            channels: [channel],
            includeUUIDs: true
        }).then((response) => {
            const occupants = response.channels[channel]?.occupants || [];
            const users = new Set(occupants.map(o => o.uuid));
            setOnlineUsers(users);
        });

        return () => {
            pubnub.removeListener(listener);
        };
    }, [hasJoined, pubnub, channel]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!username.trim()) return;

        pubnub.setUUID(username);
        setHasJoined(true);
        onUsernameSet(username);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const message = {
            id: Date.now().toString(), // Ensure string ID
            text: inputText,
            sender: username,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Optimistic Update: Show immediately
        setMessages(prev => [...prev, message]);

        pubnub.publish({
            channel: channel,
            message: {
                type: 'chat',
                data: message
            }
        });

        setInputText('');
    };

    if (!hasJoined) {
        return (
            <div className="chat-login-overlay">
                <div className="chat-login-box">
                    <h2>Join the Tribe</h2>
                    <p>Enter your name to collaborate</p>
                    <form onSubmit={handleJoin}>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                            className="chat-input-field"
                        />
                        <button type="submit" className="chat-action-btn">Join Session</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={`chat - container ${isOpen ? 'open' : 'closed'} `}>
            <div className="chat-header">
                <div className="chat-title" onClick={() => setIsOpen(!isOpen)}>
                    <span className="status-dot"></span>
                    Team Chat ({onlineUsers.size})
                </div>
                <div className="chat-controls">
                    <button
                        className={`tab - btn ${activeTab === 'chat' ? 'active' : ''} `}
                        onClick={() => { setActiveTab('chat'); setIsOpen(true); }}
                    >
                        Chat
                    </button>
                    <button
                        className={`tab - btn ${activeTab === 'people' ? 'active' : ''} `}
                        onClick={() => { setActiveTab('people'); setIsOpen(true); }}
                    >
                        People
                    </button>
                    <div className="chat-toggle" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? '▼' : '▲'}
                    </div>
                </div>
            </div>

            {isOpen && activeTab === 'chat' && (
                <>
                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <div className="empty-chat">No messages yet. Start the discussion!</div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.sender === username ? 'own' : ''} `}>
                                <div className="message-header">
                                    <span className="sender">{msg.sender}</span>
                                    <span className="time">{msg.time}</span>
                                </div>
                                <div className="message-body">{msg.text}</div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSend} className="chat-input-area">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="chat-input-field small"
                        />
                        <button type="submit" className="send-btn">➤</button>
                    </form>
                </>
            )}

            {isOpen && activeTab === 'people' && (
                <div className="people-list">
                    <h3>Active Participants</h3>
                    <ul>
                        {Array.from(onlineUsers).map(user => (
                            <li key={user} className={user === username ? 'me' : ''}>
                                <div className="avatar">{user.charAt(0).toUpperCase()}</div>
                                <span className="name">{user} {user === username && '(You)'}</span>
                                <span className="status">Online</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ChatOverlay;

