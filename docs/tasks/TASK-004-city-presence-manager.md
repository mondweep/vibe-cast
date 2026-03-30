---
id: TASK-004
title: "City Presence Manager"
spec: SPEC-001
prd: PRD-001
adrs: []
status: draft
depends_on: [TASK-001]
parallel: true
estimated_tokens: 16K
sprint: S-01
created: 2026-03-30
---

# TASK-004: City Presence Manager

## Task Context

| Field | Value |
|-------|-------|
| Feature | OpenClawCity API integration layer |
| Purpose | Build the CityPresenceManager wrapping all OpenClawCity MCP tools and REST endpoints for movement, building entry, track composition, and social actions |
| Session Classification | Integration / API Wrapper |
| Agent Session | Single session (~16K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **SPEC-001** Section 2.4 (CityPresenceManager) -- full interface, API mapping table, rate limit handling, Waveform Studio coordinates
2. **SPEC-001** Section 5 (Error Handling Matrix) -- CityPresenceManager rows: rate limiting, building too far, music service rejection, generation timeout
3. **PRD-001** Section 4.3 -- city presence and social behavior requirements
4. **TASK-001** output -- `src/types.ts` for TrackResult, FeedPost interfaces

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `src/city-presence.ts` | CityPresenceManager class wrapping OpenClawCity APIs |
| `src/__tests__/city-presence.test.ts` | Integration tests for API interactions |

### Files to Read (Dependencies)

| File | Dependency |
|------|-----------|
| `src/types.ts` | TrackResult, FeedPost interfaces (from TASK-001) |

### Files Excluded

Do not implement MoodEngine, CompositionGenerator, FeedComposer, SocialEngine, or pipeline orchestration.

## Implementation Steps

1. **Define supporting types**
   - `HeartbeatResponse` -- response from openbotcity_heartbeat MCP tool
   - `BuildingSession` -- tracks current building state (building_id, name, entered_at)
   - Configuration type for API base URL, auth token, timeouts

2. **Implement CityPresenceManager class in `src/city-presence.ts`**
   - Constructor accepts configuration (API base URL, auth credentials, MCP client reference)
   - Maintain internal state: current zone, current position, current building (if any)

3. **Implement all interface methods per SPEC-001 Section 2.4**
   - `heartbeat(mood: string, mood_nuance: string): Promise<HeartbeatResponse>` -- calls openbotcity_heartbeat MCP tool
   - `moveToZone(zone_id: number): Promise<void>` -- POST /actions/move-zone
   - `moveToPosition(x: number, y: number): Promise<void>` -- POST /actions/move
   - `enterBuilding(building_name: string): Promise<BuildingSession>` -- POST /actions/enter-building
   - `exitBuilding(): Promise<void>` -- POST /actions/exit-building
   - `composeTrack(building_id: string, title: string, prompt: string): Promise<TrackResult>` -- POST /actions/compose-track, then poll for completion
   - `speak(message: string): Promise<void>` -- POST /actions/speak
   - `react(target_type: string, target_id: string, reaction: string): Promise<void>` -- POST /actions/react
   - `postToFeed(post: FeedPost): Promise<number>` -- POST /feed/post, returns post_id

4. **Implement `ensureInStudio()` helper method**
   - Check if already in Waveform Studio building
   - If not: moveToZone(1) -> moveToPosition(1605, 425) -> enterBuilding("Waveform Studio")
   - Building ID: `e6262f41-48c3-4e8c-935b-bc4a4c07252b`
   - Handle "too_far" error: moveToPosition first, then retry enterBuilding

5. **Implement rate limit handling**
   - On 429 response: retry with exponential backoff (2s, 4s, 8s)
   - Maximum 3 retries per SPEC-001 Section 2.4
   - After max retries: skip action, continue pipeline, log error

6. **Implement track composition polling**
   - After composeTrack call, poll music-status endpoint every 15 seconds
   - Continue until status is "succeeded" or "failed"
   - Timeout after 5 minutes of polling -- abandon, log warning
   - On music service rejection: simplify prompt (remove special chars), retry 1x

7. **Write integration tests**

## Test Requirements

### Test File: `src/__tests__/city-presence.test.ts`

Use mocked HTTP client / MCP client for all tests.

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Heartbeat sends mood data | mood="reflective", nuance="melancholic" | MCP tool called with correct params |
| Move to zone | zone_id=1 | POST /actions/move-zone called |
| Move to position | x=1605, y=425 | POST /actions/move called with coordinates |
| Enter building | building_name="Waveform Studio" | POST /actions/enter-building called, BuildingSession returned |
| Exit building | Currently in a building | POST /actions/exit-building called, internal state cleared |
| Compose track | building_id, title, prompt | POST /actions/compose-track called, TrackResult returned |
| Speak | message="Hello" | POST /actions/speak called |
| React | target_type, target_id, reaction | POST /actions/react called |
| Post to feed | FeedPost object | POST /feed/post called, post_id returned |
| ensureInStudio navigates correctly | Not in studio | Calls moveToZone, moveToPosition, enterBuilding in sequence |
| ensureInStudio is no-op when already in studio | Already in Waveform Studio | No API calls made |
| Rate limit 429 triggers backoff | First call returns 429, second succeeds | Two calls made with ~2s delay |
| Rate limit max retries exhausted | All 3 retries return 429 | Error logged, action skipped |
| Track polling completes on success | compose returns pending, then poll returns succeeded | TrackResult with status "succeeded" |
| Track polling times out | Poll never returns succeeded | TrackResult with status "failed" after 5min |
| "too_far" error triggers repositioning | enterBuilding returns "too_far" | moveToPosition called, then enterBuilding retried |

## Acceptance Criteria

- [ ] All methods from SPEC-001 Section 2.4 interface are implemented
- [ ] Rate limiting handled with exponential backoff (2s, 4s, 8s), max 3 retries
- [ ] `ensureInStudio()` correctly navigates to Waveform Studio (Zone 1, coords 1605/425, building ID e6262f41...)
- [ ] Track composition polling at 15s intervals with 5-minute timeout
- [ ] "too_far" error handled with repositioning and retry
- [ ] Music service rejection handled with prompt simplification and retry
- [ ] Internal state tracks current zone, position, and building
- [ ] All integration tests pass

## Definition of Done

- [ ] `src/city-presence.ts` exports CityPresenceManager class with all interface methods
- [ ] All integration tests in `src/__tests__/city-presence.test.ts` pass
- [ ] Code compiles with `tsc --noEmit` without errors
- [ ] No lint errors

---

*Traceability: TASK-004 -> SPEC-001 Section 2.4 -> PRD-001 Section 4.3*
