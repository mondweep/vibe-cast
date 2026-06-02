# ADR-009: EventBus Design — In-Memory for Week 9, RabbitMQ for Production

**Status:** ACCEPTED (2026-06-02)  
**Context:** Week 9 foundation; Phase 2 infrastructure  
**Deciders:** Architecture team, Platform lead  

---

## Problem

Vibe-Cast domains (Learning, Certification, Skill Lab, Community, Metrics) must communicate asynchronously without tight coupling. The system needs:

1. **Fast iteration** for Week 9 (development/testing phase)
2. **Production scalability** by Week 15 (100+ concurrent events/second)
3. **Event ordering** within domain partitions (Kafka-like)
4. **Reliability** (no lost events, at-least-once delivery)
5. **Observability** (trace events end-to-end)

**Constraints:**
- Week 9: single-machine, no external dependencies
- Week 10-14: upgrade path to RabbitMQ/Kafka without code changes
- Contract: Interface-driven, swap implementations

---

## Decision

Implement a **tiered EventBus architecture**:

### Week 9 (Development)
```
┌─────────────────────────────────────────┐
│    In-Memory EventBus (TypeScript)      │
│  - Fast startup, zero infrastructure    │
│  - Single-process, multi-threaded       │
│  - Event log persisted to SQLite        │
│  - Full MADR event API                  │
└─────────────────────────────────────────┘
```

**Implementation:**
```typescript
// src/infrastructure/event-bus/InMemoryEventBus.ts
interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: Handler): void;
  getEventLog(filters?: EventFilter): Promise<DomainEvent[]>;
}

class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Handler[]> = new Map();
  private eventLog: DomainEvent[] = [];
  private eventStore: SQLiteEventStore; // Persist for recovery
  
  async publish(event: DomainEvent): Promise<void> {
    // 1. Persist to SQLite event store (transactional)
    await this.eventStore.append(event);
    
    // 2. Emit to in-memory subscribers (synchronous)
    const eventHandlers = this.handlers.get(event.type) || [];
    for (const handler of eventHandlers) {
      try {
        await handler(event); // Sequential, ordered
      } catch (err) {
        // Log but don't throw (error handler responsibility)
        this.logger.error('Handler failed', { event, err });
      }
    }
    
    // 3. Store in event log (for replay, auditing)
    this.eventLog.push(event);
  }
  
  subscribe(eventType: string, handler: Handler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
}
```

### Week 10-14 (Production Migration)
```
┌─────────────────────────────────────────┐
│   RabbitMQ EventBus (Drop-in Swap)      │
│  - Distributed queues per domain        │
│  - Durable, replicated, ordered         │
│  - Circuit breaker + dead letter queue  │
│  - Same interface as InMemory           │
└─────────────────────────────────────────┘
```

**Migration Path:**
1. Implement `RabbitMQEventBus` (same `EventBus` interface)
2. Add feature flag: `USE_RABBITMQ=true` in config
3. Week 11: Parallel testing (both implementations)
4. Week 12: Cutover to RabbitMQ
5. Week 13: Monitor for issues
6. Week 14: Decommission in-memory bus (keep code)

**RabbitMQ Config:**
```typescript
interface RabbitMQEventBus extends EventBus {
  config: {
    exchange: 'vibe-cast-events',
    exchangeType: 'topic',  // topic routing
    routingKey: 'domain.event.v1',
    durableQueue: true,
    deadLetterQueue: 'vibe-cast-events-dlq',
    maxRetries: 3,
    retryBackoffMs: 1000
  };
}

// Routing examples:
// learning.enrollment.created → learning-service
// certification.exam.passed → community-service, metrics-service
// metrics.snapshot.computed → dashboard, alerts
```

---

## Event Schema (Unified Across Both Implementations)

```typescript
interface DomainEvent {
  id: UUID;                          // Unique event ID
  type: string;                      // e.g., "LearnerEnrolled"
  version: string;                   // e.g., "v1", "v2" for versioning
  aggregateId: UUID;                 // Root aggregate (e.g., enrollmentId)
  aggregateType: string;             // e.g., "Enrollment"
  boundedContext: string;            // e.g., "Learning"
  timestamp: DateTime;               // When event occurred (immutable)
  occurredAt?: DateTime;             // Optional alternative timestamp
  correlationId: UUID;               // Link related events across domains
  causationId?: UUID;                // Event that caused this one
  userId?: UUID;                     // Actor (learner, instructor)
  metadata: Record<string, any>;     // Domain-specific data
  
  // Data payload (example for LearnerEnrolled)
  data: {
    enrollmentId: UUID;
    learnerId: UUID;
    pathId: UUID;
    enrolledAt: DateTime;
  };
}

// Storage format (SQLite for Week 9)
interface StoredEvent {
  id: UUID;
  eventJson: string;                 // JSON serialized event
  eventType: string;                 // Indexed for queries
  boundedContext: string;            // Indexed
  aggregateId: UUID;                 // Indexed
  sequenceNumber: BigInt;            // Global ordering
  timestamp: DateTime;               // Indexed
}
```

---

## Event Partitioning Strategy

**By Bounded Context** (not domain event type):

```yaml
Partition 1: Learning Context
  Events: LearnerEnrolled, CourseCompleted, EnrollmentCompleted
  Handlers: Certification (ACL), Community (ACL), Metrics
  Order guarantee: Per-enrollmentId (sequential)
  
Partition 2: Certification Context
  Events: ExamScheduled, ExamCompleted, ExamPassed, BadgeIssued
  Handlers: Community, Metrics, Email Service
  Order guarantee: Per-candidateId (sequential)
  
Partition 3: Skill Lab Context
  Events: LabSessionStarted, SolutionSubmitted, ChallengeCompleted
  Handlers: Community, Metrics
  Order guarantee: Per-sessionId (sequential)
  
Partition 4: Community Context
  Events: BadgeEarned, ContributionCreated, ReputationEarned
  Handlers: Metrics, Notifications
  Order guarantee: Per-learnerId (sequential)
  
Partition 5: Metrics Context (Event Sink)
  Events: MetricsComputed, AnomalyDetected, KPIBreached
  Handlers: Dashboards, Alerts
  Order guarantee: Global ordering (timestamp)
```

**Why by context, not event type?**
- Reduces partition count (5 vs 30)
- Simpler consumer group management
- Natural retry semantics (domain owns failures)
- Easier schema versioning per context

---

## Event Handlers (Idempotency)

All handlers must be **idempotent**. Week 9 in-memory bus can deliver same event twice if system crashes during handler execution.

```typescript
// WRONG: Not idempotent
async function onBadgeIssued(event: BadgeIssuedEvent) {
  const profile = await profileRepo.findById(event.learnerId);
  profile.badges.push(event.badge);
  await profileRepo.save(profile); // If system crashes here, badge saved but event not marked as processed
}

// RIGHT: Idempotent (check if already processed)
async function onBadgeIssued(event: BadgeIssuedEvent) {
  const profile = await profileRepo.findById(event.learnerId);
  if (profile.badges.some(b => b.id === event.badge.id)) {
    return; // Already processed, skip
  }
  profile.badges.push(event.badge);
  profile.lastBadgeEventId = event.id; // Track processed event
  await profileRepo.save(profile);
}

// Or use idempotency key pattern
async function onBadgeIssued(event: BadgeIssuedEvent) {
  const key = `badge-issued-${event.id}`;
  const processed = await cache.get(key);
  if (processed) return;
  
  // Process...
  await addBadge(event.learnerId, event.badge);
  
  // Mark as processed (with TTL)
  await cache.set(key, true, { ttl: 3600 }); // 1 hour
}
```

---

## Observability & Debugging

**Event Tracing:**
```typescript
// Every event has correlationId for end-to-end tracing
const enrollmentEvent = DomainEvent.create({
  type: 'LearnerEnrolled',
  data: { learnerId, pathId, enrolledAt },
  correlationId: generateUUID(), // Unique per enrollment flow
  // → All downstream events (ExamScheduled, BadgeIssued, etc.)
  //   inherit same correlationId
});

// Query related events
const relatedEvents = await eventBus.getEventLog({
  correlationId: enrollmentEvent.correlationId
});
// Result: [LearnerEnrolled, CandidateQualified, ExamScheduled, ExamPassed, BadgeIssued]
```

**Event Log Queries (SQLite):**
```sql
-- Find all events for a learner (audit trail)
SELECT * FROM events 
WHERE aggregate_type = 'Learner' 
  AND aggregate_id = ?
  AND timestamp > ?
ORDER BY timestamp ASC;

-- Find unprocessed events (crash recovery)
SELECT * FROM events
WHERE processed = false
  AND timestamp < NOW() - INTERVAL '5 minutes'
ORDER BY timestamp ASC;

-- Find events by context (slow debug query)
SELECT COUNT(*), event_type
FROM events
WHERE bounded_context = 'Learning'
  AND timestamp > ?
GROUP BY event_type;
```

---

## Failure Modes & Recovery

### Week 9 (In-Memory)
| Scenario | Recovery |
|----------|----------|
| Handler throws exception | Log error, continue to next handler (fail-open) |
| System crashes during handler | Event marked unprocessed in SQLite, replay on startup |
| Database fails | Event stored in memory log, retry when DB back |
| Handler slow (>5s) | Log warning, but wait (no timeout) |

### Week 14 (RabbitMQ)
| Scenario | Recovery |
|----------|----------|
| Handler throws exception | Nack message, requeue with exponential backoff |
| RabbitMQ down | Producer times out, circuit breaker trips, manual recovery |
| Handler too slow | Consumer timeout, message returned to queue |
| Poison pill (malformed event) | Dead letter queue, manual inspection |

---

## Configuration

**Week 9 (.env):**
```bash
EVENT_BUS_TYPE=in-memory
EVENT_STORE_DB=sqlite:///./data/events.db
EVENT_LOG_RETENTION_DAYS=7
EVENT_HANDLER_TIMEOUT_MS=30000
ENABLE_EVENT_TRACING=true
```

**Week 14 (.env upgrade):**
```bash
EVENT_BUS_TYPE=rabbitmq
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_VHOST=/vibe-cast
EVENT_LOG_RETENTION_DAYS=90
EVENT_HANDLER_TIMEOUT_MS=10000
ENABLE_DEAD_LETTER_QUEUE=true
DEAD_LETTER_EXCHANGE=vibe-cast-events-dlq
```

---

## Consequences

### Positive
✅ **Decoupling:** Domains don't call each other directly; events bridge them  
✅ **Extensibility:** Add handlers without modifying publishers  
✅ **Testability:** Mock event bus for unit tests  
✅ **Observability:** Full event audit trail for debugging  
✅ **Gradual migration:** Week 9 → Week 14 without rewriting code  

### Tradeoffs
⚠️ **Week 9 single-machine:** Events not replicated; system crash loses in-flight events  
⚠️ **Eventual consistency:** Handlers run asynchronously; dashboard data lags 1-2 seconds  
⚠️ **Handler dependency:** If handler slow, downstream delayed (mitigated by RabbitMQ async)  
⚠️ **Schema versioning:** Event format changes require migration strategy  

---

## Alternatives Considered

### 1. Direct Service Calls (REST/gRPC)
**Rejected:** Tight coupling between domains; hard to add new consumers  
Example failure: If Metrics service added later, Learning service code must change

### 2. Kafka from Day 1
**Rejected:** Too complex for Week 9 development; requires Zookeeper, cluster setup  
Cost: $50+/month for managed Kafka  
Benefit: Not needed until Week 15 (100+ events/sec)

### 3. GraphQL Subscriptions (WebSocket)
**Rejected:** Push-only, no durability; learner disconnects = lost events  
Use case: Real-time UI updates (separate concern; use WebSocket bridge layer)

### 4. Polling Pattern (Learning periodically queries Metrics)
**Rejected:** High latency, high database load  
Latency: Minutes vs. milliseconds  
Cost: 10x more database queries

---

## Implementation Checklist (Week 9)

- [ ] Create `src/infrastructure/event-bus/` directory
- [ ] Implement `EventBus` interface (abstract contract)
- [ ] Implement `InMemoryEventBus` class
- [ ] Implement `SQLiteEventStore` for persistence
- [ ] Create `DomainEvent` base class (all domains extend)
- [ ] Add event publishing to all aggregate roots
  - [ ] Enrollment.enroll() → LearnerEnrolled event
  - [ ] Enrollment.completeCourse() → CourseCompleted event
  - [ ] (same for Certification, Lab, Community domains)
- [ ] Create ACL adapters (Certification, Community listen to Learning)
- [ ] Write integration tests (cross-domain event flows)
- [ ] Add event tracing to request context (correlationId)
- [ ] Create event log viewer (debug dashboard)
- [ ] Document event schema (docs/EVENT_SCHEMA.md)

**Testing Strategy:**
```typescript
// src/tests/integration/EventFlow.spec.ts
describe('Event Flow: Learning → Certification', () => {
  it('EnrollmentCompleted → CertificationCandidate created', async () => {
    // 1. Learner completes path
    const enrollment = new Enrollment(learnerId, pathId);
    enrollment.completeCourse(score = 95);
    
    // 2. Event published
    await eventBus.publish(enrollment.getUncommittedEvents()[0]);
    
    // 3. Certification service (ACL) processes event
    await wait(100); // Handler is async
    
    // 4. Assert: CertificationCandidate created
    const candidate = await certRepo.findByLearnerId(learnerId);
    expect(candidate).toBeDefined();
    expect(candidate.qualifiedAt).toBeDefined();
  });
});
```

---

## Related Decisions
- **ADR-010:** SAGA orchestration (uses EventBus)
- **ADR-011:** CQRS read models (consume events)
- **ADR-003:** Domain event sourcing (relies on EventBus)

---

**Approved by:** Architecture Lead  
**Date:** 2026-06-02  
**Review date:** 2026-08-02 (before Week 14 RabbitMQ migration)
