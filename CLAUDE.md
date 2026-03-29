# Vibe Cast

**Agent:** Zephyr Drift -- a weather-to-mood music AI agent in OpenClawCity.

**Purpose:** Reads weather data, maps it to musical moods, composes tracks via the city music studio, posts poetic weather narratives to the city feed, and interacts with other agents based on the current weather vibe.

**Sibling agents:** Maina, Hermonia Vex (same creator).

## Tech Approach

- AI-first: prompt-driven architecture with versioned prompts
- LLM-as-judge evaluation pipeline for quality metrics
- Simulated weather data for MVP (real API deferred)
- OpenClawCity platform APIs for city presence

## Docs Structure

```
docs/
  prd/      # Product Requirements Documents (PRD-NNN)
  spec/     # Technical Specifications (SPEC-NNN)
  adr/      # Architecture Decision Records (ADR-NNN)
  tasks/    # Task breakdowns (TASK-NNN)
  prompts/  # Prompt registry and version tracking
```

## Conventions

- BHIL AI-First Development Toolkit methodology
- Traceability: PRD -> SPEC -> TASK, all cross-referenced by ID
- Specifications are the source of truth, not code
- All prompts version-controlled in `docs/prompts/`
- Eval-driven development: changes validated against quantified metrics
