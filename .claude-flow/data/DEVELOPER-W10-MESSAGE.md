# Message to developer-w10

**From:** Lead Architect  
**Date:** 2026-06-02  
**Subject:** Week 10 Architecture Specifications - UNBLOCKED

---

## Week 10 Architecture Specifications - APPROVED

Developer, you have successfully created the foundation layer. Proceed with implementation phases 1-5 using these specifications:

---

## Quick Summary

### What You're Building This Week
A complete event-driven architecture core that connects Learning → Certification → Community domains via SAGA orchestration and Anti-Corruption Layer (ACL) adapters.

### The 5 Implementation Phases

**Phase 1: IEventBus Interface**
- Extract interface from EventBus
- Key methods: `publish()`, `subscribe()`, `retry()`, `getDeadLetterQueue()`, etc.
- Purpose: Enable InMemoryEventBus (Weeks 9-13) → RabbitMQ (Week 14+) swap without breaking code

**Phase 2: EventBus Full Implementation**
- Handler isolation with try-catch (failures → Dead-Letter Queue, not crashes)
- Event idempotency via `eventId` tracking
- Dead-Letter Queue with exponential backoff: 1s, 2s, 4s, 8s (max 3 retries)
- DLQRetryScheduler polls every 5s
- Structured logging with correlationId for distributed tracing

**Phase 3: CertificationOrchestrator (SAGA)**
- 8-step state machine: INIT → CREATE_CANDIDATE → WAIT_FOR_EXAM → VALIDATE_EXAM → GRADE_EXAM → ISSUE_BADGE_OR_REMEDIATE → SCHEDULE_RENEWAL → COMPLETE
- Resume path: When ExamCompleted fires, query saga_state and advance state
- Compensation: Revoke badge + soft-delete candidate on failure
- Uses optimistic locking on saga_state.version

**Phase 4: 4 ACL Adapters**
- **LearningToCertificationACL:** EnrollmentCompleted → CandidateQualified
- **CertificationToCommunityACL:** BadgeIssued → BadgeEarned
- **SkillLabToCommunityACL:** ExerciseCompleted → SkillAchieved
- **MetricsACL:** All events → MetricsRecorded

Each adapter maintains in-memory Set<eventId> for idempotency.

**Phase 5: Domain Service Event Publishing**
- Add `publishEventsFrom()` calls to:
  - LearningService (publishes EnrollmentCompleted)
  - CertificationService (publishes BadgeIssued, ExamCompleted)
  - SkillLabService (publishes ExerciseCompleted)

---

## PostgreSQL Schema (You'll Create)

Two tables in `/migrations/001_create_saga_state.sql`:

**saga_state:**
- id, workflow_type, status (RUNNING|WAITING|COMPLETED|FAILED|COMPENSATED)
- learner_id, enrollment_id, certification_id, current_step
- saga_data (JSONB), correlation_id, version (optimistic lock)
- Indexes: learner_id, status (WHERE RUNNING/WAITING), current_step, correlation_id

**saga_steps:**
- id, saga_id (FK), step_name, status, result, error_message, retry_count, compensating_step
- Indexes: saga_id, status

---

## Event Contracts You'll Implement

**Learning → Certification:**
```
EnrollmentCompleted {
  enrollmentId, learnerId, pathId, finalScore, completedAt, correlationId, causationId
}
```

**Certification → Community:**
```
BadgeIssued {
  badgeId, learnerId, certificationName, issuedAt, correlationId, causationId
}

ExamCompleted {
  examId, learnerId, enrollmentId, examScore, completedAt, correlationId, causationId
}
```

**SkillLab → Community:**
```
ExerciseCompleted {
  exerciseId, learnerId, skillId, score, completedAt, correlationId, causationId
}
```

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| IEventBus interface | Loose coupling from specific transport (in-memory → RabbitMQ) |
| Dead-Letter Queue | Resilience: failed events retry asynchronously, don't crash system |
| Idempotent adapters | At-least-once delivery becomes exactly-once semantics |
| SAGA with resume path | Handles failure recovery without losing state |
| Optimistic locking | Prevents concurrent saga updates from conflicting |
| correlationId threading | Enables distributed tracing across 3+ domains |

---

## Performance Requirements

- Event propagation: <2s
- Handler execution isolation: No cascading failures
- DLQ retry: Asynchronous, non-blocking
- Saga persistence: <500ms (P95)
- Idempotency: <10ms (in-memory Set lookup)

---

## Full Specification Document

For detailed implementation guidance (code samples, SQL, type signatures), see:
```
/home/user/vibe-cast/.claude-flow/workflows/WEEK-10-ARCHITECTURE-SPECS.md
```

---

## Implementation Checklist

- [ ] Phase 1: IEventBus interface created
- [ ] Phase 2: EventBus enhanced with DLQ + retry
- [ ] Phase 3: CertificationOrchestrator 8-step flow implemented
- [ ] Phase 4: 4 ACL adapters registered
- [ ] Phase 5: Domain services publishing events
- [ ] PostgreSQL schema created (saga_state + saga_steps tables)
- [ ] All event contracts implemented
- [ ] Unit + integration tests pass
- [ ] Correlation IDs thread through all events
- [ ] Dead-Letter Queue captures + retries failed events

---

## Success Criteria

✅ IEventBus interface compiles with zero breaking changes  
✅ All 4 ACL adapters register successfully  
✅ CertificationOrchestrator completes 8-step flow end-to-end  
✅ DLQ captures and retries failed events  
✅ Idempotency prevents duplicate processing  
✅ Correlation ID threads through all events  
✅ All tests pass (unit + integration)

---

## Next Week (Week 11+)

- Week 11: Event replay & event sourcing
- Week 12: Query model synchronization
- Week 13: Multi-domain integration tests
- Week 14: RabbitMQ implementation

---

## Status: UNBLOCKED - BEGIN PHASE 1

You have all the specifications needed to proceed. Commit after each phase for incremental progress tracking.

**Questions?** Refer to the full spec document or reach out to the lead architect.

---

*Issued: 2026-06-02 | Architecture Approved*
