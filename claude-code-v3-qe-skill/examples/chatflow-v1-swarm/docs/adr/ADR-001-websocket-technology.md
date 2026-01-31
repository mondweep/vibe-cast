# ADR-001: WebSocket Technology Selection

## Status
Accepted

## Date
2026-01-31

## Context
ChatFlow requires real-time bidirectional communication for instant messaging, presence updates, and typing indicators. We need to choose between native WebSocket implementation and Socket.io library.

### Options Considered

1. **Native WebSocket API**
   - Pros: No dependencies, full control, smaller bundle size
   - Cons: Manual reconnection logic, no fallbacks, complex room management

2. **Socket.io**
   - Pros: Auto-reconnection, room/namespace support, fallback transports, built-in acknowledgments
   - Cons: Larger bundle, proprietary protocol, requires Socket.io server

3. **ws (npm package)**
   - Pros: Lightweight, standards-compliant
   - Cons: Node.js only, no browser support, manual features

## Decision
We will use **Socket.io** for WebSocket communication.

## Rationale

1. **Built-in Room Management**: Socket.io provides native support for rooms which maps directly to our chat room domain concept.

2. **Automatic Reconnection**: Critical for mobile users and unstable connections. Socket.io handles reconnection with exponential backoff automatically.

3. **Acknowledgment System**: Socket.io's callback acknowledgments allow us to confirm message delivery, essential for message reliability.

4. **Namespace Support**: We can isolate different bounded contexts (messaging, presence) into separate namespaces for better organization.

5. **Fallback Transports**: HTTP long-polling fallback ensures connectivity even when WebSockets are blocked by firewalls.

6. **Next.js Integration**: Socket.io works well with Next.js API routes and can share the HTTP server.

## Implementation Details

```typescript
// Server-side namespace structure
io.of('/messaging')  // Message events
io.of('/presence')   // Online status, typing indicators

// Room naming convention
`room:${roomId}`     // Chat room
`user:${userId}`     // Personal notifications
```

## Consequences

### Positive
- Reduced development time for real-time features
- Better reliability on poor network conditions
- Clean abstraction for room-based messaging

### Negative
- ~45KB additional bundle size (gzipped)
- Requires Socket.io-specific client library
- Cannot use raw WebSocket clients without adapters

### Risks
- Socket.io protocol updates may require client/server version sync
- Mitigated by: Pinning versions, testing upgrades in staging

## References
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Next.js WebSocket Integration](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)
