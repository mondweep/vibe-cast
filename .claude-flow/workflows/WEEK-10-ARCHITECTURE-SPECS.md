# Week 10 Architecture Specifications - APPROVED

**Status:** UNBLOCKED - BEGIN IMPLEMENTATION PHASES 1-5  
**Date Issued:** 2026-06-02  
**Target:** developer-w10  
**Timeline:** Week 10 Implementation Sprint

---

## Executive Summary

Developer, you have successfully created the foundation layer. Proceed with implementation phases 1-5 using the specifications below. These specifications unblock the event-driven architecture core, enabling Learning → Certification → Community domain coordination.

---

## 1. IEventBus Interface

**Location:** `/src/shared/infrastructure/events/IEventBus.ts`

Extract an interface from EventBus with the following contract:

```typescript
interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string, 
    handler: EventHandler<T>
  ): string; // returns subscriptionId
  unsubscribe(subscriptionId: string): void;
  retry(dlqEventId: string): Promise<boolean>;
  getDeadLetterQueue(): DeadLetterEvent[];
  getDeadLetterQueueSize(): number;
  clearDeadLetterQueue(): void;
  getProcessedEventCount(): number;
  getSubscriptionCount(): number;
  isHealthy(): boolean;
}
```

**Rationale:** Allows InMemoryEventBus (Weeks 9-13) to swap with RabbitMQ (Week 14+) without breaking domain code. This is **critical for loose coupling**.

---

## 2. EventBus Full Implementation

### Core Features
- **Handler execution with try-catch isolation**: Failures → DLQ, do not crash other handlers
- **Event idempotency via eventId tracking**: Prevent duplicate handler execution
- **Structured logging with correlationId**: Enable distributed tracing across domains
- **Dead-Letter Queue (DLQ) with exponential backoff**: 1s, 2s, 4s, 8s delays (max 3 retries)
- **DLQRetryScheduler**: Polls every 5s, retries events where `retryCount < 3`

### Implementation Notes
- Each handler execution is wrapped in isolated try-catch
- On handler error: push event to DLQ with `retryCount++` and scheduled backoff delay
- Event deduplication: maintain in-memory Set of seen `eventId` values
- Correlation ID threads through all domain events for audit trail
- Health check (`isHealthy()`): true if DLQ size < threshold AND no scheduler errors

---

## 3. PostgreSQL SAGA Schema

**Location:** `/migrations/001_create_saga_state.sql`

Two tables must be created by developer-w10. Verify they match the following:

### Table: `saga_state`
```sql
CREATE TABLE saga_state (
  id UUID PRIMARY KEY,
  workflow_type VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
  -- Valid values: RUNNING, WAITING, COMPLETED, FAILED, COMPENSATED
  learner_id UUID NOT NULL,
  enrollment_id UUID NOT NULL,
  certification_id UUID,
  current_step VARCHAR(255) NOT NULL,
  saga_data JSONB NOT NULL DEFAULT '{}',
  correlation_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, -- Optimistic locking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saga_learner_id ON saga_state(learner_id);
CREATE INDEX idx_saga_status_running ON saga_state(status) WHERE status IN ('RUNNING', 'WAITING');
CREATE INDEX idx_saga_current_step ON saga_state(current_step);
CREATE INDEX idx_saga_correlation_id ON saga_state(correlation_id);
```

### Table: `saga_steps`
```sql
CREATE TABLE saga_steps (
  id UUID PRIMARY KEY,
  saga_id UUID NOT NULL REFERENCES saga_state(id),
  step_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  -- Valid values: PENDING, IN_PROGRESS, COMPLETED, FAILED
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  compensating_step VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saga_steps_saga_id ON saga_steps(saga_id);
CREATE INDEX idx_saga_steps_status ON saga_steps(status);
```

---

## 4. SAGA Orchestrator - CertificationOrchestrator

**Location:** `/src/certification/domain/orchestrators/CertificationOrchestrator.ts`

Implement an 8-step state machine for the Learning → Certification flow:

### State Machine Transitions

| Step | Name | Trigger | Action | Next Step |
|------|------|---------|--------|-----------|
| 1 | INIT | EnrollmentCompleted event | Validate input, create saga record | CREATE_CANDIDATE |
| 2 | CREATE_CANDIDATE | | Insert candidate_profile record | WAIT_FOR_EXAM |
| 3 | WAIT_FOR_EXAM | ExamCompleted event fires | Block until event arrival | VALIDATE_EXAM |
| 4 | VALIDATE_EXAM | | Check exam_score >= 70 | GRADE_EXAM or FAILED |
| 5 | GRADE_EXAM | | Persist final_score | ISSUE_BADGE_OR_REMEDIATE |
| 6 | ISSUE_BADGE_OR_REMEDIATE | | If grade >= 80 → issue badge, else schedule remediation | SCHEDULE_RENEWAL or REMEDIATION |
| 7 | SCHEDULE_RENEWAL | | Set next_renewal_date = now + 1 year | COMPLETE |
| 8 | COMPLETE | | Persist final state, publish BadgeIssued event | [END] |

### Resume Path (Critical for Reliability)

When `ExamCompleted` event fires:
1. Query `saga_state WHERE enrollment_id = $enrollmentId AND current_step = 'WAIT_FOR_EXAM'`
2. Deserialize `saga_data` from database record
3. Advance state machine to `VALIDATE_EXAM`
4. Persist with **optimistic lock** check on `version` column
5. Continue to step 5

### Compensation on Failure

On saga failure (any step):
1. Revoke badge (if issued)
2. Soft-delete candidate record
3. Publish `BadgeCertificationFailed` event for audit

---

## 5. ACL Adapter Pattern

**Location:** `/src/{domain}/infrastructure/acl/`

Implement 4 adapters. Each adapter maintains an in-memory `Set<eventId>` for idempotency.

### 5.1 LearningToCertificationACL
```typescript
// File: /src/learning/infrastructure/acl/LearningToCertificationACL.ts

subscribe(eventBus: IEventBus) {
  const seen = new Set<string>();
  eventBus.subscribe('EnrollmentCompleted', (event: EnrollmentCompleted) => {
    if (seen.has(event.getId())) return; // Idempotent
    seen.add(event.getId());
    
    const qualified = new CandidateQualified({
      enrollmentId: event.enrollmentId,
      learnerId: event.learnerId,
      correlationId: event.correlationId,
      causationId: event.getId()
    });
    eventBus.publish(qualified);
  });
}
```

**Flow:** `EnrollmentCompleted` → `CandidateQualified` (propagate correlationId, set causationId = source.getId())

### 5.2 CertificationToCommunityACL
```typescript
// File: /src/certification/infrastructure/acl/CertificationToCommunityACL.ts

subscribe(eventBus: IEventBus) {
  const seen = new Set<string>();
  eventBus.subscribe('BadgeIssued', (event: BadgeIssued) => {
    if (seen.has(event.getId())) return; // Idempotent
    seen.add(event.getId());
    
    const earned = new BadgeEarned({
      badgeId: event.badgeId,
      learnerId: event.learnerId,
      correlationId: event.correlationId,
      causationId: event.getId()
    });
    eventBus.publish(earned);
  });
}
```

**Flow:** `BadgeIssued` → `BadgeEarned`

### 5.3 SkillLabToCommunityACL
```typescript
// File: /src/skilllab/infrastructure/acl/SkillLabToCommunityACL.ts

subscribe(eventBus: IEventBus) {
  const seen = new Set<string>();
  eventBus.subscribe('ExerciseCompleted', (event: ExerciseCompleted) => {
    if (seen.has(event.getId())) return; // Idempotent
    seen.add(event.getId());
    
    const achieved = new SkillAchieved({
      skillId: event.skillId,
      learnerId: event.learnerId,
      correlationId: event.correlationId,
      causationId: event.getId()
    });
    eventBus.publish(achieved);
  });
}
```

**Flow:** `ExerciseCompleted` → `SkillAchieved`

### 5.4 MetricsACL
```typescript
// File: /src/metrics/infrastructure/acl/MetricsACL.ts

subscribe(eventBus: IEventBus) {
  const seen = new Set<string>();
  const allEventTypes = [
    'EnrollmentCompleted',
    'BadgeIssued',
    'ExerciseCompleted',
    'ExamCompleted'
  ];
  
  allEventTypes.forEach(eventType => {
    eventBus.subscribe(eventType, (event: DomainEvent) => {
      if (seen.has(event.getId())) return; // Idempotent
      seen.add(event.getId());
      
      const recorded = new MetricsRecorded({
        eventType: eventType,
        eventId: event.getId(),
        learnerId: event.learnerId,
        correlationId: event.correlationId,
        timestamp: new Date(),
        metadata: event.toPrimitives()
      });
      eventBus.publish(recorded);
    });
  });
}
```

**Flow:** All domain events → `MetricsRecorded`

---

## 6. Domain Service Event Publishing

Add `publishEventsFrom()` calls in the following services:

### 6.1 LearningService
```typescript
// After enrollment completion
publishEventsFrom(
  new EnrollmentCompleted({
    enrollmentId: enrollment.id,
    learnerId: enrollment.learnerId,
    pathId: enrollment.pathId,
    finalScore: enrollment.scorePercentage,
    completedAt: new Date().toISOString(),
    correlationId: generateCorrelationId()
  })
);
```

### 6.2 CertificationService
```typescript
// After exam grading
publishEventsFrom(
  new ExamCompleted({
    examId: exam.id,
    learnerId: exam.learnerId,
    enrollmentId: exam.enrollmentId,
    examScore: exam.score,
    completedAt: new Date().toISOString(),
    correlationId: exam.correlationId
  })
);

// After badge issuance
publishEventsFrom(
  new BadgeIssued({
    badgeId: badge.id,
    learnerId: badge.learnerId,
    certificationName: badge.certificationName,
    issuedAt: new Date().toISOString(),
    correlationId: badge.correlationId
  })
);
```

### 6.3 SkillLabService
```typescript
// After exercise completion
publishEventsFrom(
  new ExerciseCompleted({
    exerciseId: exercise.id,
    learnerId: exercise.learnerId,
    skillId: exercise.skillId,
    score: exercise.score,
    completedAt: new Date().toISOString(),
    correlationId: generateCorrelationId()
  })
);
```

### 6.4 CommunityService
```typescript
// ACL will publish BadgeEarned from BadgeIssued
// No direct publishing needed; adapter chain handles it
```

---

## 7. Event Contracts

### 7.1 Learning → Certification

**Event:** `EnrollmentCompleted`
```json
{
  "enrollmentId": "UUID",
  "learnerId": "UUID",
  "pathId": "UUID",
  "finalScore": "number (0-100)",
  "completedAt": "ISO8601 timestamp",
  "correlationId": "UUID",
  "causationId": "UUID"
}
```

### 7.2 Certification → Community

**Event:** `BadgeIssued`
```json
{
  "badgeId": "UUID",
  "learnerId": "UUID",
  "certificationName": "string",
  "issuedAt": "ISO8601 timestamp",
  "correlationId": "UUID",
  "causationId": "UUID"
}
```

**Event:** `ExamCompleted`
```json
{
  "examId": "UUID",
  "learnerId": "UUID",
  "enrollmentId": "UUID",
  "examScore": "number (0-100)",
  "completedAt": "ISO8601 timestamp",
  "correlationId": "UUID",
  "causationId": "UUID"
}
```

### 7.3 SkillLab → Community

**Event:** `ExerciseCompleted`
```json
{
  "exerciseId": "UUID",
  "learnerId": "UUID",
  "skillId": "UUID",
  "score": "number (0-100)",
  "completedAt": "ISO8601 timestamp",
  "correlationId": "UUID",
  "causationId": "UUID"
}
```

---

## Implementation Order

**Follow this sequence strictly:**

1. **Phase 1:** Create IEventBus interface
2. **Phase 2:** Enhance EventBus with full error handling (DLQ, retry scheduler, idempotency)
3. **Phase 3:** Implement CertificationOrchestrator (concrete SAGA)
4. **Phase 4:** Create 4 ACL adapters (Learning→Cert, Cert→Community, SkillLab→Community, Metrics)
5. **Phase 5:** Add `publishEventsFrom()` to domain services

**Commit after each logical unit** to maintain incremental progress tracking.

---

## Performance Requirements

- **Event propagation:** <2s (from COORDINATION.md)
- **Handler execution isolation:** No cascading failures
- **DLQ retry:** Asynchronous, non-blocking (scheduler runs independently)
- **Saga state persistence:** <500ms (P95 latency)
- **Idempotency checks:** <10ms (in-memory Set lookup)

---

## Success Criteria

- [ ] IEventBus interface compiles with zero breaking changes
- [ ] All 4 ACL adapters register successfully on EventBus
- [ ] CertificationOrchestrator completes 8-step flow end-to-end
- [ ] Dead-Letter Queue captures and retries failed events
- [ ] Idempotency prevents duplicate domain event processing
- [ ] Correlation ID threads through all published events
- [ ] All tests pass (unit + integration)

---

## Next Steps (Week 11+)

- **Week 11:** Event replay & event sourcing infrastructure
- **Week 12:** Query model synchronization from event stream
- **Week 13:** Integration tests for multi-domain workflows
- **Week 14:** RabbitMQ implementation (swap InMemoryEventBus)

---

**Status:** UNBLOCKED - BEGIN PHASE 1

**Questions?** Contact lead architect or refer to COORDINATION.md for domain interaction diagrams.

---

*Specification issued: 2026-06-02 | Approved for implementation*
