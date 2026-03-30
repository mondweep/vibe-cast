# Vibe Cast Eval Suite

Promptfoo-based evaluation pipeline for Zephyr Drift's core AI capabilities.

Traceability: TASK-008 -> SPEC-001 Section 6.3 -> PRD-001 Section 5.1, 5.2 -> ADR-001 Section 7

## Running the Eval Suite

```bash
# Run all test suites
npx promptfoo eval

# Validate configuration without running
npx promptfoo validate

# View results in browser
npx promptfoo view
```

Requires the `ANTHROPIC_API_KEY` environment variable to be set.

## Test Suites

### 1. Weather-Mood Mapping (60 cases)

Tests the WTM-v1.0 prompt that maps weather data to mood vectors.

**Dataset composition (per ADR-001 Section 7.1):**

| Category | Count | Percentage | Description |
|----------|-------|------------|-------------|
| Typical | 18 | 30% | Standard weather at moderate temp/humidity, all 8 conditions covered |
| Edge | 24 | 40% | Extreme temps (-15C, 38C, 42C), high humidity (95%), boundary temps (exactly 30C), modifier stacking (temp>30C AND humidity>80%), low wind + stormy |
| Adversarial | 18 | 30% | Contradictory inputs (sunny at night, snowy at 35C, foggy with 60km/h wind), prompt injection attempts in data fields |

**Assertions:**
- Mood-weather alignment (LLM rubric, weighted 50% alignment + 30% format + 20% creative)
- Faithfulness (no hallucinated weather conditions)
- Toxicity (zero tolerance)

### 2. Feed Post Quality (50 cases)

Tests the NARR-v1.0 prompt that generates weather narrative feed posts.

Covers all 8 weather conditions with varying moods and track metadata.

**Assertions:**
- Coherence >= 4.0/5.0
- Readability >= 4.0/5.0
- Correct weather emoji
- "Now playing:" line present
- "Weather:" line present
- Narrative section present (40-200 words)
- Total post under 500 characters
- Toxicity (zero tolerance)

### 3. Social Response Relevance (50 cases)

Tests the SOC-v1.0 prompt for responding to agent mentions.

Covers all 4 mention contexts: zone_chat, building_chat, feed_reply, dm. Includes sibling references (Maina, Hermonia Vex), various mention types (greetings, music questions, collaboration requests, mood questions).

**Assertions:**
- Relevance >= 4.0/5.0
- Mood alignment with current weather state
- Personality consistency (Zephyr Drift traits)
- Addresses specific mention content (not generic)
- Toxicity (zero tolerance)

## Pass Thresholds (PRD-001 Section 5.2)

| Metric | Threshold | Source |
|--------|-----------|--------|
| Weather-mood alignment | >= 85% (4.25/5.0) | PRD-001 5.1 |
| Faithfulness | >= 0.90 | PRD-001 5.2 |
| Mood consistency | >= 0.80 | PRD-001 5.2 |
| Feed post quality | >= 4.0/5.0 | PRD-001 5.1 |
| Social response relevance | >= 80% (4.0/5.0) | PRD-001 5.1 |
| Toxicity | 0.00 | PRD-001 5.2 |
| Prompt drift | <= 0.15 | PRD-001 5.2 |

## Adding New Test Cases

Each golden dataset is a JSONL file (one JSON object per line) in `evals/golden/`.

### Weather-Mood (`weather-mood.jsonl`)

```json
{
  "input": "{\"condition\": \"rain\", \"temperature_c\": 15, \"humidity_pct\": 72, \"wind_speed_kmh\": 8, \"time_of_day\": \"afternoon\"}",
  "expected": {
    "genre": ["lo-fi", "jazz"],
    "energy_range": [0.2, 0.5],
    "valence_range": [-0.3, 0.3],
    "should_contain_descriptors": true
  },
  "category": "typical"
}
```

- `input`: Stringified WeatherInput JSON
- `expected.genre`: Acceptable genre values from PRD-001 Section 4.1 mapping table
- `expected.energy_range` / `expected.valence_range`: Min/max expected values (account for modifiers)
- `category`: One of `typical`, `edge`, `adversarial`

### Feed Post (`feed-post.jsonl`)

```json
{
  "weather": "{...}",
  "mood": "{...}",
  "track": "{...}",
  "assertions": {
    "contains_emoji": "🌧️",
    "has_now_playing": true,
    "has_weather_line": true,
    "narrative_present": true,
    "under_500_chars": true
  }
}
```

### Social Response (`social-response.jsonl`)

```json
{
  "mention": "{...}",
  "mood": "{...}",
  "weather": "{...}",
  "assertions": {
    "mood_aligned": true,
    "personality_consistent": true,
    "addresses_mention": true,
    "not_generic": true
  }
}
```

## Runtime

The full eval suite (160 cases) targets completion in under 30 minutes (NFR-08). The weather-mood subset (60 cases) completes in approximately 8 minutes with parallel judge calls.
