# 🎙️ VibeCast - Real-time Chat Demo

A real-time chat application powered by PubNub, demonstrating key features of the PubNub platform including messaging, presence, and message history.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery across all connected clients
- **User Presence**: See who's online in real-time
- **Message History**: Load previous messages when joining a channel
- **Typing Indicators**: See when other users are typing
- **Multiple Channels**: Create or join different chat channels
- **Clean UI**: Modern, responsive interface with smooth animations

## 🎯 Demo Keys

This application uses PubNub's demo keys for quick testing:
- **Publish Key**: `demo`
- **Subscribe Key**: `demo`

**Note**: Demo keys are shared across all PubNub demos worldwide. For production use, create your own keys at [PubNub Admin Portal](https://admin.pubnub.com/).

## 🏃 How to Run

### Option 1: Direct Browser Access
Simply open `index.html` in your web browser. No build process or server required!

### Option 2: Local Server
For a more production-like environment:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (install http-server first)
npx http-server -p 8000
```

Then navigate to `http://localhost:8000`

## 📖 How to Use

1. **Enter Your Name**: Type your display name in the first field
2. **Choose a Channel**: Enter a channel name (default: `demo-channel`)
3. **Click "Join Chat"**: Connect to the channel
4. **Start Chatting**: Send messages and see others in real-time
5. **View Presence**: Check the sidebar to see who's online
6. **Multiple Users**: Open multiple browser tabs/windows to simulate multiple users

## 🎪 Demo Ideas for Your Team

### 1. Multi-User Testing
- Open 3-4 browser tabs with different names
- Show real-time synchronization across all instances
- Demonstrate typing indicators

### 2. Message History
- Send several messages
- Refresh the page or open a new tab
- Join the same channel to see message history

### 3. Presence Features
- Join with multiple users
- Watch the online user list update in real-time
- Leave and see the user list update

### 4. Channel Switching
- Create different channels (e.g., "team-frontend", "team-backend")
- Show how channels are isolated
- Demonstrate multi-room chat capability

## 🔧 Technical Details

### PubNub Features Demonstrated

1. **Pub/Sub Messaging**
   ```javascript
   pubnub.publish({
       channel: 'demo-channel',
       message: { text: 'Hello World' }
   });
   ```

2. **Real-time Presence**
   ```javascript
   pubnub.subscribe({
       channels: ['demo-channel'],
       withPresence: true
   });
   ```

3. **Message History**
   ```javascript
   pubnub.fetchMessages({
       channels: ['demo-channel'],
       count: 25
   });
   ```

4. **Typing Signals**
   - Uses publish to send typing events
   - Lightweight, ephemeral messaging

### Architecture
- **Frontend Only**: Pure HTML/CSS/JavaScript
- **No Backend Required**: All logic runs in the browser
- **CDN-hosted PubNub SDK**: No npm dependencies
- **Responsive Design**: Works on desktop and mobile

## 🌟 Use Cases

This demo showcases PubNub's capabilities for:
- Team chat applications
- Customer support systems
- Live event discussions
- Collaborative workspaces
- Gaming chat
- IoT device communication
- Real-time notifications

## 📚 Learn More

- [PubNub Documentation](https://www.pubnub.com/docs/)
- [JavaScript SDK Guide](https://www.pubnub.com/docs/sdks/javascript)
- [Get Your Own Keys](https://admin.pubnub.com/)

## 🔐 Security Note

The demo keys used in this application are public and shared. For production applications:
1. Create your own PubNub account
2. Generate unique publish/subscribe keys
3. Implement Access Manager for authentication
4. Enable message encryption if needed

## 💡 Next Steps

To build on this demo:
- Add user authentication
- Implement message reactions
- Add file sharing capabilities
- Create private/group chats
- Add push notifications
- Implement message search
- Add moderation features

---

Built with ❤️ using [PubNub](https://www.pubnub.com/)
