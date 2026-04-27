# ADR-004: Testing Strategy — London School TDD

**Status:** Accepted  
**Date:** 2026-04-27  
**Linear:** MON-47

## Context

The course platform has complex domain logic (progress tracking, scoring, persona-based routing) that must be reliably tested. We need a testing strategy that drives good design and provides rapid feedback.

## Decision

**Adopt London School (Outside-In) TDD with three test layers:**

1. **Acceptance tests (Playwright)** — written first, describe user journeys
2. **Integration tests (Jest + Testing Library)** — verify domain services and component trees
3. **Unit tests (Jest + mocks)** — drive domain entity design, mock collaborators at boundaries

## Rationale

- London School's outside-in approach ensures tests reflect real user behaviour
- Mocking at boundaries (repositories, external services) keeps domain logic pure and fast
- Playwright E2E tests serve as living documentation of feature acceptance criteria
- 80%+ coverage enforced on `/src/domains/**` via Jest `coverageThreshold`

## Consequences

- Requires discipline: write the Playwright test before the component
- Mocks must be kept accurate — stale mocks are a maintenance risk
- E2E tests require a running dev server in CI

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Chicago/Detroit School (state-based) | Less design pressure; harder to isolate domain logic |
| No unit tests, E2E only | Slow feedback loop; hard to isolate failures |
| Cypress instead of Playwright | Playwright is faster, better TypeScript support, free parallelism |
