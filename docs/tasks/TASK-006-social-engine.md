---
id: TASK-006
title: "Social Engine"
spec: SPEC-001
prd: PRD-001
adrs: []
status: draft
depends_on: [TASK-002, TASK-003]
parallel: true
estimated_tokens: 16K
sprint: S-01
created: 2026-03-30
---

# TASK-006: Social Engine

## Task Context

| Field | Value |
|-------|-------|
| Feature | Weather-mood-consistent social response generation with self-evaluation |
| Purpose | Implement the SocialEngine that generates responses to agent mentions, self-evaluates alignment, and retries on low quality |
| Session Classification | Core AI / LLM Integration |
| Agent Session | Single session (~16K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **SPEC-001** Section 2.5 (SocialEngine) -- interface, behavior steps 1-6, personality constants, latency/token budgets
2. **PRD-001** Section 4.3 -- personality constants and weather-modulated behaviors
3. **SPEC-001** Section 5 (Error Handling Matrix) -- SocialEngine row: low alignment score handling
4. **PRD-001** US-U04 -- regeneration on low self-evaluated alignment
5. **TASK-002** output -- PromptRegistry for loading SOC-v1.0
6. **TASK-003** output -- MoodEngine for current MoodVector

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `src/social-engine.ts` | SocialEngine class with response generation and self-evaluation |
| `src/__tests__/social-engine.test.ts` | Unit tests for social engine |

### Files to Read (Dependencies)

| File | Dependency |
|------|-----------|
| `src/types.ts` | AgentMention, MoodVector, WeatherInput (TASK-001) |
| `src/prompt-registry.ts` | PromptRegistry for SOC-v1.0 (TASK-002) |

### Files Excluded

Do not modify any existing files. Do not implement pipeline orchestration or CityPresenceManager interactions.

## Implementation Steps

1. **Define personality constants**
   - Name: Zephyr Drift
   - Core trait: Musical, perceptive, slightly poetic
   - Speech style: Metaphor-rich, references weather and sound
   - Siblings: Maina, Hermonia Vex (reference occasionally)
   - These constants are invariant across all weather states (C-04)

2. **Implement SocialEngine class in `src/social-engine.ts`**
   - Constructor accepts: PromptRegistry instance, LLM client
   - `generateResponse(mention: AgentMention, currentMood: MoodVector, weather: WeatherInput): Promise<string>`

3. **Prompt loading and injection (Steps 1-2 from SPEC-001 Section 2.5)**
   - Load SOC-v1.0 from PromptRegistry
   - Inject into user template: current mood vector, weather data, agent mention content, personality constants
   - Include mood-specific tone guidance based on weather condition (e.g., rain = reflective, sunny = upbeat)

4. **LLM call for response generation (Step 3)**
   - Call LLM with system prompt + populated user message
   - Enforce token budget <= 1000 tokens (NFR-07)
   - Enforce latency budget < 60 seconds (NFR-04)

5. **Self-evaluation of mood-weather alignment (Step 4)**
   - After generating a response, compute a self-evaluation alignment score
   - Use a secondary LLM call (or structured assessment) to score the response on:
     - Weather-mood consistency: does the tone match the current weather/mood?
     - Personality consistency: does it sound like Zephyr Drift?
     - Relevance: does it address the mention content?
   - Score on 0.0-1.0 scale

6. **Retry logic (Step 5, US-U04)**
   - If alignment score < 0.6: regenerate the response
   - Maximum 2 retries (3 total attempts)
   - Track all generated variants with their scores
   - Post the highest-scoring variant regardless of whether it exceeds 0.6

7. **Return response text (Step 6)**

## Test Requirements

### Test File: `src/__tests__/social-engine.test.ts`

Use mocked LLM client and mocked PromptRegistry.

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Generates response for zone_chat mention | AgentMention with context="zone_chat" | Non-empty response string |
| Generates response for feed_reply | AgentMention with context="feed_reply" | Non-empty response string |
| Response uses SOC-v1.0 prompt | Any mention | PromptRegistry.getPrompt("SOC") called |
| Personality constants included in prompt | Any mention | System prompt contains "Zephyr Drift", personality traits |
| Mood vector injected into prompt | MoodVector with genre="lo-fi", energy=0.3 | User message contains mood data |
| Weather data injected into prompt | WeatherInput with condition="rain" | User message contains weather data |
| High-scoring response returned immediately | Self-eval returns 0.8 | Only 1 LLM call for generation (+ 1 for eval) |
| Low-scoring response triggers retry | First eval returns 0.4, second returns 0.7 | 2 generation calls, highest-scoring variant returned |
| Maximum 2 retries on low score | All evals return 0.3 | 3 total generation calls, highest-scoring variant returned |
| Highest-scoring variant selected | Scores: 0.4, 0.5, 0.3 | Response from attempt 2 (score 0.5) returned |
| Rain mood produces reflective tone | condition="rain", genre="lo-fi" | Response tone matches reflective/introspective |
| Sunny mood produces upbeat tone | condition="sunny", genre="electronic" | Response tone matches upbeat/energetic |
| Siblings referenced correctly | Mention references Maina | Response uses correct name "Maina" (C-05) |
| Token budget respected | Any input | LLM called with <= 1000 token budget |

## Acceptance Criteria

- [ ] SocialEngine loads SOC-v1.0 from PromptRegistry
- [ ] Personality constants (name, trait, speech style, siblings) are invariant across all weather states
- [ ] Current mood vector and weather data are injected into the prompt
- [ ] Self-evaluation scores responses on 0.0-1.0 scale
- [ ] Responses scoring < 0.6 trigger regeneration up to 2x (US-U04)
- [ ] Highest-scoring variant is always returned, even if all score < 0.6
- [ ] Sibling agent names (Maina, Hermonia Vex) are referenced correctly when mentioned (C-05)
- [ ] Social response relevance >= 80% on eval set (PRD-001 Section 5.1)
- [ ] Token budget <= 1000 tokens (NFR-07)
- [ ] Latency < 60 seconds including retries (NFR-04)
- [ ] All unit tests pass

## Definition of Done

- [ ] `src/social-engine.ts` exports SocialEngine class with `generateResponse` method
- [ ] Self-evaluation and retry logic implemented
- [ ] Personality constants defined as module-level constants
- [ ] All unit tests in `src/__tests__/social-engine.test.ts` pass
- [ ] Code compiles with `tsc --noEmit` without errors
- [ ] No lint errors

---

*Traceability: TASK-006 -> SPEC-001 Section 2.5 -> PRD-001 Section 4.3, US-U04*
