# Week 10 Integration Tests

## Status: WAITING FOR DEVELOPER-W10 IMPLEMENTATION

Test Lead (you) is ready to write integration tests once developer-w10 agent completes implementation.

### Test Plan Overview

#### Test Suite 1: Learning → Certification Flow
- **File**: `learning-certification.spec.ts`
- **Coverage**: EnrollmentCompleted event triggers CandidateQualified event
- **London School TDD**: Mock UserRepository, CertificationService
- **Verify**: 
  - correlationId propagation across domains
  - Event causality chain
  - Handler invocation order
  - Latency < 2s threshold

#### Test Suite 2: Certification SAGA
- **File**: `certification-saga.spec.ts`
- **Coverage**: ExamCompleted event resumes WAIT_FOR_EXAM step
- **London School TDD**: Mock SAGAOrchestrator, ExamService, StateManager
- **Verify**:
  - State transition correctness
  - Event ordering within SAGA
  - Idempotent resumption
  - Latency < 2s threshold

#### Test Suite 3: Cross-Domain Events
- **File**: `cross-domain-events.spec.ts`
- **Coverage**: Badge event published → Community.onBadgeIssued fires
- **London School TDD**: Mock EventBus, BadgeService, CommunityService
- **Verify**:
  - Inter-domain event propagation
  - causationId chaining
  - Handler subscription resolution
  - Latency < 2s threshold

#### Test Suite 4: Event Idempotency & DLQ
- **File**: `event-idempotency.spec.ts`
- **Coverage**: 
  - Failed handler → exponential backoff → retry → success
  - Concurrent event handling
  - Late-arriving events
  - Idempotency key validation
- **London School TDD**: Mock DLQHandler, RetryPolicy, IdempotencyStore
- **Verify**:
  - No duplicate side-effects
  - Retry backoff exponentially increases
  - Events processed once even if duplicated
  - Latency threshold violations trigger alerts

### Waiting For

```
developer-w10
  ↓
  SendMessage → Implementation Summary
    - Domain entities created
    - Event definitions
    - Handler implementations
    - EventBus integration
    - SAGA definitions
    - DLQ configuration
  ↓
  Test Lead
    - Receives summary
    - Writes integration tests
    - Verifies event flow
    - Measures latency
    - Reports to reviewer-w10
```

### Requirements from COORDINATION.md

- **Event Latency Threshold**: < 2s for propagation
- **Failure Threshold**: > 5s indicates bottleneck
- **Correlation ID**: Must propagate across all domains
- **Causation ID**: Must chain through event flows
- **Idempotency**: All handlers must be idempotent
- **DLQ**: Failed events must go to DLQ with exponential backoff

### Next Steps

1. Wait for developer-w10 to send implementation summary
2. Parse domains, entities, and event definitions
3. Write mocks for each service using London School approach
4. Implement test cases with real EventBus (for integration)
5. Measure latency and validate against thresholds
6. Send results to reviewer-w10 with coverage report
