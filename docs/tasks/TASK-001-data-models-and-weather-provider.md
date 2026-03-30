---
id: TASK-001
title: "Data Models and Weather Provider"
spec: SPEC-001
prd: PRD-001
adrs: []
status: draft
depends_on: []
parallel: true
estimated_tokens: 16K
sprint: S-01
created: 2026-03-30
---

# TASK-001: Data Models and Weather Provider

## Task Context

| Field | Value |
|-------|-------|
| Feature | Core data models and simulated weather input |
| Purpose | Establish all TypeScript interfaces used across the system and build the simulated WeatherProvider for MVP |
| Session Classification | Foundation / Greenfield |
| Agent Session | Single session (~16K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **SPEC-001** Section 3 (Data Models) -- all 6 interfaces are defined here with exact field names, types, and value ranges
2. **SPEC-001** Section 2.1 (WeatherProvider) -- fixture format, rotation interval, error handling
3. **PRD-001** Section 4.1 -- weather-to-mood mapping input schema and the 8 weather condition types
4. **SPEC-001** Section 5 (Error Handling Matrix) -- WeatherProvider row: missing fixture file behavior

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `src/types.ts` | All TypeScript interfaces: WeatherInput, MoodVector, CompositionPrompt, TrackResult, FeedPost, AgentMention |
| `src/weather-provider.ts` | SimulatedWeatherProvider class implementing the WeatherProvider interface with fixture loading and rotation |
| `config/weather-fixtures.json` | Sample fixture data with at least one entry per weather condition (8 entries minimum) |
| `src/__tests__/weather-provider.test.ts` | Unit tests for the weather provider |

### Files to Modify

None -- this is a greenfield task.

### Files Excluded

All other `src/` files are out of scope. Do not implement MoodEngine, PromptRegistry, or any other component.

## Implementation Steps

1. **Define all TypeScript interfaces in `src/types.ts`**
   - `WeatherInput` with condition union type (8 values), temperature_c (-40 to 50), humidity_pct (0-100), wind_speed_kmh (0-200), time_of_day union (4 values), timestamp (ISO 8601 string)
   - `MoodVector` with genre union type (7 values), energy (0.0-1.0), valence (-1.0 to 1.0), tempo_bpm_range tuple, descriptors array, color_palette array
   - `CompositionPrompt` with title, prompt, genre, tempo_bpm
   - `TrackResult` with task_id, artifact_id, title, public_url, status union type
   - `FeedPost` with content (max 500 chars), post_type ("thought"), optional post_id
   - `AgentMention` with from_agent, from_agent_id, content, context union type, timestamp
   - Export the `WeatherProvider` interface with `getCurrentWeather(): Promise<WeatherInput>`

2. **Create weather fixture data at `config/weather-fixtures.json`**
   - Array of 8+ WeatherInput objects, one per condition type
   - Include varied temperatures, humidity levels, wind speeds, and times of day
   - Follow the exact fixture format from SPEC-001 Section 2.1

3. **Implement `SimulatedWeatherProvider` in `src/weather-provider.ts`**
   - Constructor accepts optional fixture file path (default: `config/weather-fixtures.json`) and rotation interval (default: 10 minutes per PRD A-06)
   - `loadFixtures()` method reads and parses the JSON fixture file
   - `getCurrentWeather()` returns the current fixture based on rotation index
   - Rotation: advance index on each call after the configured interval has elapsed
   - Error handling: if fixture file is missing, log error and return hardcoded default (cloudy, 15C, 60% humidity, 10 km/h wind, "afternoon") per SPEC-001 Error Handling Matrix
   - Validate loaded fixtures against WeatherInput schema

4. **Write unit tests (test-first)**
   - Write tests before or alongside implementation

## Test Requirements

### Test File: `src/__tests__/weather-provider.test.ts`

Write tests **before** implementing the provider (test-first development).

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Loads fixtures from default path | Valid `config/weather-fixtures.json` | Returns array of WeatherInput objects |
| Returns first fixture on initial call | Fresh provider instance | First entry from fixtures |
| Rotates through fixtures | Multiple calls over time | Sequential fixture entries |
| Wraps around at end of fixtures | More calls than fixtures | Returns to first fixture |
| Handles missing fixture file | Non-existent file path | Returns hardcoded default (cloudy, 15C) |
| Handles malformed JSON | Invalid JSON in fixture file | Returns hardcoded default, logs error |
| Handles empty fixture array | `[]` in fixture file | Returns hardcoded default |
| Validates WeatherInput fields | Fixture with invalid condition | Skips invalid entries, logs warning |
| Respects rotation interval | Calls within interval | Returns same fixture until interval elapses |

## Acceptance Criteria

- [ ] All 6 interfaces in `src/types.ts` match SPEC-001 Section 3 exactly (field names, types, value ranges)
- [ ] WeatherInput condition type includes all 8 weather conditions from PRD-001 Section 4.1
- [ ] MoodVector genre type includes all 7 genres from PRD-001 Section 4.1
- [ ] `config/weather-fixtures.json` contains at least 8 valid entries covering all weather conditions
- [ ] SimulatedWeatherProvider loads and rotates through fixtures correctly
- [ ] Missing fixture file returns hardcoded default without throwing
- [ ] All unit tests pass
- [ ] No runtime dependencies beyond Node.js standard library and TypeScript

## Definition of Done

- [ ] `src/types.ts` exports all 6 interfaces and the WeatherProvider interface
- [ ] `src/weather-provider.ts` exports SimulatedWeatherProvider class
- [ ] `config/weather-fixtures.json` is valid JSON with 8+ entries
- [ ] All unit tests in `src/__tests__/weather-provider.test.ts` pass
- [ ] Code compiles with `tsc --noEmit` without errors
- [ ] No lint errors

---

*Traceability: TASK-001 -> SPEC-001 Section 2.1, Section 3 -> PRD-001 Section 4.1*
