# ADR-006: State Management — localStorage + React Context

**Status:** Accepted  
**Date:** 2026-04-27  
**Linear:** MON-47

## Context

Learner progress (completed lessons, quiz scores, persona selection) must persist across browser sessions without requiring user authentication in Phase 1.

## Decision

**Store learner progress in `localStorage`, accessed via React Context API. Zustand for complex lab state.**

## Rationale

- No backend required for Phase 1 (reduces infrastructure complexity)
- localStorage is synchronous and fast for small progress records
- React Context wraps localStorage access with type safety
- Zustand provides minimal boilerplate for interactive lab state (BGP simulator, VPC builder)
- Extensible: localStorage can be replaced with API calls in Phase 3+ without changing Context API

## Consequences

- Progress is device-specific; cross-device sync requires auth (Phase 3 consideration)
- localStorage has a ~5MB limit — well within requirements for progress data
- Requires graceful SSR handling (localStorage not available server-side)

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Redux | Excessive boilerplate for this scale |
| Server-side sessions | Requires auth infrastructure not in scope for Phase 1 |
| URL state only | Not persistent across sessions |
