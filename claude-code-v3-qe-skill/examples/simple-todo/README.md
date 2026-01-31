# SimpleTodo

A minimalist todo application built using the **Build with Quality** skill methodology.

## Built With

- **DDD (Domain-Driven Design):** Todo aggregate with clear domain model
- **ADR (Architecture Decision Records):** Documented state management choice
- **TDD (Test-Driven Development):** Tests written before implementation

## Features

- Add new todos
- Mark todos as complete (strikethrough)
- Delete todos
- Filter by: All, Active, Completed
- Persist to localStorage
- Keyboard accessible (WCAG A compliant)

## Tech Stack

- React 18
- TypeScript
- Vite
- Vitest (testing)

## Project Structure

```
simple-todo/
├── docs/
│   └── adr/
│       └── ADR-001-state-management.md
├── src/
│   ├── components/
│   │   ├── TodoItem.tsx
│   │   ├── TodoInput.tsx
│   │   ├── TodoFilter.tsx
│   │   └── TodoList.tsx
│   ├── hooks/
│   │   └── useTodos.ts
│   ├── types/
│   │   └── todo.ts
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── tests/
│   ├── setup.ts
│   ├── todoReducer.test.ts
│   └── components.test.tsx
└── package.json
```

## Domain Model (DDD)

```typescript
// Entity: Todo (has identity)
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

// Value Object: Filter
type TodoFilter = 'all' | 'active' | 'completed';

// Domain Actions
type TodoAction =
  | { type: 'ADD_TODO'; payload: { text: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: string } }
  | { type: 'DELETE_TODO'; payload: { id: string } }
  | { type: 'SET_FILTER'; payload: { filter: TodoFilter } };
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

## Test Coverage

| Area | Coverage Target |
|------|----------------|
| Domain logic | 100% |
| Reducer | 100% |
| Components | 70%+ |
| Overall | 70%+ |

## Architecture Decision

See [ADR-001: State Management Choice](./docs/adr/ADR-001-state-management.md)

**Decision:** Use `useReducer` for todo state management because:
- Clear action-based mutations
- Predictable state transitions
- Easy to test reducer in isolation
- Natural fit for localStorage sync

## Quality Gates Met

- [x] Coverage: 70%+ minimum
- [x] Security: Basic XSS prevention (React escaping)
- [x] Accessibility: WCAG A (keyboard navigation)
- [x] TDD: All features test-first

---

*Built with the [Build with Quality Skill](../../README.md)*
