# Domain Context Map

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Networking Course                      │
│                                                              │
│  ┌──────────────┐      publishes      ┌──────────────────┐  │
│  │   COURSE     │ ──────────────────► │    ASSESSMENT    │  │
│  │              │                     │                  │  │
│  │  Module      │                     │  Assessment      │  │
│  │  Lesson      │                     │  Attempt         │  │
│  │  Quiz        │                     │  Result          │  │
│  └──────┬───────┘                     └────────┬─────────┘  │
│         │ ModulePublished                       │ QuizPassed │
│         ▼                                       ▼            │
│  ┌──────────────┐    enrolled in   ┌──────────────────────┐ │
│  │   PROGRESS   │ ◄────────────── │      LEARNER         │ │
│  │              │                  │                      │ │
│  │  Tracker     │                  │  Learner             │ │
│  │  LearningPath│                  │  Persona             │ │
│  │  Achievement │                  │  Preferences         │ │
│  └──────────────┘                  └──────────────────────┘ │
│                                                              │
│  Domain Events (in-process, Phase 1):                        │
│    ModulePublished → Progress.trackModuleAvailable           │
│    LessonCompleted → Progress.recordCompletion               │
│    QuizPassed      → Progress.recordScore + unlock next      │
│    PersonaSelected → Course.adaptContentPresentation         │
└─────────────────────────────────────────────────────────────┘
```

## Ubiquitous Language

| Term | Context | Meaning |
|---|---|---|
| Module | Course | A major topic area (M01–M10), the primary unit of learning |
| Lesson | Course | A sub-unit within a module; smallest completable content unit |
| Persona | Learner | The learner's role: student, teacher, or practitioner |
| Learning Path | Progress | The ordered sequence of modules for a given persona |
| Attempt | Assessment | A single submission of answers to a quiz |
| Completion Event | Progress | A recorded fact that a lesson was finished |
| Pass Mark | Assessment | The minimum score (%) required to progress |
