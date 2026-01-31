# ADR-001: Hexagonal Architecture for Domain Isolation

## Status
Accepted

## Context
ShopFlow V2 requires a clean separation between business logic and infrastructure concerns. The system has 6 bounded contexts (Catalog, Cart, Orders, Inventory, Payments, Users) that must evolve independently while maintaining clear contracts.

## Decision
We adopt Hexagonal Architecture (Ports & Adapters) for all bounded contexts:

```
src/domains/{context}/
├── domain/          # Core business logic (entities, value objects, services)
├── application/     # Use cases and application services
├── infrastructure/  # External adapters (database, APIs, messaging)
└── ports/           # Interface definitions (inbound & outbound)
```

### Key Principles
1. **Domain layer** has zero dependencies on infrastructure
2. **Ports** define abstract interfaces for all external interactions
3. **Adapters** implement ports for specific technologies
4. **Use cases** orchestrate domain logic via ports

## Consequences

### Positive
- Business logic is testable in isolation
- Easy to swap infrastructure (e.g., database, payment provider)
- Clear boundaries prevent coupling between contexts
- Supports TDD with mock adapters

### Negative
- More boilerplate for simple CRUD operations
- Learning curve for team unfamiliar with pattern
- Requires discipline to maintain boundaries

## Alternatives Considered
1. **Layered Architecture**: Simpler but leads to tight coupling
2. **Clean Architecture**: Similar benefits but more layers than needed
3. **Microservices**: Overkill for current scale, adds operational complexity

## References
- Alistair Cockburn's Hexagonal Architecture
- Domain-Driven Design by Eric Evans
