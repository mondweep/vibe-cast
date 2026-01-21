# Implement Feature Command

Implement a feature for Driftwise following DDD patterns and the established architecture.

## Usage

```
/implement-feature <feature-description>
```

## Process

1. **Analyze**: Identify the affected bounded context(s)
2. **Design**: Create domain models following DDD patterns
3. **Implement**: Write code following TypeScript best practices
4. **Test**: Create unit tests for domain logic
5. **Integrate**: Wire up with existing services
6. **Document**: Update relevant documentation

## Guidelines

### Domain Modeling
- Create value objects for immutable data
- Define aggregates with clear boundaries
- Emit domain events for state changes
- Enforce invariants in aggregate methods

### Code Style
- Use TypeScript strict mode
- Prefer composition over inheritance
- Keep functions small and focused
- Use descriptive names following ubiquitous language

### Testing
- Unit test all domain logic
- Mock external services in tests
- Aim for >80% coverage on domain code
- Include edge cases and error scenarios

### Integration
- Use adapters for external APIs
- Implement anti-corruption layers
- Handle errors gracefully (skip cycles, don't crash)
- Log important events for debugging

## Bounded Contexts Reference

- **Location**: GPS acquisition, geocoding, place names
- **Discovery**: Fact generation, quality filtering, Gemini integration
- **Voice**: Live API, speech synthesis, command recognition
- **Audio**: Focus management, ducking, Capacitor plugin
- **Configuration**: User preferences, polling interval, settings

## Example

```
/implement-feature Add ability to save favorite facts for later review
```

This will:
1. Analyze which context(s) are affected (Discovery, Configuration)
2. Design the domain model (FavoriteFact entity, FavoritesAggregate)
3. Implement the feature with proper TypeScript types
4. Create unit tests
5. Update the UI to show saved facts
