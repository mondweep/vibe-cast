# ChatFlow Domain Model

## Overview

ChatFlow follows Domain-Driven Design (DDD) principles with three bounded contexts that encapsulate distinct business capabilities.

## Bounded Contexts

```
┌────────────────────────────────────────────────────────────────────┐
│                        ChatFlow Domain                              │
├─────────────────────┬──────────────────────┬──────────────────────┤
│     Identity        │      Messaging       │      Presence        │
│                     │                      │                      │
│  - Authentication   │  - Chat Rooms        │  - Online Status     │
│  - User Profiles    │  - Messages          │  - Typing Indicators │
│  - OAuth Providers  │  - Room Membership   │  - Last Seen         │
│  - Sessions         │  - Message Reactions │  - Activity Tracking │
└─────────────────────┴──────────────────────┴──────────────────────┘
```

---

## 1. Identity Context

### Aggregates

#### User (Aggregate Root)
```typescript
interface User {
  id: UserId;                    // Value Object
  email: Email;                  // Value Object
  profile: UserProfile;          // Entity
  credentials: Credentials;      // Entity
  oauthConnections: OAuthConnection[]; // Entity[]
  createdAt: Date;
  updatedAt: Date;
}
```

#### Session
```typescript
interface Session {
  id: SessionId;
  userId: UserId;
  token: SessionToken;          // Value Object
  deviceInfo: DeviceInfo;       // Value Object
  expiresAt: Date;
  createdAt: Date;
}
```

### Entities

#### UserProfile
```typescript
interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string;
}
```

#### OAuthConnection
```typescript
interface OAuthConnection {
  provider: OAuthProvider;      // 'google' | 'github' | 'discord'
  providerId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}
```

### Value Objects

```typescript
// UserId - Immutable unique identifier
class UserId {
  constructor(private readonly value: string) {
    if (!value || value.length < 10) throw new InvalidUserIdError();
  }
  equals(other: UserId): boolean { return this.value === other.value; }
}

// Email - Validated email address
class Email {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) throw new InvalidEmailError();
  }
  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

### Domain Events
- `UserRegistered` - New user created
- `UserProfileUpdated` - Profile information changed
- `OAuthConnected` - External provider linked
- `SessionCreated` - User logged in
- `SessionRevoked` - User logged out

---

## 2. Messaging Context

### Aggregates

#### Room (Aggregate Root)
```typescript
interface Room {
  id: RoomId;                   // Value Object
  name: string;
  type: RoomType;               // 'direct' | 'group' | 'channel'
  settings: RoomSettings;       // Entity
  members: RoomMember[];        // Entity[]
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Message (Aggregate Root)
```typescript
interface Message {
  id: MessageId;                // Value Object
  roomId: RoomId;
  senderId: UserId;
  content: MessageContent;      // Value Object
  type: MessageType;            // 'text' | 'image' | 'file' | 'system'
  metadata: MessageMetadata;    // Value Object
  reactions: Reaction[];        // Entity[]
  threadId: MessageId | null;   // For threaded replies
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}
```

### Entities

#### RoomMember
```typescript
interface RoomMember {
  userId: UserId;
  role: MemberRole;             // 'owner' | 'admin' | 'member'
  nickname: string | null;
  joinedAt: Date;
  mutedUntil: Date | null;
}
```

#### RoomSettings
```typescript
interface RoomSettings {
  isPrivate: boolean;
  allowInvites: boolean;
  messageRetentionDays: number | null;
  slowModeSeconds: number;
}
```

#### Reaction
```typescript
interface Reaction {
  emoji: string;
  userId: UserId;
  createdAt: Date;
}
```

### Value Objects

```typescript
// MessageContent - Validated message text
class MessageContent {
  static MAX_LENGTH = 4000;

  constructor(private readonly value: string) {
    if (value.length > MessageContent.MAX_LENGTH) {
      throw new MessageTooLongError();
    }
  }

  get text(): string { return this.value; }
  get mentions(): UserId[] { /* extract @mentions */ }
  get links(): string[] { /* extract URLs */ }
}

// MessageMetadata - Optional message data
interface MessageMetadata {
  attachments?: Attachment[];
  embeds?: Embed[];
  replyTo?: MessageId;
}
```

### Domain Events
- `RoomCreated` - New room created
- `MemberJoined` - User joined room
- `MemberLeft` - User left room
- `MemberRoleChanged` - Role updated
- `MessageSent` - New message in room
- `MessageEdited` - Message content changed
- `MessageDeleted` - Message removed
- `ReactionAdded` - Emoji reaction added
- `ReactionRemoved` - Emoji reaction removed

---

## 3. Presence Context

### Aggregates

#### UserPresence (Aggregate Root)
```typescript
interface UserPresence {
  userId: UserId;
  status: PresenceStatus;       // Value Object
  connections: Connection[];    // Entity[]
  lastSeenAt: Date;
}
```

### Entities

#### Connection
```typescript
interface Connection {
  socketId: string;
  deviceType: DeviceType;       // 'web' | 'mobile' | 'desktop'
  connectedAt: Date;
  lastActivityAt: Date;
}
```

#### TypingIndicator
```typescript
interface TypingIndicator {
  userId: UserId;
  roomId: RoomId;
  startedAt: Date;
  expiresAt: Date;              // Auto-expires after 3s
}
```

### Value Objects

```typescript
// PresenceStatus - Online state
class PresenceStatus {
  static ONLINE = new PresenceStatus('online');
  static AWAY = new PresenceStatus('away');
  static DND = new PresenceStatus('dnd');
  static OFFLINE = new PresenceStatus('offline');

  constructor(private readonly value: string) {}

  toString(): string { return this.value; }
}
```

### Domain Events
- `UserConnected` - WebSocket connection established
- `UserDisconnected` - WebSocket connection closed
- `StatusChanged` - User changed their status
- `TypingStarted` - User began typing
- `TypingStopped` - User stopped typing
- `UserWentAway` - Inactivity timeout

---

## Context Mapping

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Identity   │◄───────►│  Messaging  │◄───────►│  Presence   │
│   Context   │  User   │   Context   │  Room   │   Context   │
└─────────────┘  Info   └─────────────┘ Members └─────────────┘
       │                       │                       │
       │                       │                       │
       ▼                       ▼                       ▼
  UserRegistered ────► Auto-join default rooms

  MemberJoined ◄──────────────────────► Track room presence

  UserConnected ────────────────────►  Broadcast to room members
```

### Integration Patterns

1. **Identity → Messaging**: Shared Kernel
   - `UserId` is shared between contexts
   - User profile info accessed via Anti-Corruption Layer

2. **Messaging → Presence**: Customer-Supplier
   - Messaging context subscribes to presence events
   - Shows online indicators in room member list

3. **Identity → Presence**: Conformist
   - Presence context uses Identity's user model
   - Session creation triggers presence tracking

---

## Domain Services

### Identity Services
- `AuthenticationService` - Login/logout/token refresh
- `RegistrationService` - User creation with validation
- `OAuthService` - External provider authentication

### Messaging Services
- `RoomService` - Room CRUD and membership
- `MessageService` - Send, edit, delete messages
- `SearchService` - Full-text message search

### Presence Services
- `PresenceService` - Status management
- `TypingService` - Typing indicator handling
- `ConnectionService` - WebSocket lifecycle

---

## Invariants

### Identity Invariants
- Email must be unique per user
- User must have at least one authentication method
- Session tokens must not exceed maximum per user

### Messaging Invariants
- Direct rooms must have exactly 2 members
- Room owner cannot be removed
- Message content cannot exceed 4000 characters
- Deleted messages cannot be edited

### Presence Invariants
- User is online if at least one connection exists
- Typing indicators expire after 3 seconds
- Status changes broadcast to all room members

---

## Event Flow Example

**Scenario**: User sends a message

```
1. Client sends message via WebSocket
                    │
                    ▼
2. MessageService validates content
   - Check user is room member
   - Validate message length
   - Sanitize content
                    │
                    ▼
3. Create Message aggregate
   - Generate MessageId
   - Set timestamps
   - Extract mentions/links
                    │
                    ▼
4. Persist to PostgreSQL
                    │
                    ▼
5. Emit MessageSent domain event
                    │
         ┌─────────┴─────────┐
         ▼                   ▼
6a. Socket.io broadcasts   6b. Presence context
    to room members            updates lastActivityAt
                    │
                    ▼
7. Update TypingIndicator (stop typing)
```
