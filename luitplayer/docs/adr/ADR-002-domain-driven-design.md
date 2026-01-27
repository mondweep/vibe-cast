# ADR-002: Domain-Driven Design with Bounded Contexts

## Status
Accepted

## Date
2026-01-27

## Context
LuitPlayer spans multiple complex domains: PDF processing, music recognition, audio synthesis, and user interface. These domains have distinct vocabularies, rules, and responsibilities that need clear boundaries to prevent coupling and enable independent evolution.

## Decision
We will structure the codebase using **Domain-Driven Design (DDD)** with the following bounded contexts:

### Bounded Contexts

1. **PDFProcessing Context**
   - Aggregates: `Score`, `Page`, `Measure`
   - Value Objects: `Coordinates`, `BoundingBox`
   - Domain Events: `PageRendered`, `MeasureDetected`

2. **OMREngine Context**
   - Aggregates: `Staff`, `Voice`, `Instrument`
   - Value Objects: `Note`, `Chord`, `Dynamic`, `Tempo`
   - Domain Events: `StaffDetected`, `NoteRecognized`, `ChordAnalyzed`

3. **AudioEngine Context**
   - Aggregates: `Mixer`, `Track`, `Sample`
   - Value Objects: `Frequency`, `Gain`, `Duration`
   - Domain Events: `NoteOn`, `NoteOff`, `TempoChanged`

4. **UIPresentation Context**
   - Components: `ScoreViewer`, `MixerConsole`, `PlaybackControls`
   - State: `PlaybackState`, `SelectionState`, `NavigationState`
   - Events: `UserPlay`, `UserSeek`, `LoopCreated`

5. **SharedKernel**
   - Common types: `TimeSignature`, `KeySignature`, `MIDINote`
   - Shared utilities: `EventBus`, `Logger`

### Context Mapping
```
PDFProcessing --[Conformist]--> OMREngine
OMREngine --[Published Language (IR)]--> AudioEngine
UIPresentation --[Anti-Corruption Layer]--> All Contexts
```

## Consequences

### Positive
- Clear separation of concerns
- Independent testability per context
- Enables parallel development by different agents
- Explicit contracts via domain events

### Negative
- Initial setup overhead
- Requires discipline to maintain boundaries
- Translation layers add some complexity

## Directory Structure
```
src/
├── domains/
│   ├── pdf-processing/
│   │   ├── aggregates/
│   │   ├── value-objects/
│   │   ├── events/
│   │   └── services/
│   ├── omr-engine/
│   ├── audio-engine/
│   ├── ui-presentation/
│   └── shared-kernel/
├── infrastructure/
└── application/
```

## References
- Eric Evans, "Domain-Driven Design" (2003)
- Vaughn Vernon, "Implementing Domain-Driven Design" (2013)
