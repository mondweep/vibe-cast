# Phase 2: Unit Test Implementations - Execution Plan

**Status**: In Progress  
**Estimated Duration**: 3-4 days  
**Dependencies**: Phase 1 ✅ Complete  
**Blockers**: None (Phase 1 complete)

---

## Overview

Phase 2 focuses on comprehensive unit testing of core infrastructure components. These tests validate:
- EventBus event distribution and handler execution
- SagaOrchestrator state machine transitions
- Database migration schemas
- Error handling and edge cases

All Phase 1 integration tests (17 passing) remain passing.

---

## Work Breakdown

### Task 1: EventBus Unit Tests
**Status**: Research in progress  
**Assigned**: phase2_researcher agent  
**Effort**: 4-5 hours  
**Files**:
- `src/shared/infrastructure/events/EventBus.ts` (implementation)
- `tests/unit/shared/infrastructure/events/EventBus.test.ts` (stub)

**Test Coverage Areas**:
- Handler registration by event type
- Event publishing and distribution
- Handler filtering (canHandle method)
- Error isolation and DLQ placement
- Exponential backoff for retries
- Idempotency tracking
- Subscription management

**Success Criteria**:
- All unit tests pass
- >90% code coverage for EventBus.ts
- Error cases tested

---

### Task 2: SagaOrchestrator Unit Tests
**Status**: Research in progress  
**Assigned**: phase2_orchestrator_research agent  
**Effort**: 4-5 hours  
**Files**:
- `src/shared/domain/SagaOrchestrator.ts` (implementation)
- `tests/unit/shared/domain/SagaOrchestrator.test.ts` (stub)

**Test Coverage Areas**:
- State machine transitions
- Step execution and resumption
- Compensation logic on failure
- Optimistic locking conflicts
- Event publishing
- Idempotency checks
- Edge cases (concurrent updates, duplicates)

**Success Criteria**:
- All unit tests pass
- State machine transitions tested
- Compensation paths validated
- >85% code coverage

---

### Task 3: Database Migration Validation Tests
**Status**: Planned  
**Effort**: 2-3 hours  
**Files**:
- `tests/integration/database-migrations.spec.ts` (new)

**Validation Areas**:
- Schema creation (ruflo_demo exists)
- All tables created with correct columns
- Indexes created
- RLS policies enabled
- Constraints enforced (FK, unique, PK)
- Default values working
- Data types correct

**Success Criteria**:
- Migration validation tests pass
- Can query from all tables
- RLS policies prevent unauthorized access

---

## Execution Sequence

### Parallel Phase (Days 1-2)

**Track A: EventBus Tests**
```
1. Researcher analyzes EventBus implementation
2. Developer implements test cases
3. Tests run and pass
4. Code review
```

**Track B: SagaOrchestrator Tests**
```
1. Researcher analyzes SagaOrchestrator implementation
2. Developer implements test cases
3. Tests run and pass
4. Code review
```

### Sequential Phase (Day 2-3)

**Track C: Migration Validation**
- Depends on: Both A and B complete
- Implements migration validation tests
- Validates database schema
- Tests RLS policies

---

## Testing Strategy

### Unit Test Framework
- **Framework**: Jest
- **Mocking**: ts-mockito for dependencies
- **Fixtures**: Shared test data builders
- **Assertions**: Clear, descriptive expectations

### Test Structure
```typescript
describe('Component/System', () => {
  beforeEach(() => {
    // Setup mocks, fixtures
  });

  describe('Feature/Method', () => {
    it('should do X when Y happens', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Coverage Thresholds
- **EventBus**: >90% coverage
- **SagaOrchestrator**: >85% coverage
- **Overall**: >80% statements covered

---

## Integration with Existing Tests

**Will NOT modify**: 
- `query-model-synchronization.spec.ts` (17 tests, all passing)
- `event-sourcing.spec.ts`
- Domain entity tests

**Will ADD**:
- `EventBus.test.ts` (unit tests)
- `SagaOrchestrator.test.ts` (unit tests)
- `database-migrations.spec.ts` (integration tests)

---

## CI/CD Integration

After completion:
```bash
npm run build      # Verify TypeScript compilation
npm run test       # Run all tests (unit + integration)
npm run test:cov   # Generate coverage report
npm run lint       # Static analysis
```

All tests must pass before Phase 3 can begin.

---

## Risks & Mitigation

### Risk 1: Missing Mock Dependencies
**Mitigation**: Create mock builders for common dependencies (Logger, Repository, EventBus)

### Risk 2: Complex State Machine Logic
**Mitigation**: Test one state transition at a time, validate pre/post conditions

### Risk 3: Database Connection in Tests
**Mitigation**: Use in-memory SQLite for migration tests, never connect to real Supabase

### Risk 4: Flaky Tests from Timing
**Mitigation**: Use fake clocks (jest.useFakeTimers), avoid sleep()

---

## Success Criteria for Phase 2

- [ ] EventBus unit tests written and passing (>90% coverage)
- [ ] SagaOrchestrator unit tests written and passing (>85% coverage)
- [ ] Migration validation tests written and passing
- [ ] All 17 Phase 1 integration tests still passing
- [ ] Build passes (npm run build)
- [ ] Lint passes (npm run lint)
- [ ] Code review approved
- [ ] Committed and pushed to ruflo-demonstration branch

---

## Next Phase (Phase 3)

Once Phase 2 is complete:
- Multi-domain workflow integration tests
- Event log replay tests
- Cross-domain consistency tests

Phase 3 work can start immediately after Phase 2 PR is merged.

---

## Team Assignments

- **Researcher (EventBus)**: phase2_researcher
- **Researcher (SagaOrchestrator)**: phase2_orchestrator_research
- **Developer**: Awaiting research completion
- **Review**: Primary developer
