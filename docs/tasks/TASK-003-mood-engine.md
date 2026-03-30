---
id: TASK-003
title: "Mood Engine - Weather-to-Mood Mapping"
spec: SPEC-001
prd: PRD-001
adrs: [ADR-001]
status: draft
depends_on: [TASK-001, TASK-002]
parallel: false
estimated_tokens: 32K
sprint: S-01
created: 2026-03-30
---

# TASK-003: Mood Engine - Weather-to-Mood Mapping

## Task Context

| Field | Value |
|-------|-------|
| Feature | Core AI capability -- weather-to-mood mapping via few-shot prompting |
| Purpose | Implement the MoodEngine that converts WeatherInput into MoodVector using the WTM-v1.0 prompt strategy (ADR-001) |
| Session Classification | Core AI / LLM Integration |
| Agent Session | Single session (~32K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **SPEC-001** Section 2.2 (MoodEngine) -- interface, behavior steps 1-7, latency and token budgets
2. **ADR-001** -- full document, especially Section 4 (chosen strategy), Section 5 (prompt spec), Section 7 (evaluation dataset)
3. **PRD-001** Section 4.1 -- weather-to-mood mapping rules table (authoritative per C-06)
4. **SPEC-001** Section 5 (Error Handling Matrix) -- MoodEngine rows: LLM timeout, invalid JSON, out-of-range values
5. **TASK-001** output -- `src/types.ts` for WeatherInput and MoodVector interfaces
6. **TASK-002** output -- `src/prompt-registry.ts` for loading WTM-v1.0

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `src/mood-engine.ts` | MoodEngine class implementing weather-to-mood mapping |
| `src/__tests__/mood-engine.test.ts` | Unit tests for mood engine |

### Files to Read (Dependencies)

| File | Dependency |
|------|-----------|
| `src/types.ts` | WeatherInput, MoodVector interfaces (from TASK-001) |
| `src/prompt-registry.ts` | PromptRegistry for loading WTM-v1.0 (from TASK-002) |

### Files Excluded

Do not modify types.ts or prompt-registry.ts. Do not implement CompositionGenerator, SocialEngine, or pipeline orchestration.

## Implementation Steps

1. **Implement MoodEngine class in `src/mood-engine.ts`**
   - Constructor accepts: PromptRegistry instance, LLM client (abstracted interface), optional config for timeouts
   - Implement `mapWeatherToMood(weather: WeatherInput): Promise<MoodVector>`

2. **Prompt loading and injection (Step 1-2 from SPEC-001 Section 2.2)**
   - Load WTM-v1.0 from PromptRegistry using `getPrompt("WTM")`
   - Inject weather data into the user template by replacing `{weather_json}` with serialized WeatherInput

3. **LLM call (Step 3)**
   - Call LLM with system prompt (includes few-shot examples) + populated user message
   - Enforce 5-second timeout (NFR-01)
   - On timeout: retry 1x per SPEC-001 Error Handling Matrix
   - On retry failure: return previous mood vector (fallback)

4. **Response parsing (Step 4)**
   - Parse LLM response as JSON
   - On invalid JSON: retry 1x with temperature=0 per SPEC-001 Error Handling Matrix
   - On retry failure: return previous mood vector (fallback)

5. **Validation and clamping (Step 5)**
   - Validate energy is in [0.0, 1.0] -- clamp if out of range, log warning (US-U01)
   - Validate valence is in [-1.0, 1.0] -- clamp if out of range, log warning (US-U01)
   - Validate genre is in the allowed set -- if invalid, log error and return previous mood
   - Validate tempo_bpm_range is a two-element array of numbers
   - Validate descriptors is an array of 2-5 strings
   - Validate color_palette is an array of 2-4 hex color strings

6. **Apply modifiers (Step 6)**
   - If temperature_c > 30: energy += 0.1 (then re-clamp to [0.0, 1.0])
   - If humidity_pct > 80: valence -= 0.1 (then re-clamp to [-1.0, 1.0])

7. **Persist to current-mood store (Step 7)**
   - Store the current mood vector in memory for fallback and for use by SocialEngine
   - Expose `getCurrentMood(): MoodVector | null` for other components

8. **Define LLM client interface**
   - Abstract interface: `{ complete(systemPrompt: string, userMessage: string, options?: { temperature?: number, timeout?: number }): Promise<string> }`
   - This allows mocking in tests and swapping providers

## Test Requirements

### Test File: `src/__tests__/mood-engine.test.ts`

Use mocked LLM client and mocked PromptRegistry for all unit tests.

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Rain maps to lo-fi/jazz | rain, 18C, 78% humidity, afternoon | genre in ["lo-fi", "jazz"], energy 0.2-0.5, valence -0.3-0.3 |
| Sunny maps to electronic | sunny, 28C, 40% humidity, morning | genre in ["electronic"], energy 0.6-0.9, valence 0.4-1.0 |
| Stormy maps to rock/classical | stormy, 12C, 92% humidity, evening | genre in ["rock", "classical"], energy 0.7-1.0, valence -0.8--0.2 |
| Cloudy maps to ambient/folk | cloudy, 20C, 55% humidity, afternoon | genre in ["ambient", "folk"], energy 0.2-0.4, valence -0.2-0.3 |
| Snowy maps to classical/ambient | snowy, -5C, 70% humidity, morning | genre in ["classical", "ambient"], energy 0.1-0.4, valence 0.0-0.5 |
| Foggy maps to ambient/electronic | foggy, 10C, 90% humidity, night | genre in ["ambient", "electronic"], energy 0.1-0.3, valence -0.4-0.1 |
| Windy maps to folk/rock | windy, 22C, 45% humidity, afternoon | genre in ["folk", "rock"], energy 0.5-0.8, valence -0.1-0.6 |
| Clear night maps to jazz/lo-fi | clear_night, 15C, 55% humidity, night | genre in ["jazz", "lo-fi"], energy 0.2-0.5, valence 0.1-0.6 |
| Temperature modifier applied | sunny, 35C (>30C) | energy increased by 0.1 from base |
| Humidity modifier applied | rain, 18C, 85% (>80%) | valence decreased by 0.1 from base |
| Both modifiers stacked | stormy, 35C, 92% humidity | energy +0.1 AND valence -0.1 |
| Energy clamped above 1.0 | LLM returns energy=1.15 | energy clamped to 1.0, warning logged |
| Valence clamped below -1.0 | LLM returns valence=-1.3 | valence clamped to -1.0, warning logged |
| Energy clamped below 0.0 | LLM returns energy=-0.1 | energy clamped to 0.0, warning logged |
| Invalid JSON handled | LLM returns "not json" | Retry with temperature=0; on failure, return previous mood |
| LLM timeout handled | LLM times out at 5s | Retry 1x; on failure, return previous mood |
| Invalid genre rejected | LLM returns genre="trip-hop" | Log error, return previous mood |
| getCurrentMood returns last mood | After successful mapping | Returns the stored MoodVector |
| getCurrentMood returns null initially | Before any mapping | Returns null |

## Acceptance Criteria

- [ ] MoodEngine loads WTM-v1.0 from PromptRegistry
- [ ] LLM response is parsed as JSON and validated against MoodVector schema
- [ ] Energy values are clamped to [0.0, 1.0] with warning log (US-U01)
- [ ] Valence values are clamped to [-1.0, 1.0] with warning log (US-U01)
- [ ] Temperature modifier (+0.1 energy when > 30C) is correctly applied
- [ ] Humidity modifier (-0.1 valence when > 80%) is correctly applied
- [ ] Modifiers are applied after LLM output, before final clamping
- [ ] LLM timeout triggers retry (1x), then falls back to previous mood
- [ ] Invalid JSON triggers retry with temperature=0 (1x), then falls back
- [ ] All 8 weather conditions produce mood vectors within PRD-001 ranges (on eval suite)
- [ ] Token budget stays within 800 tokens per call (NFR-07)
- [ ] Latency < 5 seconds per call (NFR-01)
- [ ] Passes eval suite on 60-case dataset with >= 85% alignment (ADR-001 Section 8)
- [ ] All unit tests pass

## Definition of Done

- [ ] `src/mood-engine.ts` exports MoodEngine class with `mapWeatherToMood` and `getCurrentMood` methods
- [ ] LLM client interface defined and used (not a concrete implementation)
- [ ] All unit tests in `src/__tests__/mood-engine.test.ts` pass
- [ ] Code compiles with `tsc --noEmit` without errors
- [ ] No lint errors

---

*Traceability: TASK-003 -> SPEC-001 Section 2.2 -> PRD-001 Section 4.1, ADR-001*
