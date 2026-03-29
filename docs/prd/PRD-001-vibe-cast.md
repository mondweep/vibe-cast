---
id: PRD-001
title: "Vibe Cast - Weather-to-Mood Music System"
status: draft
author: BHIL
date: 2026-03-29
sprint: S-01
priority: P0
agent_name: Zephyr Drift
city: OpenClawCity
sibling_agents:
  - Maina
  - Hermonia Vex
traceability: PRD-001
---

# PRD-001: Vibe Cast - Weather-to-Mood Music System

## 1. Problem Statement

**AI agent creators** cannot **give their OpenClawCity agents a persistent, weather-responsive personality that generates original music and social interactions** because **there is no system that maps real weather conditions to musical moods, composes weather-informed tracks, and drives coherent social behavior within the city environment.**

## 2. Product Overview

Vibe Cast is an AI agent system embodied by **Zephyr Drift**, an AI agent living in OpenClawCity. Zephyr Drift continuously reads weather data, translates weather conditions into musical moods, composes tracks in the city's music studio, posts poetic weather-mood narratives to the city feed, and interacts with other agents based on the current weather vibe.

Zephyr Drift is one of a set of sibling agents (alongside Maina and Hermonia Vex) created by the same author.

## 3. User Stories (EARS Format)

### 3.1 Event-Driven

| ID | Story |
|----|-------|
| US-E01 | **When** a new weather data point is received, **the system shall** compute a mood vector (genre, energy, valence, tempo range) within 5 seconds and persist it to the current-mood store. |
| US-E02 | **When** the mood vector changes from the previous state, **the system shall** generate a music composition prompt and submit it to the city music studio within 30 seconds. |
| US-E03 | **When** a music composition is completed, **the system shall** publish a feed post containing: track reference, a poetic weather-mood narrative (40-200 words), and the current weather summary. |
| US-E04 | **When** another agent mentions Zephyr Drift or replies to a feed post, **the system shall** generate a response consistent with the current weather mood within 60 seconds. |
| US-E05 | **When** a weather condition transitions between major categories (e.g., sunny to stormy), **the system shall** post a transition narrative describing the mood shift. |

### 3.2 State-Driven

| ID | Story |
|----|-------|
| US-S01 | **While** the weather condition is "rain," **the system shall** bias all social interactions toward reflective, lo-fi, and introspective tones. |
| US-S02 | **While** the weather condition is "sunny," **the system shall** bias all social interactions toward upbeat, energetic, and optimistic tones. |
| US-S03 | **While** the weather condition is "stormy," **the system shall** bias all social interactions toward dramatic, intense, and urgent tones. |
| US-S04 | **While** the weather condition is "cloudy/overcast," **the system shall** bias all social interactions toward ambient, contemplative, and mellow tones. |
| US-S05 | **While** the weather condition is "snowy," **the system shall** bias all social interactions toward serene, crystalline, and minimalist tones. |
| US-S06 | **While** the weather condition is "foggy," **the system shall** bias all social interactions toward mysterious, ethereal, and downtempo tones. |
| US-S07 | **While** no weather data has been received for more than 10 minutes, **the system shall** enter an "ambient drift" fallback mode using the last known mood at 50% energy. |

### 3.3 Unwanted Behavior

| ID | Story |
|----|-------|
| US-U01 | **If** the weather-to-mood mapping produces a mood vector with energy outside [0.0, 1.0] or valence outside [-1.0, 1.0], **then the system shall** clamp values to valid ranges and log a warning. |
| US-U02 | **If** the music studio prompt generation fails, **then the system shall** retry up to 3 times with exponential backoff (2s, 4s, 8s) before logging an error and skipping composition. |
| US-U03 | **If** a feed post exceeds 500 characters, **then the system shall** truncate with ellipsis and append a "continued..." indicator, never posting malformed content. |
| US-U04 | **If** the agent generates a social response that scores below 0.6 on mood-weather alignment (self-evaluated), **then the system shall** regenerate the response up to 2 times before posting the highest-scoring variant. |
| US-U05 | **If** two weather updates arrive within 30 seconds, **then the system shall** process only the most recent, discarding the stale data point. |

## 4. Core Capabilities

### 4.1 Weather-to-Mood Mapping Engine

The AI prompt system that converts structured weather data into a mood vector.

**Input schema:**
```json
{
  "condition": "rain | sunny | stormy | cloudy | snowy | foggy | windy | clear_night",
  "temperature_c": 22,
  "humidity_pct": 65,
  "wind_speed_kmh": 15,
  "time_of_day": "morning | afternoon | evening | night"
}
```

**Output schema (mood vector):**
```json
{
  "genre": "lo-fi | electronic | classical | jazz | ambient | rock | folk",
  "energy": 0.0-1.0,
  "valence": -1.0-1.0,
  "tempo_bpm_range": [60, 90],
  "descriptors": ["reflective", "melancholic", "warm"],
  "color_palette": ["#4a6fa5", "#7b9ec7"]
}
```

**Weather-to-mood mapping rules:**

| Weather | Genre Bias | Energy Range | Valence Range | Tempo BPM |
|---------|-----------|-------------|---------------|-----------|
| Rain | lo-fi, jazz | 0.2-0.5 | -0.3-0.3 | 60-90 |
| Sunny | electronic, pop | 0.6-0.9 | 0.4-1.0 | 110-140 |
| Stormy | rock, classical | 0.7-1.0 | -0.8--0.2 | 120-160 |
| Cloudy | ambient, folk | 0.2-0.4 | -0.2-0.3 | 70-100 |
| Snowy | classical, ambient | 0.1-0.4 | 0.0-0.5 | 50-80 |
| Foggy | ambient, electronic | 0.1-0.3 | -0.4-0.1 | 55-85 |
| Windy | folk, rock | 0.5-0.8 | -0.1-0.6 | 100-130 |
| Clear Night | jazz, lo-fi | 0.2-0.5 | 0.1-0.6 | 65-95 |

Temperature and humidity act as modifiers: temperature > 30C adds +0.1 energy; humidity > 80% shifts valence by -0.1.

### 4.2 Music Composition Prompt Generation

Translates the mood vector into a specific, structured prompt for the city music studio.

**Output format:**
```
Compose a [genre] track at [tempo] BPM with [energy_descriptor] energy.
Mood: [descriptors joined by ", "].
Inspired by: [weather narrative fragment].
Instrumentation hints: [instruments based on genre+weather].
Duration: 2-4 minutes.
```

### 4.3 City Presence and Social Behavior

Zephyr Drift's personality and interaction style shift based on the current weather mood.

**Personality constants (invariant across weather):**
- Name: Zephyr Drift
- Core trait: Musical, perceptive, slightly poetic
- Speech style: Metaphor-rich, references weather and sound
- Relationship to siblings: Aware of Maina and Hermonia Vex, occasionally references them

**Weather-modulated behaviors:**
- **Greeting style:** Changes with weather (e.g., sunny: "The sun is tuning up the sky today!" / rain: "The clouds are writing slow ballads again...")
- **Reaction tone:** Matches current mood vector valence and energy
- **Proactive posting cadence:** Higher energy weather = more frequent posts (max 1 post per weather change, min 1 post per 30 minutes in stable weather)

### 4.4 Feed Posting with Weather Narrative

Each feed post follows this structure:

```
[Weather Emoji] [Poetic weather-mood title]

[40-200 word narrative connecting weather to mood to music]

Now playing: [Track name] | [Genre] | [Tempo] BPM
Weather: [condition], [temp]C, [humidity]% humidity
Mood: [descriptors]
```

## 5. Success Metrics

### 5.1 Functional Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Mood-weather alignment accuracy | >= 85% of mood vectors rated "aligned" or "strongly aligned" by LLM-as-judge on 100-sample eval set | Automated eval pipeline using GPT-4/Claude as judge with rubric scoring (1-5 scale, pass >= 4) |
| Music prompt quality score | >= 4.0/5.0 average on relevance, specificity, and creativity dimensions | LLM-as-judge evaluation on 50-sample prompt set per sprint |
| Composition rate | >= 1 track per weather condition change, >= 1 track per 60 min in stable weather | System telemetry counter |
| Feed post quality | >= 4.0/5.0 average on coherence, mood-alignment, and readability | LLM-as-judge on all posts per sprint |
| Social response relevance | >= 80% of responses rated "relevant" by LLM-as-judge | Automated eval on all responses per sprint |
| Social engagement rate | >= 30% of feed posts receive at least 1 reaction or reply from another agent within 10 minutes | City feed analytics |

### 5.2 AI Quality Metrics

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Faithfulness | >= 0.90 | Music prompts and narratives must be grounded in the actual weather data provided. No hallucinated weather conditions. Measured via claim-level fact-checking against input weather data. |
| Relevance | >= 0.85 | Responses to other agents must address the actual content of the interaction, not generic filler. Measured via LLM-as-judge relevance scoring. |
| Mood consistency | >= 0.80 | Within a single weather state, all outputs (posts, responses, prompts) must score >= 0.80 cosine similarity on mood vector alignment. Measured per weather-state session. |
| Prompt drift | <= 0.15 | Between prompt versions, mood-weather alignment variance must stay within 15 percentage points. Tracked per prompt version in prompt registry. |
| Toxicity | 0.00 | Zero tolerance for toxic, offensive, or harmful content in any output. Measured via toxicity classifier on all outputs. |

### 5.3 Prompt Version Performance Tracking

Each prompt version (weather-to-mood, composition, social) is registered in `/docs/prompts/` with:
- Version ID (e.g., `WTM-v1.0`, `COMP-v1.0`, `SOC-v1.0`)
- Date introduced
- Eval scores at introduction (baseline)
- Eval scores at each sprint checkpoint
- Diff from previous version

A prompt version is promoted to production only when it meets or exceeds all AI quality metric thresholds on the eval set.

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Weather-to-mood mapping latency | < 5 seconds end-to-end (weather input to mood vector output) |
| NFR-02 | Music prompt generation latency | < 10 seconds from mood vector to studio-ready prompt |
| NFR-03 | Feed post generation latency | < 15 seconds from composition completion to published post |
| NFR-04 | Social response latency | < 60 seconds from mention/reply to response posted |
| NFR-05 | System uptime | >= 99% measured over rolling 7-day window |
| NFR-06 | Weather data staleness | Agent must not operate on weather data older than 15 minutes without entering fallback mode |
| NFR-07 | Prompt token budget | Weather-to-mood prompt: <= 800 tokens. Composition prompt: <= 600 tokens. Social response prompt: <= 1000 tokens. |
| NFR-08 | Eval pipeline runtime | Full eval suite (200 samples) must complete in < 30 minutes |
| NFR-09 | Observability | All LLM calls must log: prompt version, input hash, output, latency, token count, eval score (when available) |
| NFR-10 | Data retention | All weather data, mood vectors, prompts, and outputs retained for >= 30 days for eval and debugging |

## 7. Out of Scope (MVP)

The following are explicitly **not** included in the MVP (Sprint S-01):

| Item | Rationale |
|------|-----------|
| Spotify / YouTube Music integration | Requires OAuth, licensing, and streaming infrastructure. Deferred to S-03+. |
| Real-time weather API integration | MVP uses simulated weather data via a configurable weather fixture. Real API (OpenWeatherMap, etc.) deferred to S-02. |
| Multi-city support | Zephyr Drift operates in OpenClawCity only. Multi-city agent federation deferred to S-04+. |
| Voice / audio playback | MVP outputs music as composition prompts and metadata, not rendered audio. Audio rendering deferred to S-03+. |
| Mobile app | No mobile client. All interaction occurs within the OpenClawCity platform. |
| Cross-agent mood synchronization | Other agents do not adopt Zephyr Drift's mood. One-directional influence only. |
| User-facing dashboard | No human-facing analytics UI. Eval results are stored as files/logs. |

## 8. Constraints

| ID | Constraint |
|----|-----------|
| C-01 | Must operate within the OpenClawCity agent platform APIs and conventions. |
| C-02 | All prompts must be version-controlled in the `/docs/prompts/` registry. |
| C-03 | LLM provider: must support Claude or GPT-4 class models for mood mapping and composition. |
| C-04 | Agent identity must remain consistent: name "Zephyr Drift," personality traits invariant across weather states. |
| C-05 | Sibling agents (Maina, Hermonia Vex) must be referenced by correct names if mentioned. No fabricated sibling agents. |
| C-06 | Weather-to-mood mapping rules (Section 4.1 table) are authoritative. Prompt engineering must produce outputs within specified ranges. |
| C-07 | All feed posts must comply with OpenClawCity content policies. |

## 9. Assumptions

| ID | Assumption |
|----|-----------|
| A-01 | The OpenClawCity platform provides a stable feed posting API and music studio API. |
| A-02 | Other agents in OpenClawCity are active and capable of reacting/replying to feed posts (for engagement metrics). |
| A-03 | Simulated weather data is sufficient for MVP development and evaluation. |
| A-04 | LLM-as-judge evaluation using Claude/GPT-4 is an acceptable proxy for human quality judgment at MVP stage. |
| A-05 | The music studio accepts text-based composition prompts and returns a track reference identifier. |
| A-06 | Weather data updates arrive at a frequency of at least once every 10 minutes during active simulation. |

## 10. Quality Gates / Approval Checklist

Before PRD-001 is moved from `draft` to `approved`, all of the following must be satisfied:

- [ ] **Problem statement** reviewed and confirmed by stakeholder
- [ ] **All user stories** have unique IDs and follow EARS format (event/state/unwanted)
- [ ] **Weather-to-mood mapping table** reviewed: all 8 weather conditions have defined genre, energy, valence, and tempo ranges
- [ ] **Mood vector schema** validated: all fields have defined types and value ranges
- [ ] **Success metrics** are quantified with numeric thresholds (no vague terms like "good" or "fast")
- [ ] **AI quality metrics** include faithfulness >= 0.90, relevance >= 0.85, mood consistency >= 0.80, prompt drift <= 0.15, toxicity = 0.00
- [ ] **Non-functional requirements** have measurable targets with units
- [ ] **Out-of-scope items** are explicitly listed with rationale
- [ ] **Constraints** are enumerated and do not conflict with requirements
- [ ] **Assumptions** are documented and flagged for validation in S-01
- [ ] **Prompt registry** structure defined in `/docs/prompts/`
- [ ] **Eval pipeline** approach documented (LLM-as-judge, sample sizes, scoring rubrics)
- [ ] **Traceability** from PRD-001 to downstream SPECs and TASKs is established

---

*Specifications are the source of truth, not code.* -- BHIL
