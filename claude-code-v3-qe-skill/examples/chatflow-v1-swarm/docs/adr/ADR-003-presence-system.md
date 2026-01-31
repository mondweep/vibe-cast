# ADR-003: Presence System Architecture

## Status
Accepted

## Date
2026-01-31

## Context
ChatFlow needs real-time presence features including online/offline status, typing indicators, and "last seen" timestamps. The system must handle:
- Instant status propagation to room members
- Handling of multiple connections per user (web + mobile)
- Graceful degradation on connection loss
- Efficient fan-out to potentially hundreds of room members

### Options Considered

1. **PostgreSQL Polling**
   - Pros: Simple, uses existing infrastructure
   - Cons: High latency, database load, not real-time

2. **Redis Pub/Sub**
   - Pros: Sub-millisecond latency, built-in pub/sub, TTL for status expiry
   - Cons: No persistence, requires Redis infrastructure

3. **Redis + Socket.io Adapter**
   - Pros: Horizontal scaling, room sync across servers
   - Cons: Additional complexity, Redis dependency

4. **Dedicated Presence Service (e.g., Pusher)**
   - Pros: Managed service, proven scale
   - Cons: Cost, external dependency, vendor lock-in

## Decision
We will use **Redis Pub/Sub** with the **Socket.io Redis Adapter** for presence management.

## Rationale

1. **Sub-millisecond Latency**: Redis pub/sub delivers presence updates in <1ms, critical for typing indicators.

2. **Horizontal Scaling**: Socket.io Redis adapter synchronizes events across multiple server instances, essential for production deployment.

3. **TTL-based Status**: Redis key expiration automatically marks users offline after connection timeout.

4. **Memory Efficiency**: Presence data is ephemeral - no need for disk persistence. Redis in-memory storage is ideal.

5. **Existing Infrastructure**: We already use Redis for session management, minimizing operational overhead.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Redis Cluster                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Presence Keys  │  │   Pub/Sub       │                  │
│  │  user:{id}:status│  │   Channels      │                  │
│  │  user:{id}:typing│  │                 │                  │
│  │  TTL: 30s       │  │ presence:room:* │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
           │                     │
           ▼                     ▼
    ┌──────────────┐      ┌──────────────┐
    │  Server 1    │◄────►│  Server 2    │
    │  Socket.io   │      │  Socket.io   │
    │  + Adapter   │      │  + Adapter   │
    └──────────────┘      └──────────────┘
           │                     │
           ▼                     ▼
    ┌──────────────┐      ┌──────────────┐
    │   Clients    │      │   Clients    │
    └──────────────┘      └──────────────┘
```

## Implementation Details

### Presence Key Structure
```
user:{userId}:status     = "online" | "away" | "offline"  TTL: 30s
user:{userId}:lastSeen   = timestamp                      TTL: 7d
user:{userId}:typing     = roomId                         TTL: 3s
room:{roomId}:members    = Set of userIds                 No TTL
```

### Status Update Flow
```typescript
// On connect
await redis.set(`user:${userId}:status`, 'online', 'EX', 30);
await redis.publish(`presence:room:${roomId}`, JSON.stringify({
  type: 'status',
  userId,
  status: 'online'
}));

// Heartbeat (every 15s)
await redis.expire(`user:${userId}:status`, 30);

// Typing indicator
await redis.set(`user:${userId}:typing`, roomId, 'EX', 3);
```

### Multi-Device Handling
- Each connection increments `user:{userId}:connections` counter
- User goes offline only when counter reaches 0
- Prevents false offline status during device switches

## Consequences

### Positive
- Real-time presence updates across all clients
- Automatic cleanup via TTL (no stale status)
- Scales horizontally with Socket.io adapter
- Typing indicators work seamlessly

### Negative
- Redis becomes a critical dependency
- Presence data lost on Redis restart (acceptable trade-off)
- Requires Redis cluster for high availability

### Risks
- Redis memory growth with many concurrent users
- Mitigated by: Key TTL, memory monitoring, eviction policies

## References
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Redis Pub/Sub](https://redis.io/topics/pubsub)
- [Building Presence Systems](https://engineering.linkedin.com/blog/2016/presence)
