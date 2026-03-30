---
id: ADR-002
title: "Use pipeline orchestration for Zephyr Drift weather-to-music workflow"
status: proposed
type: agent-orchestration
date: 2026-03-30
related_prds: [PRD-001]
related_specs: [SPEC-001]
related_adrs: [ADR-001]
sprint: S-01
---

# ADR-002: Use Pipeline Orchestration for Zephyr Drift Weather-to-Music Workflow

## 1. Context and Problem Statement

Zephyr Drift is an AI agent that must orchestrate multiple AI-powered steps in a continuous cycle: interpreting weather data into a mood vector, mapping that mood to a music composition prompt, submitting the composition to the city music studio, generating a poetic weather narrative, posting to the city feed, and responding socially to other agents' mentions and replies. Each of these steps involves distinct logic, and several require LLM calls with associated latency and cost.

The system must handle these steps reliably within a 2-minute end-to-end latency budget (NFR-01 through NFR-04 combined), stay within a cost ceiling of 4 LLM calls per weather cycle on the happy path, and degrade gracefully when individual steps fail. We need to decide on the orchestration pattern that governs how these components coordinate.

The key question: **What orchestration pattern should govern the interaction between WeatherProvider, MoodEngine, CompositionGenerator, CityPresenceManager, FeedComposer, and SocialEngine?**

## 2. Decision Drivers

| Driver | Weight | Rationale |
|--------|--------|-----------|
| **Workflow linearity** | High | The core path (weather -> mood -> compose -> post) is inherently sequential; each step depends on the output of the previous one. |
| **Latency budget** | High | Total weather-to-posted-track must complete in < 120 seconds (PRD NFR-01 through NFR-03 sum to ~30s target, with headroom). |
| **LLM cost ceiling** | High | Maximum 4 LLM calls per weather cycle on the happy path. Each call costs tokens and latency; unnecessary parallelism increases cost. |
| **Error tolerance** | Medium | Partial failures (e.g., composition fails but feed post of narrative-only is still valuable) should not block the entire cycle. |
| **Observability** | Medium | Each step must be independently traceable with prompt version, input/output hash, latency, and token count (NFR-09). |
| **Social response independence** | Medium | Social responses to mentions (US-E04) are triggered independently of the main composition cycle and should not block or be blocked by it. |
| **Implementation simplicity** | Medium | Sprint S-01 is the MVP. Pattern complexity must be justified by clear benefit. |

## 3. Orchestration Patterns Evaluated

### 3.1 Pipeline (Sequential)

```
WeatherProvider -> MoodEngine -> CompositionGenerator -> CityPresenceManager -> FeedComposer
```

**How it works:** Each step runs in sequence. The output of one step is the input to the next. A single orchestration loop drives the entire chain.

| Aspect | Assessment |
|--------|------------|
| Simplicity | Excellent -- linear flow, easy to reason about |
| Testability | Excellent -- each step testable in isolation with known inputs/outputs |
| Latency | Acceptable -- total = sum of steps (~45s happy path) |
| Error handling | Good -- failure at step N means steps N+1..end are skipped; retry logic is local to each step |
| Observability | Excellent -- each step boundary is a natural instrumentation point |
| Social responses | Poor -- social responses must wait for pipeline completion or run in a separate mechanism |

### 3.2 Orchestrator-Worker

```
                    +-> MoodEngine
Orchestrator -------+-> CompositionGenerator
                    +-> FeedComposer
                    +-> SocialEngine
```

**How it works:** A central orchestrator decides which workers to invoke, in what order, passing messages between them. The orchestrator manages state and routing.

| Aspect | Assessment |
|--------|------------|
| Simplicity | Poor -- adds an orchestrator component with routing logic for what is mostly a linear flow |
| Testability | Moderate -- requires mocking the orchestrator or testing workers independently |
| Latency | No improvement -- the main path is still sequential due to data dependencies |
| Error handling | Good -- orchestrator can implement sophisticated retry and fallback |
| Observability | Good -- orchestrator is a natural logging chokepoint |
| Social responses | Good -- orchestrator can dispatch social responses independently |

### 3.3 Hybrid: Pipeline + Parallel Social Branch

```
WeatherProvider -> MoodEngine -> CompositionGenerator -> CityPresenceManager -> FeedComposer
                       |
                       +------> SocialEngine (parallel, independent)
```

**How it works:** The main composition flow runs as a sequential pipeline. After MoodEngine produces the mood vector, a parallel branch feeds that mood to SocialEngine for handling mentions and replies. The two branches are independent after the fork point.

| Aspect | Assessment |
|--------|------------|
| Simplicity | Good -- pipeline remains simple; social branch is a single fork |
| Testability | Good -- pipeline and social branch testable independently |
| Latency | Good -- social responses don't wait for composition; main pipeline unaffected |
| Error handling | Good -- social branch failures don't affect main pipeline and vice versa |
| Observability | Good -- two traceable execution paths, both linear |
| Social responses | Excellent -- responses can fire as soon as mood is known, within the 60s budget (US-E04) |

## 4. Chosen Pattern: Pipeline with Parallel Social Branch

We adopt the **hybrid pipeline with parallel social branch** pattern.

**Main pipeline (sequential):**
1. **WeatherProvider** -- retrieves current weather data (simulated for MVP)
2. **MoodEngine** -- maps weather to mood vector via LLM (1 LLM call)
3. **CompositionGenerator** -- generates music studio prompt from mood vector via LLM (1 LLM call)
4. **CityPresenceManager** -- submits composition to city music studio, receives track reference (API call, no LLM)
5. **FeedComposer** -- generates poetic narrative and publishes feed post via LLM (1 LLM call)

**Parallel social branch (independent):**
- **SocialEngine** -- uses current mood vector to respond to pending mentions/replies via LLM (0-1 LLM calls per cycle)

**Why this pattern:**
- The main path is inherently sequential (each step needs the previous step's output), so a pipeline is the natural fit.
- Social responses are the one independent concern: they only need the mood vector, not the composition or track reference. Forking after MoodEngine lets them run concurrently.
- This keeps the happy-path LLM call count at 3 (mood + composition + narrative) with an optional 4th for social responses, fitting the cost ceiling.
- The pipeline is trivially observable: log at each step boundary.

## 5. Architecture Specification

### 5.1 Component Flow Diagram

```
                         MAIN PIPELINE (sequential)
                         ==========================

  +------------------+     +---------------+     +------------------------+
  |                  |     |               |     |                        |
  | WeatherProvider  +---->| MoodEngine    +---->| CompositionGenerator   |
  |                  |     |  (LLM call 1) |     |  (LLM call 2)         |
  +------------------+     +-------+-------+     +----------+-------------+
                                   |                        |
                                   |                        v
                                   |             +----------+-------------+
                                   |             |                        |
                                   |             | CityPresenceManager    |
                                   |             |  (Studio API call)     |
                                   |             +----------+-------------+
                                   |                        |
                                   |                        v
                                   |             +----------+-------------+
                                   |             |                        |
                                   |             | FeedComposer           |
                                   |             |  (LLM call 3)          |
                                   |             +----------+-------------+
                                   |                        |
                                   |                        v
                                   |                   [Feed Post Published]
                                   |
                                   |
                         PARALLEL SOCIAL BRANCH
                         ======================
                                   |
                                   v
                           +-------+--------+
                           |                |
                           | SocialEngine   |
                           |  (LLM call 4,  |
                           |   if needed)   |
                           +-------+--------+
                                   |
                                   v
                           [Social Responses Posted]
```

### 5.2 Data Flow Contracts

| From | To | Payload |
|------|----|---------|
| WeatherProvider | MoodEngine | `WeatherData` (condition, temperature_c, humidity_pct, wind_speed_kmh, time_of_day) |
| MoodEngine | CompositionGenerator | `MoodVector` (genre, energy, valence, tempo_bpm_range, descriptors, color_palette) |
| MoodEngine | SocialEngine | `MoodVector` (same as above, passed by reference/copy at fork) |
| CompositionGenerator | CityPresenceManager | `CompositionPrompt` (formatted studio prompt string) |
| CityPresenceManager | FeedComposer | `TrackReference` (track_id, track_name, genre, tempo) + `MoodVector` + `WeatherData` |
| FeedComposer | City Feed API | `FeedPost` (title, narrative, track_ref, weather_summary, mood_descriptors) |
| SocialEngine | City Feed API | `SocialResponse` (reply_to_id, response_text, mood_context) |

### 5.3 Execution Semantics

- **Trigger:** A new weather data point arrives (event-driven, US-E01) or a stable-weather timer fires (min 1 post per 30 minutes, PRD 4.3).
- **Deduplication:** If two weather updates arrive within 30 seconds, only the most recent is processed (US-U05).
- **Fork point:** After MoodEngine completes, the pipeline runner spawns the SocialEngine as an async task and continues the main pipeline without waiting.
- **Join:** There is no join. The main pipeline and social branch complete independently. Both report their outcomes to the observability layer.

## 6. Error Handling Matrix

| Step | Failure Mode | Recovery Strategy | Impact on Pipeline |
|------|-------------|-------------------|-------------------|
| **WeatherProvider** | Data source unavailable | Use last known weather data; if stale > 10 min, enter "ambient drift" fallback mode (US-S07) at 50% energy | Pipeline continues with fallback data |
| **MoodEngine** | LLM call fails (timeout, 5xx) | Retry up to 2 times with exponential backoff (2s, 4s). On exhaustion, use last known mood vector. | Pipeline continues with cached mood |
| **MoodEngine** | Output validation fails (values out of range) | Clamp values to valid ranges per US-U01 and log warning. No retry needed. | Pipeline continues with clamped values |
| **CompositionGenerator** | LLM call fails | Retry up to 3 times with exponential backoff (2s, 4s, 8s) per US-U02. On exhaustion, skip composition and proceed to FeedComposer with narrative-only post. | CityPresenceManager skipped; FeedComposer posts narrative without track |
| **CityPresenceManager** | Studio API fails | Retry once after 5s. On failure, proceed to FeedComposer with composition prompt metadata but no track reference. | FeedComposer posts with "track pending" status |
| **FeedComposer** | LLM call fails | Retry up to 2 times. On exhaustion, post a minimal template-based fallback (no poetic narrative, just weather + track data). | Degraded post quality, but post still published |
| **FeedComposer** | Post exceeds 500 chars | Truncate with ellipsis and "continued..." indicator per US-U03. | Post published in compliant form |
| **SocialEngine** | LLM call fails | Retry once. On failure, queue the mention for next cycle. | Social response delayed, not lost |
| **SocialEngine** | Response quality < 0.6 alignment | Regenerate up to 2 times per US-U04; post highest-scoring variant. | Up to 2 additional LLM calls (accounted for in worst-case budget) |

### 6.1 Circuit Breaker Policy

If any single step fails 3 consecutive cycles in a row, that step enters a **circuit-open** state for 5 minutes. During this period:
- The pipeline skips the broken step and uses its fallback path.
- An alert is logged at ERROR level.
- After 5 minutes, the circuit enters **half-open**: the next cycle attempts the step normally. Success resets the circuit; failure re-opens it for another 5 minutes.

## 7. Cost and Latency Model

### 7.1 Per-Step Latency Estimates

| Step | Operation | Estimated Latency | Notes |
|------|-----------|-------------------|-------|
| WeatherProvider | Read simulated data | ~50ms | File/memory read; negligible |
| MoodEngine | LLM call (weather-to-mood) | ~3-5s | ~800 input tokens, ~200 output tokens (NFR-01: < 5s) |
| CompositionGenerator | LLM call (mood-to-prompt) | ~5-8s | ~600 input tokens, ~300 output tokens (NFR-02: < 10s) |
| CityPresenceManager | Studio API call | ~2-5s | External API; variable |
| FeedComposer | LLM call (narrative generation) | ~5-10s | ~1000 input tokens, ~300 output tokens (NFR-03: < 15s) |
| SocialEngine | LLM call (response generation) | ~5-8s | ~1000 input tokens, ~200 output tokens (NFR-04: < 60s budget) |

### 7.2 End-to-End Scenarios

| Scenario | LLM Calls | Total Latency | Within Budget? |
|----------|-----------|---------------|----------------|
| **Happy path** (no retries, no social) | 3 | ~15-28s | Yes (< 120s, < 4 LLM calls) |
| **Happy path + social** | 4 | ~15-28s main + ~5-8s social (parallel) | Yes (< 120s, = 4 LLM calls) |
| **Single retry** (one step retries once) | 4 | ~25-45s | Yes (< 120s) |
| **Multiple retries** (two steps retry) | 5 | ~40-70s | Yes (< 120s) |
| **Social with quality regen** (US-U04, 2 regens) | 6 | ~50-70s main + social | Yes (< 120s; social is parallel) |
| **Worst case** (max retries on composition + social regen) | 7 | ~70-90s | Yes (< 120s) |
| **Degraded** (composition fails after all retries) | 4 | ~30-50s | Yes (narrative-only post) |

### 7.3 Token Cost Projection (Per Cycle)

| Step | Input Tokens | Output Tokens | Estimated Cost (Claude Sonnet-class) |
|------|-------------|---------------|--------------------------------------|
| MoodEngine | ~800 | ~200 | ~$0.004 |
| CompositionGenerator | ~600 | ~300 | ~$0.004 |
| FeedComposer | ~1000 | ~300 | ~$0.005 |
| SocialEngine (if triggered) | ~1000 | ~200 | ~$0.004 |
| **Total per cycle (happy path)** | **~2400** | **~800** | **~$0.013** |
| **Total per cycle (with social)** | **~3400** | **~1000** | **~$0.017** |

Assuming ~48 cycles per day (one per 30 minutes): **~$0.62-$0.82/day**.

## 8. Acceptance Criteria

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| AC-01 | End-to-end pipeline (weather input to feed post published) completes in < 120 seconds on 95th percentile | Integration test with latency instrumentation over 50 runs |
| AC-02 | Happy-path execution uses exactly 3 LLM calls (mood, composition, narrative) | LLM call counter assertion in integration test |
| AC-03 | Happy-path + social execution uses at most 4 LLM calls | LLM call counter assertion |
| AC-04 | MoodEngine failure triggers retry (up to 2x) then falls back to cached mood; pipeline continues | Fault injection test: mock LLM timeout |
| AC-05 | CompositionGenerator failure triggers retry (up to 3x) then skips; FeedComposer publishes narrative-only post | Fault injection test: mock LLM error |
| AC-06 | SocialEngine failure does not block or delay main pipeline | Concurrent execution test: slow social mock does not increase main pipeline latency |
| AC-07 | Social responses are generated within 60 seconds of mention (US-E04) | Latency measurement from mention event to response posted |
| AC-08 | All LLM calls log prompt version, input hash, output, latency, and token count (NFR-09) | Log inspection in integration test |
| AC-09 | Circuit breaker opens after 3 consecutive failures and auto-recovers after 5 minutes | Fault injection test with time manipulation |
| AC-10 | Duplicate weather events within 30s are deduplicated (US-U05) | Unit test: send two events 15s apart, verify only one pipeline run |

## 9. Rejected Patterns

### 9.1 Orchestrator-Worker (Rejected)

**Pattern:** A central orchestrator component receives events, decides which workers to invoke, routes data between them, and manages overall workflow state.

**Reasons for rejection:**
- **Unnecessary complexity.** The main workflow is linear: each step depends on the output of the previous step. An orchestrator adds a routing/decision layer that provides no benefit when the route is always the same.
- **No parallelism gain.** The data dependencies in the main path (mood depends on weather, composition depends on mood, post depends on composition) mean an orchestrator cannot parallelize these steps.
- **Additional failure point.** The orchestrator itself becomes a single point of failure that must be monitored and tested independently.
- **Overhead for MVP.** Sprint S-01 prioritizes shipping a working agent. The orchestrator pattern is appropriate if the workflow becomes dynamic (e.g., conditional branches based on weather severity), which is not in scope.

### 9.2 Pure Agent Swarm (Rejected)

**Pattern:** Each component (MoodEngine, CompositionGenerator, etc.) is an autonomous agent that communicates via a shared message bus. No central control; agents react to events.

**Reasons for rejection:**
- **Non-deterministic ordering.** Swarm patterns make execution order harder to predict and debug. For a workflow with strict data dependencies, this introduces unnecessary risk.
- **Observability challenges.** Tracing a single weather event through multiple autonomous agents requires distributed tracing infrastructure that is overkill for MVP.
- **Cost unpredictability.** Autonomous agents may trigger redundant LLM calls if coordination is imperfect, violating the 4-call ceiling.
- **Latency variance.** Message-bus-based communication adds per-hop latency and makes total latency harder to bound.

### 9.3 Event Sourcing / CQRS (Rejected)

**Pattern:** All state changes are stored as immutable events. Components read from event streams and project current state.

**Reasons for rejection:**
- **Architectural overkill.** The system has a single writer (the pipeline) and minimal read patterns. Event sourcing adds infrastructure complexity (event store, projections, snapshots) without proportional benefit.
- **Latency overhead.** Event serialization and store writes at each step add latency to a time-sensitive pipeline.
- **Deferred consideration.** If multi-city support (S-04+) requires replaying agent history or auditing state changes, event sourcing can be evaluated then.

## 10. Consequences

### 10.1 Positive

- **Simple mental model.** The pipeline is easy to explain, diagram, and reason about. New contributors can understand the flow in minutes.
- **Predictable latency.** Total time = sum of steps. No coordination overhead, no message bus hops, no orchestrator decision time.
- **Natural observability boundaries.** Each step transition is an instrumentation point. Logging step entry/exit with payloads gives full traceability with minimal effort.
- **Independent testability.** Each step can be unit-tested with mock inputs/outputs. Integration tests chain steps together.
- **Graceful degradation.** The error handling matrix defines clear fallbacks at each step. The pipeline can produce partial output (narrative without track, minimal post without narrative) rather than failing entirely.
- **Social responsiveness.** The parallel social branch means Zephyr Drift can respond to mentions within seconds of mood computation, well within the 60-second budget, without waiting for composition or posting to complete.

### 10.2 Negative

- **No main-path parallelism.** The sequential nature means the main pipeline latency is the sum of all steps. If future steps become slower (e.g., real music rendering in S-03+), the total latency grows linearly.
- **Tight coupling at step boundaries.** Each step's output schema is the next step's input schema. Changing a schema requires updating adjacent steps. Mitigated by explicit data contracts (Section 5.2).
- **Single social fork point.** The social branch only receives the mood vector, not the track reference or narrative. If social responses should reference "the track I just composed," the branch must either wait for the main pipeline or use stale data from the previous cycle. Acceptable for MVP; revisit if social richness requirements increase.
- **Scaling ceiling.** A single pipeline instance processes one weather event at a time. If event frequency increases significantly (e.g., multi-city in S-04+), the pattern may need to evolve to concurrent pipelines per city. Not a concern for MVP's single-city, single-agent scope.

---

*Specifications are the source of truth, not code.* -- BHIL
