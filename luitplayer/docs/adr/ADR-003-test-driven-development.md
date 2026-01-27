# ADR-003: Test-Driven Development (TDD) Strategy

## Status
Accepted

## Date
2026-01-27

## Context
LuitPlayer involves complex algorithmic logic (OMR, audio processing) and real-time constraints. Bugs in these areas are costly to debug post-implementation. We need a development approach that ensures correctness from the start and provides confidence for refactoring.

## Decision
We will follow **Test-Driven Development (TDD)** using the London School (Mockist) approach, with Vitest as the test framework.

### TDD Cycle
1. **Red**: Write a failing test that defines expected behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### Testing Pyramid

```
        /\
       /  \     E2E Tests (Playwright)
      /    \    - Full score playback scenarios
     /------\
    /        \  Integration Tests
   /          \ - Worker communication
  /            \- WASM module loading
 /--------------\
/                \ Unit Tests (Vitest)
                  - Domain logic
                  - Value objects
                  - Pure functions
```

### Test Categories by Domain

1. **PDFProcessing**
   - Unit: Coordinate transformations, bounding box calculations
   - Integration: PDF.js worker communication

2. **OMREngine**
   - Unit: Note detection algorithms, chord parsing
   - Integration: OpenCV WASM module initialization

3. **AudioEngine**
   - Unit: Sample gain calculations, MIDI mapping
   - Integration: AudioWorklet message passing

4. **UIPresentation**
   - Unit: State reducers, selectors
   - Integration: Component rendering with mocked services
   - E2E: Full user workflows

### Coverage Requirements
- Unit tests: 90% line coverage
- Integration tests: Critical paths covered
- E2E tests: Happy path + major error scenarios

### Test File Naming
```
src/domains/omr-engine/services/note-detector.ts
tests/unit/omr-engine/services/note-detector.spec.ts
tests/integration/omr-engine/wasm-loader.integration.spec.ts
tests/e2e/playback-workflow.e2e.spec.ts
```

## Consequences

### Positive
- Catches bugs early in development
- Documentation through tests
- Safe refactoring
- Design emerges from tests (testable = modular)

### Negative
- Higher initial time investment
- Requires discipline to maintain
- Mock maintenance overhead

## Tools
- **Vitest**: Unit and integration testing (10x faster than Jest)
- **Playwright**: E2E browser testing
- **@vitest/coverage-v8**: Coverage reporting

## References
- Kent Beck, "Test-Driven Development: By Example" (2002)
- Steve Freeman & Nat Pryce, "Growing Object-Oriented Software, Guided by Tests" (2009)
