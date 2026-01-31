# ADR-002: Message Persistence Strategy

## Status
Accepted

## Date
2026-01-31

## Context
ChatFlow needs to persist chat messages for history, search, and compliance. We need a database strategy that handles high write throughput while supporting efficient queries for message history.

### Options Considered

1. **PostgreSQL**
   - Pros: ACID compliance, JSON support, full-text search, mature ecosystem
   - Cons: Horizontal scaling complexity, write performance at extreme scale

2. **MongoDB**
   - Pros: Flexible schema, horizontal scaling, good write performance
   - Cons: Eventually consistent, complex transactions, data integrity concerns

3. **Cassandra**
   - Pros: Excellent write throughput, linear scalability
   - Cons: Complex operations, limited query flexibility, eventual consistency

4. **Hybrid (Redis + PostgreSQL)**
   - Pros: Fast writes to Redis, durable storage in PostgreSQL
   - Cons: Complexity, potential data loss window

## Decision
We will use **PostgreSQL** as the primary message store with **Prisma ORM**.

## Rationale

1. **Data Integrity**: Chat messages are critical business data. ACID transactions ensure no message loss during failures.

2. **Query Flexibility**: PostgreSQL supports complex queries needed for:
   - Paginated message history (`WHERE room_id = X ORDER BY created_at DESC LIMIT 50`)
   - Full-text search within conversations
   - Aggregate queries for analytics

3. **JSON Support**: `JSONB` columns enable flexible message metadata and reactions without schema migrations.

4. **Prisma Integration**: Type-safe database access with excellent Next.js/TypeScript support.

5. **Scaling Strategy**:
   - Read replicas for history queries
   - Connection pooling with PgBouncer
   - Partitioning by room_id for large deployments

## Schema Design

```prisma
model Message {
  id        String   @id @default(cuid())
  content   String
  type      MessageType @default(TEXT)
  metadata  Json?

  roomId    String
  room      Room     @relation(fields: [roomId], references: [id])

  senderId  String
  sender    User     @relation(fields: [senderId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@index([roomId, createdAt(sort: Desc)])
  @@index([senderId])
}
```

## Write Optimization Strategy

1. **Batch Inserts**: Aggregate messages in Redis for 100ms windows, batch insert to PostgreSQL.

2. **Async Processing**: Message persistence is non-blocking; Socket.io delivers immediately while DB write happens async.

3. **Connection Pooling**: Prisma connection pool sized at `(num_cores * 2) + 1`.

## Consequences

### Positive
- Strong consistency guarantees
- Powerful query capabilities
- Type-safe database access with Prisma
- Proven scalability patterns

### Negative
- More complex horizontal scaling than NoSQL
- Requires careful index design
- Connection pool management needed

### Risks
- Write bottlenecks at very high scale (>100k messages/second)
- Mitigated by: Message batching, partitioning, read replicas

## References
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
