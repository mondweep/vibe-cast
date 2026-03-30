---
id: TASK-007
title: "Pipeline Orchestrator"
spec: SPEC-001
prd: PRD-001
adrs: [ADR-002]
status: draft
depends_on: [TASK-003, TASK-004, TASK-005, TASK-006]
parallel: false
estimated_tokens: 32K
sprint: S-01
created: 2026-03-30
---

# TASK-007: Pipeline Orchestrator

## Task Context

| Field | Value |
|-------|-------|
| Feature | Main pipeline orchestration -- composition cycle, social branch, ambient drift |
| Purpose | Implement the pipeline orchestrator per ADR-002: sequential main pipeline with parallel social branch and ambient drift fallback |
| Session Classification | Integration / Orchestration |
| Agent Session | Single session (~32K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **ADR-002** -- full document, especially Section 4 (chosen pattern), Section 5 (architecture), Section 6 (error handling)
2. **SPEC-001** Section 4 (Pipeline Flow Specification) -- main composition cycle (4.1), social response branch (4.2), ambient drift fallback (4.3)
3. **SPEC-001** Section 5 (Error Handling Matrix) -- all rows
4. **SPEC-001** Section 8 (Observability) -- telemetry format for all LLM calls
5. **PRD-001** US-U05 -- duplicate weather suppression within 30 seconds
6. **PRD-001** US-S07 -- ambient drift fallback after 10 minutes no data
7. All TASK outputs: TASK-003 (MoodEngine), TASK-004 (CityPresenceManager), TASK-005 (CompositionGenerator, FeedComposer), TASK-006 (SocialEngine)

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `src/pipeline.ts` | Pipeline orchestrator class -- main composition cycle, social branch, ambient drift |
| `src/index.ts` | Application entry point -- initializes all components and starts the pipeline |
| `src/__tests__/pipeline.test.ts` | Integration tests for full pipeline |

### Files to Read (Dependencies)

| File | Dependency |
|------|-----------|
| `src/types.ts` | All interfaces (TASK-001) |
| `src/weather-provider.ts` | WeatherProvider (TASK-001) |
| `src/prompt-registry.ts` | PromptRegistry (TASK-002) |
| `src/mood-engine.ts` | MoodEngine (TASK-003) |
| `src/city-presence.ts` | CityPresenceManager (TASK-004) |
| `src/composition-generator.ts` | CompositionGenerator (TASK-005) |
| `src/feed-composer.ts` | FeedComposer (TASK-005) |
| `src/social-engine.ts` | SocialEngine (TASK-006) |

### Files Excluded

Do not modify any existing component files. Pipeline orchestrates existing components.

## Implementation Steps

### Main Pipeline (src/pipeline.ts)

1. **Implement VibeCastPipeline class**
   - Constructor accepts all component instances: WeatherProvider, MoodEngine, CompositionGenerator, CityPresenceManager, FeedComposer, SocialEngine
   - `start(): Promise<void>` -- begins the main loop
   - `stop(): void` -- gracefully stops the pipeline
   - Maintain internal state: lastWeatherTimestamp, lastMoodVector, lastCompositionTimestamp, isRunning

2. **Weather polling loop**
   - Poll WeatherProvider on configured interval (default: matches fixture rotation)
   - On new weather data: trigger main composition cycle
   - Track last weather data timestamp for ambient drift detection

3. **Duplicate suppression (US-U05)**
   - If two weather updates arrive within 30 seconds, process only the most recent
   - Compare timestamps, discard stale data point
   - Log discarded updates

4. **Mood change detection**
   - After MoodEngine produces new MoodVector, compare to previous state
   - If mood changed OR 30 minutes have elapsed since last composition: continue pipeline
   - If mood unchanged and < 30 minutes: skip composition cycle
   - "Changed" defined as: different genre, or energy delta > 0.1, or valence delta > 0.15

5. **Main composition cycle (SPEC-001 Section 4.1, Steps 1-9)**
   - Step 1: `WeatherProvider.getCurrentWeather()` -> WeatherInput
   - Step 2: `MoodEngine.mapWeatherToMood(weather)` -> MoodVector (LLM call #1)
   - Step 3: Compare to previous mood, check 30-min timer
   - Step 4: `CompositionGenerator.generatePrompt(mood, weather)` -> CompositionPrompt (LLM call #2)
   - Step 5: `CityPresenceManager.ensureInStudio()`
   - Step 6: `CityPresenceManager.composeTrack(building_id, title, prompt)` -> TrackResult (poll until done)
   - Step 7: `FeedComposer.composePost(weather, mood, track)` -> FeedPost (LLM call #3)
   - Step 8: `CityPresenceManager.postToFeed(post)` -> post_id
   - Step 9: `CityPresenceManager.speak(announcement)`

6. **Social response branch (SPEC-001 Section 4.2) -- parallel**
   - After MoodEngine produces mood vector, spawn async social handler
   - Social handler: call `CityPresenceManager.heartbeat()` to check for mentions
   - For each mention: `SocialEngine.generateResponse(mention, currentMood, weather)`
   - Post response via `CityPresenceManager.speak(response)`
   - Social branch does NOT block main pipeline

7. **Ambient drift fallback (SPEC-001 Section 4.3, US-S07)**
   - Monitor time since last weather data received
   - If > 10 minutes with no new weather data: enter ambient drift mode
   - Ambient drift: take last known MoodVector, set energy = last_energy * 0.5
   - Continue social responses using fallback mood
   - Skip composition cycle until weather data resumes
   - Log entry into and exit from ambient drift mode

8. **Observability (SPEC-001 Section 8)**
   - Emit structured telemetry for every LLM call
   - Include: trace_id, component, prompt_version, input_hash, output, input_tokens, output_tokens, latency_ms, eval_score, status, timestamp
   - Append to `logs/telemetry.jsonl`

### Application Entry Point (src/index.ts)

9. **Implement main entry point**
   - Initialize all components with configuration
   - Create LLM client instance
   - Create PromptRegistry
   - Create WeatherProvider, MoodEngine, CompositionGenerator, CityPresenceManager, FeedComposer, SocialEngine
   - Create VibeCastPipeline with all components
   - Start pipeline
   - Handle graceful shutdown on SIGINT/SIGTERM

## Test Requirements

### Test File: `src/__tests__/pipeline.test.ts`

Use mocked versions of all components.

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Full happy path | Valid weather -> mood -> composition -> track -> post | All steps called in sequence, feed post published |
| Happy path LLM call count | Full cycle without social | Exactly 3 LLM calls (mood, composition, narrative) |
| Happy path + social | Full cycle with 1 mention | 4 LLM calls total |
| Duplicate weather suppressed | Two weather updates 15s apart | Only one pipeline run |
| Mood unchanged skips composition | Same mood vector twice within 30 min | Second cycle skips composition |
| 30-min timer triggers composition | Same mood, 31 minutes elapsed | Composition cycle runs |
| Social branch runs in parallel | Social engine is slow (5s) | Main pipeline completes without waiting |
| Social branch failure does not block main | Social engine throws | Main pipeline completes normally |
| Ambient drift activates | No weather data for 11 minutes | Energy halved, composition skipped |
| Ambient drift social continues | In ambient drift mode, mention received | Social response generated with fallback mood |
| Ambient drift exits on new data | Weather data resumes after drift | Normal composition cycle resumes |
| End-to-end latency < 120s | Full pipeline with mocked components | Total time < 120 seconds |
| Telemetry emitted for all LLM calls | Full cycle | 3 telemetry entries in log |
| Graceful shutdown | stop() called during cycle | Current cycle completes, no new cycles start |
| MoodEngine failure uses cached mood | MoodEngine throws | Pipeline continues with previous mood vector |
| CompositionGenerator failure posts narrative-only | CompositionGenerator throws after retries | FeedComposer posts without track reference |

## Acceptance Criteria

- [ ] Main composition cycle follows SPEC-001 Section 4.1 steps 1-9 in sequence
- [ ] Social response branch runs in parallel after mood vector is available (ADR-002)
- [ ] Social branch failures do not block or delay main pipeline
- [ ] Duplicate weather events within 30s are deduplicated (US-U05)
- [ ] 30-minute stable weather timer triggers new composition
- [ ] Ambient drift activates after 10 minutes without weather data (US-S07)
- [ ] Ambient drift halves energy and skips composition
- [ ] End-to-end pipeline < 120 seconds (NFR-01 through NFR-03)
- [ ] Maximum 3 LLM calls on happy path (mood, composition, narrative)
- [ ] Maximum 4 LLM calls with social response
- [ ] Structured telemetry emitted for all LLM calls (NFR-09)
- [ ] Graceful shutdown supported
- [ ] All integration tests pass

## Definition of Done

- [ ] `src/pipeline.ts` exports VibeCastPipeline class
- [ ] `src/index.ts` is a runnable entry point that initializes and starts the pipeline
- [ ] Main composition cycle, social branch, and ambient drift all implemented
- [ ] All integration tests in `src/__tests__/pipeline.test.ts` pass
- [ ] Code compiles with `tsc --noEmit` without errors
- [ ] No lint errors

---

*Traceability: TASK-007 -> SPEC-001 Section 4 -> PRD-001 US-E01..E05, US-S07, US-U05, ADR-002*
