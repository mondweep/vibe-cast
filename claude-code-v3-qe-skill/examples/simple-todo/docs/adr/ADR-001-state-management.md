# ADR-001: State Management Choice

## Status
Accepted

## Context
We need to manage todo list state in our React application. The state includes:
- List of todos (add, update, delete)
- Filter state (all, active, completed)
- localStorage synchronization

Options considered:
1. **useState** - Simple, built-in, good for small state
2. **useReducer** - Action-based, predictable, better for complex state transitions
3. **External library (Zustand/Redux)** - Overkill for this scope

## Decision
Use **useReducer** for todo state management because:
- Clear action-based mutations (ADD_TODO, TOGGLE_TODO, DELETE_TODO, SET_FILTER)
- Predictable state transitions
- Easy to test reducer in isolation
- Natural fit for localStorage sync (single state object)

Use **useState** for simple UI state (input value).

## Consequences

### Positive
- Testable: Reducer is a pure function
- Predictable: All state changes through defined actions
- Scalable: Easy to add new actions
- Debuggable: Actions provide clear audit trail

### Negative
- Slightly more boilerplate than useState
- Learning curve for developers unfamiliar with reducers

### Risks
- None significant for this scope
