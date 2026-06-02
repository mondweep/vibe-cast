# Event Infrastructure Module

Week 9 Deliverable: Foundation for event-driven architecture across Vibe-Cast domains

## Architecture Overview

The event infrastructure enables loose coupling between domains through event-driven patterns. Each domain publishes domain events describing what happened; other domains subscribe to relevant events and react asynchronously.

```
Domain A: Enrollment              Domain B: Metrics
┌─────────────────────┐           ┌──────────────────┐
│ Command: Enroll     │           │ Handler: Track   │
│ Event: Enrolled     │──────────>│ Metric Recorded  │
└─────────────────────┘           └──────────────────┘
        │
        │ EventPublisher
        ↓
    ┌─────────┐
    │ EventBus│
    └────┬────┘
         │
         ├─→ Domain B Handler
         ├─→ Domain C Handler
         └─→ Domain D Handler
```

## Core Components

### 1. DomainEvent (280 lines)

Abstract base class for all domain events. Provides:
- **Event ID**: Unique identifier for idempotency (UUID)
- **Aggregate ID**: Root aggregate that produced event (for event sourcing)
- **Event Type**: Name of event (e.g., "LearnerEnrolled")
- **Version**: Schema version for evolution (v1, v2, etc.)
- **Timestamp**: UTC datetime when event occurred
- **Metadata**: Correlation ID, user ID, audit trail info

**Key Methods:**
- `getAggregateId()` - Get aggregate root ID
- `getEventType()` - Get event type name
- `getDomain()` - Get source domain
- `toJSON()` - Serialize to JSON
- `fromJSON()` - Deserialize from JSON (subclass implementation)

**Example Usage:**
```typescript
class LearnerEnrolledEvent extends DomainEvent {
  readonly eventType = 'LearnerEnrolled';
  readonly version = 'v1';
  readonly domain = 'Learning';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    metadata: EventMetadata,
    readonly learnerId: string,
    readonly pathId: string,
  ) {
    super(aggregateId, aggregateVersion, metadata);
  }

  static fromJSON(json: any): LearnerEnrolledEvent {
    return new LearnerEnrolledEvent(
      json.aggregateId,
      json.aggregateVersion,
      json.metadata,
      json.learnerId,
      json.pathId,
    );
  }
}
```

### 2. EventBus (350 lines)

In-memory pub/sub event bus with dead-letter queue.

**Core Features:**
- **Publish/Subscribe**: Loose coupling between domains
- **Async Handlers**: All handlers execute concurrently
- **Error Isolation**: One failed handler doesn't block others
- **Dead-Letter Queue**: Failed events stored for manual inspection
- **Idempotency**: Duplicate events rejected via event ID tracking
- **Retry Policy**: Exponential backoff (1s, 2s, 4s, 8s, max 3 retries)

**Key Methods:**
- `subscribe(eventType, handler)` - Register event handler
- `unsubscribe(subscriptionId)` - Remove handler
- `publish(event)` - Publish event to all handlers
- `retry(dlqEventId)` - Retry failed event from DLQ
- `getDeadLetterQueue()` - Get all failed events
- `getDeadLetterQueueSize()` - Get DLQ size
- `isHealthy()` - Health check (DLQ not overflowing)

**Example Usage:**
```typescript
// Subscribe
const subId = eventBus.subscribe('LearnerEnrolled', async (event) => {
  await metricsService.recordEnrollment(event);
});

// Publish
const event = new LearnerEnrolledEvent(...);
await eventBus.publish(event);

// Retry failed event
await eventBus.retry(dlqEventId);

// Get metrics
const dlqSize = eventBus.getDeadLetterQueueSize();
const isHealthy = eventBus.isHealthy();
```

**Dead-Letter Queue Strategy:**

Failed events are stored in DLQ for manual inspection and replay (Week 12 feature).

```typescript
interface DeadLetterEvent {
  id: string;                    // DLQ event ID
  eventId: string;               // Original event ID
  event: DomainEvent;            // The failed event
  error: string;                 // Error message
  stack?: string;                // Stack trace
  failedAt: Date;                // When it failed
  retryCount: number;            // Retry attempts
  lastRetryAt?: Date;            // Last retry time
  nextRetryAt?: Date;            // Suggested next retry
}
```

**Retry Policy:**

Exponential backoff after handler failure:
- Attempt 1: Immediate
- Attempt 2: 1 second later
- Attempt 3: 2 seconds later
- Attempt 4: 4 seconds later
- After 3 retries, event stays in DLQ for manual review

### 3. EventPublisher (240 lines)

Service for publishing domain events from aggregates with transactional consistency.

**Core Responsibility:**
Ensures atomic relationship: if aggregate state is saved, events will publish.

**Transaction Pattern:**
```
1. Domain model executes command → modifies state, collects events
2. Application service calls repository.save(aggregate)
3. Repository saves aggregate state to database (in same transaction)
4. After commit succeeds, EventPublisher.publishEventsFrom(aggregate)
5. EventBus publishes events to subscribers
```

This guarantees: no orphaned events, no state without events.

**Key Methods:**
- `publishEventsFrom(aggregate, options)` - Publish aggregate's events
- `publishEvent(event, options)` - Publish single event
- `getEventBus()` - Get underlying EventBus instance

**Key Features:**
- Metadata enrichment (user ID, correlation ID, audit trail)
- Event ordering per aggregate (sequential)
- Idempotency (clearUnpublishedEvents prevents re-publication)
- Support for causation chains (command → events → more commands)

**Example Usage:**
```typescript
// In application service
class EnrollLearnerService {
  async execute(cmd: EnrollLearnerCommand): Promise<void> {
    // 1. Execute domain logic
    const enrollment = Enrollment.enrollLearner(cmd.learnerId, cmd.pathId);

    // 2. Save aggregate state (in transaction)
    await enrollmentRepository.save(enrollment);

    // 3. Publish events after state committed
    await eventPublisher.publishEventsFrom(enrollment, {
      userId: cmd.userId,
      correlationId: cmd.correlationId,
      ipAddress: cmd.ipAddress,
      causationId: cmd.id,
    });
  }
}
```

**Metadata Enrichment:**

Events are enriched with context before publishing:

```typescript
interface PublishOptions {
  userId?: string;              // User who triggered operation
  correlationId?: string;       // Trace related events
  ipAddress?: string;           // Audit: where request came from
  userAgent?: string;           // Audit: browser/client info
  causationId?: string;         // Command ID that caused events
}
```

## Week 9 vs Week 11 Design

### Week 9 (MVP - Current)

**EventBus:**
- In-memory queue (ephemeral)
- Single process only
- No persistence
- Good for: development, testing, single-server deployments

**Advantages:**
- Simple, fast, no external dependencies
- Suitable for MVP phase with <100 concurrent users

**Limitations:**
- Events lost on process crash
- No global ordering across domains
- No clustering/failover

### Week 11 (Production - Planned)

**EventBus Upgrade to RabbitMQ:**
- Durable message queue
- Multi-process support
- Global ordering per partition
- Dead-letter queue with automatic retry
- Clustering and failover

**Migration Path:**
- Swap `EventBus` implementation (keep same interface)
- No changes to domain event definitions
- No changes to application services

## Event Versioning Strategy

### v1 Namespace (Week 9)

All Week 9 events in v1 namespace:
- `LearnerEnrolledEvent` (v1)
- `CourseCompletedEvent` (v1)
- `CertificationIssuedEvent` (v1)

### Schema Evolution (Week 10+)

If event schema changes:
1. Create new version (v2)
2. Keep v1 handler for backward compatibility
3. Gradually migrate subscribers to v2
4. Deprecate v1 after all consumers updated

Example:
```typescript
// Week 10: Added "duration" field
class LearnerEnrolledEvent_v2 extends DomainEvent {
  readonly version = 'v2';
  readonly duration: number;  // New field
}

// Subscriber handles both versions
eventBus.subscribe('LearnerEnrolled', async (event) => {
  if (event.version === 'v1') {
    // Handle v1 (estimate duration)
  } else {
    // Handle v2 (use actual duration)
  }
});
```

## Testing Strategy (London School TDD)

All components use London School mocking:
- Mock EventBus when testing publishers
- Mock handlers when testing EventBus
- Mock aggregates when testing publishers

**Test Files:**
- `DomainEvent.test.ts` - Serialization, metadata, immutability
- `EventBus.test.ts` - Pub/sub, error handling, DLQ, retry logic
- `EventPublisher.test.ts` - Event enrichment, idempotency, ordering

**Coverage Target:** 80%+

## Monitoring & Observability

### Metrics
- `eventBus.getProcessedEventCount()` - Total events processed
- `eventBus.getSubscriptionCount()` - Active subscriptions
- `eventBus.getDeadLetterQueueSize()` - Failed events pending

### Health Checks
- `eventBus.isHealthy()` - DLQ not overflowing (< 1000 events)

### Logging
- Published events: `[EventPublisher] Published event: {type}`
- Handler failures: `[EventBus] Handler failed for {type}: {error}`
- DLQ additions: `[EventBus] Event added to DLQ: {type}`

## Common Patterns

### Pattern 1: Simple Event Handler

```typescript
// In domain service
eventBus.subscribe('CourseCompleted', async (event) => {
  if (shouldUnlockCertification(event.learnerId)) {
    await certificationService.createCandidate(event.learnerId);
  }
});
```

### Pattern 2: Cross-Domain Reaction

```typescript
// Learning domain publishes
class Enrollment {
  complete(): void {
    this.events.push(new EnrollmentCompletedEvent(...));
  }
}

// Certification domain reacts
eventBus.subscribe('EnrollmentCompleted', async (event) => {
  const candidate = CertificationCandidate.createFrom(event);
  await repository.save(candidate);
  await eventPublisher.publishEventsFrom(candidate);
});
```

### Pattern 3: Error Recovery

```typescript
// Manual retry (ops team, Week 12)
const dlqEvent = eventBus.getDeadLetterQueue()[0];
const success = await eventBus.retry(dlqEvent.id);
if (!success) {
  // Alert ops team for investigation
  logger.error(`Failed event still failing: ${dlqEvent.id}`);
}
```

## File Structure

```
src/shared/infrastructure/events/
├── DomainEvent.ts              (280 lines) - Abstract base event
├── EventBus.ts                 (350 lines) - Pub/sub + DLQ
├── EventPublisher.ts           (240 lines) - Domain event publication
├── index.ts                    (30 lines)  - Public API
├── __tests__/
│   ├── DomainEvent.test.ts     (200 lines) - Unit tests
│   ├── EventBus.test.ts        (300 lines) - Unit tests
│   └── EventPublisher.test.ts  (250 lines) - Unit tests
└── README.md                   (This file)
```

## Dependencies

- `uuid` - For generating event IDs and correlation IDs
- No external message broker (Week 9 in-memory)
- No database (Week 11 adds PostgreSQL event store)

## Constraints & Design Decisions

1. **No Ordering Across Domains**: Events from different aggregates may be delivered out of order
2. **At-Least-Once Delivery**: Event may be re-delivered; handlers must be idempotent
3. **No Transactions**: Each event publishes independently (no 2PC)
4. **Process-Local**: Week 9 only; Week 11 adds distributed support
5. **Handler Isolation**: One failed handler doesn't block others

## Integration Checklist

- [x] DomainEvent base class with version support
- [x] EventBus with pub/sub and DLQ
- [x] EventPublisher with metadata enrichment
- [x] Event idempotency via event ID tracking
- [x] Retry policy with exponential backoff
- [x] Comprehensive unit tests (London School)
- [x] README documentation
- [ ] Integration with PostgreSQL (Week 11)
- [ ] Integration with RabbitMQ (Week 11)
- [ ] Week 12 DLQ inspection tool
- [ ] Week 12 Event replay CLI

## Next Steps (Week 10)

1. Create domain-specific events (LearnerEnrolledEvent, CourseCompletedEvent, etc.)
2. Integrate EventPublisher into aggregate repositories
3. Add SAGA orchestrator for multi-domain workflows
4. Build event-driven SAGA for Skill Lab submission
