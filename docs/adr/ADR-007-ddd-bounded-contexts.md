# ADR-007: Domain-Driven Design — Bounded Contexts

**Status:** Accepted  
**Date:** 2026-04-27  
**Linear:** MON-47

## Context

The course platform has several distinct concerns: course content management, learner identity, progress tracking, and assessments. Without clear boundaries, these concerns will become entangled.

## Decision

**Define four bounded contexts with explicit boundaries:**

| Context | Responsibility |
|---|---|
| **Course** | Module, Lesson, LearningObjective, Quiz — the content itself |
| **Learner** | Identity, persona, preferences — who is learning |
| **Progress** | Completion events, scores, learning path state — how far along |
| **Assessment** | Quiz attempts, scoring, certificates — evaluation |

Each context lives in `/src/domains/{context}/` with its own entities, repositories, services, and events.

## Rationale

- Clear boundaries prevent coupling (e.g. progress logic must not import course rendering logic)
- Domain events (ModuleCompleted, QuizPassed) allow loose coupling between contexts
- Repository interfaces enable easy substitution (localStorage → API → database) per context
- Ubiquitous language is enforced within each context's code

## Consequences

- More initial structure than a flat component/service architecture
- Cross-context queries require explicit translation (anti-corruption layers if needed)
- Domain events are in-process for Phase 1; can be moved to async queue later

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Single monolithic service | High coupling; harder to test in isolation |
| Microservices from day one | Premature for a course platform at this scale |
| Feature-based folders only | No domain modelling discipline; logic bleeds across features |
