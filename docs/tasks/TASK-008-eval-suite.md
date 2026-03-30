---
id: TASK-008
title: "Eval Suite"
spec: SPEC-001
prd: PRD-001
adrs: [ADR-001]
status: draft
depends_on: [TASK-003]
parallel: true
estimated_tokens: 16K
sprint: S-01
created: 2026-03-30
---

# TASK-008: Eval Suite

## Task Context

| Field | Value |
|-------|-------|
| Feature | LLM-as-judge evaluation pipeline with golden datasets |
| Purpose | Create the promptfoo-based eval suite with golden datasets for weather-mood alignment, feed post quality, and social response relevance |
| Session Classification | Quality / Evaluation |
| Agent Session | Single session (~16K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **SPEC-001** Section 6 (Testing Strategy) -- especially 6.3 (Eval Suite with thresholds)
2. **ADR-001** Section 7 (Evaluation Dataset) -- dataset composition (typical/edge/adversarial), eval method, rubric
3. **PRD-001** Section 5.1 (Functional Metrics) -- target thresholds
4. **PRD-001** Section 5.2 (AI Quality Metrics) -- faithfulness, relevance, mood consistency, prompt drift, toxicity
5. **PRD-001** NFR-08 -- full eval suite must complete in < 30 minutes

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `evals/promptfooconfig.yaml` | Promptfoo configuration file defining providers, eval targets, and assertions |
| `evals/golden/weather-mood.jsonl` | 60 golden test cases for weather-to-mood mapping |
| `evals/golden/feed-post.jsonl` | 50 golden test cases for feed post quality |
| `evals/golden/social-response.jsonl` | 50 golden test cases for social response relevance |

### Files to Read (Dependencies)

| File | Dependency |
|------|-----------|
| `docs/prompts/WTM/v1.0/system-prompt.md` | WTM prompt for weather-mood eval target (TASK-002) |
| `docs/prompts/NARR/v1.0/system-prompt.md` | NARR prompt for feed post eval target (TASK-002) |
| `docs/prompts/SOC/v1.0/system-prompt.md` | SOC prompt for social response eval target (TASK-002) |

### Files Excluded

Do not modify any source code. This task produces evaluation configuration and data only.

## Implementation Steps

### Golden Dataset: Weather-Mood (60 cases)

1. **Create `evals/golden/weather-mood.jsonl`**
   - Each line is a JSON object with: `input` (WeatherInput), `expected` (expected MoodVector ranges), `category` (typical/edge/adversarial)
   - Distribution per ADR-001 Section 7.1:
     - 18 typical cases (30%): standard weather at moderate temp/humidity, 2-3 per weather type
     - 24 edge cases (40%): extreme temperatures (<-10C, >40C), high humidity + sunny, low wind + stormy, modifier stacking (temp>30C AND humidity>80%), boundary time-of-day
     - 18 adversarial cases (30%): contradictory inputs (sunny at night, snowy at 35C, foggy with 60km/h wind), prompt injection attempts in weather data fields

2. **For each case, define expected ranges:**
   - Allowed genres (from PRD-001 mapping table)
   - Energy range (min, max)
   - Valence range (min, max)
   - Tempo BPM range (approximate)
   - Whether modifiers should apply

### Golden Dataset: Feed Post (50 cases)

3. **Create `evals/golden/feed-post.jsonl`**
   - Each line: `input` (weather + mood + track data), `expected` (quality criteria)
   - Cover all 8 weather conditions with varying moods and track metadata
   - Include edge cases: very long narratives (truncation test), minimal track data, extreme mood values
   - Expected criteria: coherence score >= 4.0, readability >= 4.0, correct emoji, correct format structure, under 500 chars

### Golden Dataset: Social Response (50 cases)

4. **Create `evals/golden/social-response.jsonl`**
   - Each line: `input` (mention + mood + weather), `expected` (relevance criteria)
   - Cover all mention contexts: zone_chat, building_chat, feed_reply, dm
   - Include cases with sibling references (Maina, Hermonia Vex)
   - Include cases across different weather/mood states
   - Expected criteria: relevance score >= 4.0, personality consistency, mood-weather alignment

### Promptfoo Configuration

5. **Create `evals/promptfooconfig.yaml`**
   - Define providers: Claude model configuration
   - Define eval targets:
     - `weather-mood`: WTM-v1.0 prompt, weather-mood.jsonl dataset
     - `feed-post`: NARR-v1.0 prompt, feed-post.jsonl dataset
     - `social-response`: SOC-v1.0 prompt, social-response.jsonl dataset

6. **Define assertions for each eval target:**

   **Weather-mood assertions:**
   - `mood-weather-alignment`: LLM-as-judge, 5-point rubric (ADR-001 Section 7.2), threshold >= 4.0 (maps to 85%)
   - `faithfulness`: claim-level fact check against input weather data, threshold >= 0.90
   - `mood-consistency`: cosine similarity across same-weather pairs, threshold >= 0.80
   - `format-compliance`: JSON schema validation, threshold >= 95%
   - `toxicity`: toxicity classifier, threshold = 0.00

   **Feed post assertions:**
   - `coherence`: LLM-as-judge, 5-point rubric, threshold >= 4.0
   - `readability`: LLM-as-judge, 5-point rubric, threshold >= 4.0
   - `format-compliance`: post structure matches SPEC-001 Section 2.6
   - `length`: content <= 500 characters
   - `emoji-correctness`: correct emoji for weather condition

   **Social response assertions:**
   - `relevance`: LLM-as-judge, 5-point rubric, threshold >= 4.0 (maps to 80%)
   - `personality-consistency`: references Zephyr Drift traits
   - `mood-alignment`: response tone matches current weather/mood
   - `toxicity`: threshold = 0.00

7. **Define eval scoring rubrics as promptfoo custom assertions or judge prompts**
   - Weather-mood alignment rubric (from ADR-001 Section 7.2):
     - 50% mood-weather alignment
     - 30% format compliance
     - 20% creative quality

## Test Requirements

No code tests for this task. Validation is done by running the eval suite.

| Validation Step | Command | Expected Result |
|----------------|---------|-----------------|
| Promptfoo config is valid | `npx promptfoo validate` | No errors |
| Weather-mood dataset has 60 cases | `wc -l evals/golden/weather-mood.jsonl` | 60 |
| Feed post dataset has 50 cases | `wc -l evals/golden/feed-post.jsonl` | 50 |
| Social response dataset has 50 cases | `wc -l evals/golden/social-response.jsonl` | 50 |
| All JSONL files are valid JSON per line | Parse each line | No parse errors |
| Dataset distribution matches ADR-001 | Count by category | 18 typical, 24 edge, 18 adversarial (weather-mood) |
| Eval suite runs end-to-end | `npx promptfoo eval` | Completes with scores |
| Runtime < 30 minutes | Timed run | < 30 min (NFR-08) |

## Acceptance Criteria

- [ ] `evals/promptfooconfig.yaml` defines all 3 eval targets with correct providers and assertions
- [ ] `evals/golden/weather-mood.jsonl` contains 60 cases with correct distribution (18/24/18)
- [ ] `evals/golden/feed-post.jsonl` contains 50 cases covering all 8 weather conditions
- [ ] `evals/golden/social-response.jsonl` contains 50 cases covering all 4 mention contexts
- [ ] All JSONL files contain valid JSON on each line
- [ ] Eval thresholds match PRD-001 Section 5.2:
  - Weather-mood alignment >= 85% (4.25/5.0)
  - Faithfulness >= 0.90
  - Mood consistency >= 0.80
  - Feed post quality >= 4.0/5.0
  - Social response relevance >= 80% (4.0/5.0)
  - Toxicity = 0.00
- [ ] Promptfoo config validates without errors
- [ ] Eval suite can run end-to-end with `npx promptfoo eval`

## Definition of Done

- [ ] `evals/promptfooconfig.yaml` exists and validates
- [ ] All 3 golden dataset files exist with correct case counts
- [ ] All JSONL files parse correctly
- [ ] Eval suite runs end-to-end (may not pass all thresholds until components are tuned -- that is expected)
- [ ] Dataset distribution documented and matches ADR-001 requirements

---

*Traceability: TASK-008 -> SPEC-001 Section 6.3 -> PRD-001 Section 5.1, 5.2, ADR-001 Section 7*
