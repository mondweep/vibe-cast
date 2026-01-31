# ADR-005: Comprehensive Testing Strategy (TDD)

## Status
Accepted

## Context
ShopFlow V2 requires high reliability for e-commerce operations. Payment processing, inventory management, and order fulfillment must work correctly. We need a testing strategy that:
- Catches bugs before production
- Supports confident refactoring
- Documents expected behavior
- Enables continuous deployment

## Decision
Implement **Testing Pyramid** with TDD methodology:

```
        /\
       /  \     E2E Tests (Playwright)
      /----\    - Critical user flows
     /      \   - 10-15 tests
    /--------\  Integration Tests (Vitest)
   /          \ - API endpoints, DB operations
  /------------\ - 50-100 tests
 /              \ Unit Tests (Vitest)
/________________\ - Domain logic, utilities
                   - 200+ tests
```

### Test Structure

```
tests/
├── unit/
│   ├── domains/
│   │   ├── cart/
│   │   ├── orders/
│   │   └── payments/
│   └── lib/
├── integration/
│   ├── api/
│   └── db/
└── e2e/
    ├── checkout.spec.ts
    ├── catalog.spec.ts
    └── admin.spec.ts
```

### Coverage Targets
- **Unit tests**: 90% line coverage
- **Integration tests**: All API endpoints
- **E2E tests**: Critical paths only

### TDD Workflow
```
1. RED: Write failing test for new feature
2. GREEN: Write minimal code to pass
3. REFACTOR: Improve code while tests pass
```

### Tools
- **Vitest**: Fast unit/integration testing
- **Testing Library**: Component testing
- **Playwright**: E2E browser testing
- **MSW**: API mocking

## Consequences

### Positive
- High confidence in code changes
- Living documentation via tests
- Fast feedback loop with Vitest
- Catches regressions early

### Negative
- Initial slower development
- Test maintenance overhead
- Need to balance coverage vs speed

## Alternatives Considered
1. **Jest**: Slower, less Vite-native
2. **Cypress**: Heavier for E2E
3. **No E2E**: Too risky for checkout flow

## References
- Test Pyramid by Martin Fowler
- TDD by Kent Beck
