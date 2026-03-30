---
id: TASK-005
title: "Composition Generator and Feed Composer"
spec: SPEC-001
prd: PRD-001
adrs: []
status: draft
depends_on: [TASK-002, TASK-003, TASK-004]
parallel: false
estimated_tokens: 32K
sprint: S-01
created: 2026-03-30
---

# TASK-005: Composition Generator and Feed Composer

## Task Context

| Field | Value |
|-------|-------|
| Feature | Music composition prompt generation and feed post creation |
| Purpose | Implement CompositionGenerator (mood-to-music-prompt translation) and FeedComposer (poetic weather narrative posts) |
| Session Classification | Core AI / LLM Integration |
| Agent Session | Single session (~32K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **SPEC-001** Section 2.3 (CompositionGenerator) -- interface, output format, instrumentation mapping table, latency/token budgets
2. **SPEC-001** Section 2.6 (FeedComposer) -- interface, post structure, emoji mapping table, truncation rules
3. **PRD-001** Section 4.2 -- composition prompt output format
4. **PRD-001** Section 4.4 -- feed post structure
5. **SPEC-001** Section 5 (Error Handling Matrix) -- CompositionGenerator and FeedComposer rows
6. **TASK-002** output -- PromptRegistry for loading COMP-v1.0 and NARR-v1.0
7. **TASK-003** output -- MoodEngine for MoodVector
8. **TASK-004** output -- CityPresenceManager for TrackResult

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `src/composition-generator.ts` | CompositionGenerator class -- translates mood vectors into music studio prompts |
| `src/feed-composer.ts` | FeedComposer class -- creates weather narrative feed posts |
| `src/__tests__/composition-generator.test.ts` | Unit tests for composition generator |
| `src/__tests__/feed-composer.test.ts` | Unit tests for feed composer |

### Files to Read (Dependencies)

| File | Dependency |
|------|-----------|
| `src/types.ts` | MoodVector, WeatherInput, CompositionPrompt, TrackResult, FeedPost (TASK-001) |
| `src/prompt-registry.ts` | PromptRegistry for COMP-v1.0 and NARR-v1.0 (TASK-002) |

### Files Excluded

Do not modify any existing files. Do not implement pipeline orchestration.

## Implementation Steps

### CompositionGenerator

1. **Implement CompositionGenerator class in `src/composition-generator.ts`**
   - Constructor accepts: PromptRegistry instance, LLM client
   - `generatePrompt(mood: MoodVector, weather: WeatherInput): Promise<CompositionPrompt>`

2. **Mood-to-prompt translation**
   - Calculate tempo_bpm as midpoint of mood.tempo_bpm_range
   - Map energy to energy_descriptor: 0.0-0.3 = "low", 0.3-0.6 = "moderate", 0.6-0.8 = "high", 0.8-1.0 = "intense"
   - Join mood.descriptors with ", " for mood line

3. **Instrumentation mapping (from SPEC-001 Section 2.3 table)**
   - Implement lookup from genre to base instruments:
     - lo-fi: vinyl crackle, muted piano, soft drums, tape hiss
     - jazz: piano, upright bass, brushed drums, saxophone
     - electronic: synth pads, arpeggiated sequences, kick drum, hi-hats
     - classical: strings, piano, woodwinds, gentle percussion
     - ambient: pad layers, field recordings, reverb swells, drones
     - rock: electric guitar, bass, drums, distortion
     - folk: acoustic guitar, violin, hand drums, flute

4. **Weather narrative fragment generation**
   - Load COMP-v1.0 from PromptRegistry
   - Call LLM with mood and weather data to generate a short narrative fragment
   - Enforce 10-second timeout (NFR-02), token budget 600 tokens (NFR-07)

5. **Assemble final CompositionPrompt**
   - Generate a creative track title from mood descriptors and weather
   - Format the prompt string per SPEC-001 Section 2.3 output format
   - Return CompositionPrompt with title, prompt, genre, tempo_bpm

### FeedComposer

6. **Implement FeedComposer class in `src/feed-composer.ts`**
   - Constructor accepts: PromptRegistry instance, LLM client
   - `composePost(weather: WeatherInput, mood: MoodVector, track: TrackResult): Promise<FeedPost>`

7. **Emoji mapping (from SPEC-001 Section 2.6 table)**
   - Implement lookup from weather condition to emoji:
     - rain: rain emoji
     - sunny: sun emoji
     - stormy: thunder cloud emoji
     - cloudy: cloud emoji
     - snowy: snowflake emoji
     - foggy: fog emoji
     - windy: wind emoji
     - clear_night: crescent moon emoji

8. **Narrative generation**
   - Load NARR-v1.0 from PromptRegistry
   - Call LLM with weather, mood, and track data
   - Generate 40-200 word poetic narrative connecting weather to mood to music

9. **Post assembly**
   - Format per SPEC-001 Section 2.6 post structure:
     ```
     [Emoji] [Poetic title]

     [Narrative]

     Now playing: [Track name] | [Genre] | [Tempo] BPM
     Weather: [condition], [temp]C, [humidity]% humidity
     Mood: [descriptors]
     ```
   - Set post_type to "thought"

10. **Truncation (US-U03)**
    - If post content exceeds 500 characters, truncate the narrative portion with ellipsis
    - Never truncate the metadata lines (Now playing, Weather, Mood)

## Test Requirements

### Test File: `src/__tests__/composition-generator.test.ts`

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Lo-fi genre prompt | lo-fi mood vector | Prompt contains "lo-fi", correct instruments |
| Jazz genre prompt | jazz mood vector | Prompt contains "jazz", piano/bass/drums/sax |
| Electronic genre prompt | electronic mood vector | Prompt contains "electronic", synth pads/arpeggiated |
| Classical genre prompt | classical mood vector | Prompt contains "classical", strings/piano/woodwinds |
| Ambient genre prompt | ambient mood vector | Prompt contains "ambient", pad layers/field recordings |
| Rock genre prompt | rock mood vector | Prompt contains "rock", electric guitar/bass/drums |
| Folk genre prompt | folk mood vector | Prompt contains "folk", acoustic guitar/violin |
| Tempo calculated as midpoint | tempo_bpm_range [60, 90] | tempo_bpm = 75 |
| Low energy descriptor | energy = 0.2 | Contains "low" energy descriptor |
| High energy descriptor | energy = 0.75 | Contains "high" energy descriptor |
| Intense energy descriptor | energy = 0.95 | Contains "intense" energy descriptor |
| Output format matches SPEC | Any valid input | Prompt matches prescribed format |

### Test File: `src/__tests__/feed-composer.test.ts`

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Rain emoji mapping | condition = "rain" | Post starts with rain emoji |
| Sunny emoji mapping | condition = "sunny" | Post starts with sun emoji |
| Stormy emoji mapping | condition = "stormy" | Post starts with thunder emoji |
| Cloudy emoji mapping | condition = "cloudy" | Post starts with cloud emoji |
| Snowy emoji mapping | condition = "snowy" | Post starts with snowflake emoji |
| Foggy emoji mapping | condition = "foggy" | Post starts with fog emoji |
| Windy emoji mapping | condition = "windy" | Post starts with wind emoji |
| Clear night emoji mapping | condition = "clear_night" | Post starts with moon emoji |
| Post under 500 chars | Normal-length narrative | Content length <= 500, no truncation |
| Post truncated at 500 chars | Very long narrative | Content length = 500, ends with ellipsis |
| Post contains track info | Valid TrackResult | Contains "Now playing: [title]" |
| Post contains weather summary | Valid WeatherInput | Contains weather condition, temp, humidity |
| Post contains mood descriptors | Valid MoodVector | Contains mood descriptors |
| Post type is "thought" | Any input | post_type = "thought" |
| Metadata lines never truncated | Long narrative forcing truncation | "Now playing", "Weather", "Mood" lines intact |

## Acceptance Criteria

- [ ] CompositionGenerator produces prompts matching SPEC-001 Section 2.3 format exactly
- [ ] All 7 genres have correct instrumentation mapping
- [ ] Tempo is calculated as midpoint of mood's tempo_bpm_range
- [ ] Weather narrative fragment is generated via LLM using COMP-v1.0
- [ ] FeedComposer produces posts matching SPEC-001 Section 2.6 structure
- [ ] All 8 weather conditions map to correct emojis
- [ ] Posts exceeding 500 characters are truncated with ellipsis (US-U03)
- [ ] Metadata lines (Now playing, Weather, Mood) are never truncated
- [ ] Narrative is 40-200 words when not truncated
- [ ] Composition latency < 10 seconds (NFR-02), token budget <= 600 (NFR-07)
- [ ] All unit tests pass

## Definition of Done

- [ ] `src/composition-generator.ts` exports CompositionGenerator class
- [ ] `src/feed-composer.ts` exports FeedComposer class
- [ ] All unit tests pass in both test files
- [ ] Code compiles with `tsc --noEmit` without errors
- [ ] No lint errors

---

*Traceability: TASK-005 -> SPEC-001 Section 2.3, 2.6 -> PRD-001 Section 4.2, 4.4*
