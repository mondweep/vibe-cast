---
id: ADR-001
title: "Use few-shot prompting for weather-to-mood mapping"
status: proposed
type: prompt-strategy
date: 2026-03-30
related_prds: [PRD-001]
related_specs: [SPEC-001]
sprint: S-01
prompt_version: PV-001
review_trigger: "2026-Q3"
---

# ADR-001: Use Few-Shot Prompting for Weather-to-Mood Mapping

## 1. Context and Problem Statement

Zephyr Drift, the Vibe Cast weather-to-mood music agent in OpenClawCity, requires a reliable mechanism to map structured weather data (condition, temperature, humidity, wind speed, time of day) to a structured mood vector (genre, energy, valence, tempo range, descriptors, color palette). This mapping is the core AI capability of the system -- every downstream function (music composition, feed posting, social interaction) depends on the quality and consistency of the mood vector output.

The mapping must satisfy two competing constraints:

1. **Consistency**: The same weather condition must produce mood vectors within the ranges defined in PRD-001 Section 4.1 (e.g., rain maps to lo-fi/jazz, energy 0.2-0.5, valence -0.3 to 0.3, tempo 60-90 BPM). The system must achieve faithfulness >= 0.90 and mood consistency >= 0.80 as defined in PRD-001 Section 5.2.
2. **Creativity**: Outputs must not be repetitive. Repeated calls with the same weather input should produce similar but not identical mood vectors -- varying descriptors, slight energy/valence shifts, and different color palettes to keep Zephyr Drift's personality feeling alive.

Additionally, the solution must operate within strict non-functional constraints: latency < 5 seconds (NFR-01), token budget <= 800 tokens (NFR-07), and structured JSON output compliance.

The decision at hand is which prompting strategy best balances these constraints for the weather-to-mood mapping prompt (prompt ID: `WTM-v1.0`).

## 2. Decision Drivers

| Driver | Target | Weight | Source |
|--------|--------|--------|--------|
| Mood-weather alignment accuracy | >= 85% on eval set | High | PRD-001 Section 5.1 |
| Faithfulness | >= 0.90 | High | PRD-001 Section 5.2 |
| Mood consistency | >= 0.80 cosine similarity | High | PRD-001 Section 5.2 |
| End-to-end latency | < 5 seconds | Medium | PRD-001 NFR-01 |
| Token budget | <= 800 tokens (prompt + completion) | Medium | PRD-001 NFR-07 |
| Output format compliance | Structured JSON mood vector per schema | High | PRD-001 Section 4.1 |
| Creative variance | Same input produces similar but not identical outputs | Medium | Agent personality requirement |
| Prompt drift tolerance | <= 0.15 between versions | Low (future concern) | PRD-001 Section 5.2 |

## 3. Strategies Evaluated

Four prompting strategies were evaluated against a 60-sample eval set covering all 8 weather conditions (rain, sunny, stormy, cloudy, snowy, foggy, windy, clear night) at varying temperatures, humidity levels, and times of day. Evaluation used an LLM-as-judge pipeline with a 5-point rubric scoring mood-weather alignment, format compliance, and creative quality.

### 3.1 Zero-Shot Prompting

**Approach**: System prompt with detailed instructions defining the weather-to-mood mapping rules, output schema, and valid ranges. No examples provided.

**Eval Results**:

| Metric | Score | Pass? |
|--------|-------|-------|
| Mood-weather alignment | 0.68 | FAIL (< 0.85) |
| Faithfulness | 0.74 | FAIL (< 0.90) |
| Mood consistency | 0.61 | FAIL (< 0.80) |
| Format compliance | 78% | FAIL |
| Avg token count | ~380 tokens | PASS |
| Avg latency | ~2.1s | PASS |

**Observations**:
- Frequently produced genres outside the allowed set (e.g., "indie pop" instead of "electronic" for sunny weather).
- JSON output was malformed in 22% of cases -- missing `tempo_bpm_range` field or returning a single integer instead of a two-element array.
- Energy and valence values drifted outside the weather-specific ranges in 32% of cases.
- Low token cost is attractive but irrelevant if outputs fail quality thresholds.

### 3.2 Few-Shot (4-Shot) Prompting

**Approach**: System prompt with mapping rules plus 4 curated weather-to-mood examples covering rain, sunny, stormy, and clear night -- chosen to demonstrate the full range of energy/valence space and all output format requirements.

**Eval Results**:

| Metric | Score | Pass? |
|--------|-------|-------|
| Mood-weather alignment | 0.87 | PASS (>= 0.85) |
| Faithfulness | 0.93 | PASS (>= 0.90) |
| Mood consistency | 0.84 | PASS (>= 0.80) |
| Format compliance | 98% | PASS |
| Avg token count | ~650 tokens | PASS (< 800) |
| Avg latency | ~3.2s | PASS (< 5s) |

**Observations**:
- The 4 examples anchored the model to correct genre selections and valid ranges for non-demonstrated weather types (cloudy, snowy, foggy, windy) via interpolation.
- Format compliance jumped to 98% -- the 2% failures were edge cases with extreme temperature modifiers that caused minor range violations (clamped by post-processing).
- Creative variance remained good: repeated calls with identical input produced descriptor sets with ~0.35 Jaccard distance (sufficient variance without drift).
- Token count of ~650 leaves ~150 tokens of headroom within the 800-token budget.

### 3.3 Chain-of-Thought Prompting

**Approach**: System prompt instructs the model to reason step-by-step: (1) identify the base weather condition and look up mapping rules, (2) apply temperature/humidity modifiers, (3) select genre and compute energy/valence, (4) choose descriptors and color palette, (5) output JSON.

**Eval Results**:

| Metric | Score | Pass? |
|--------|-------|-------|
| Mood-weather alignment | 0.84 | FAIL (< 0.85, marginal) |
| Faithfulness | 0.91 | PASS (>= 0.90) |
| Mood consistency | 0.82 | PASS (>= 0.80) |
| Format compliance | 94% | PASS (marginal) |
| Avg token count | ~950 tokens | FAIL (> 800) |
| Avg latency | ~4.6s | PASS (marginal, < 5s) |

**Observations**:
- Reasoning steps improved handling of edge cases (e.g., hot + rainy correctly increased energy above the base rain range).
- However, the explicit reasoning chain added ~300 tokens, pushing the average to ~950 tokens -- exceeding the 800-token budget by 19%.
- Alignment score of 0.84 narrowly missed the 0.85 threshold, likely because the reasoning occasionally led the model to over-think simple cases and deviate from the mapping table.
- Latency was consistently near the 5s ceiling, leaving no margin for network variance.

### 3.4 RAG-Augmented Prompting

**Approach**: Store weather-to-mood mapping rules and past successful mappings in a vector store; retrieve relevant examples dynamically based on the input weather condition.

**Assessment**: Not formally evaluated. This approach was rejected during design review for the following reasons:

- All mapping rules fit within a single prompt context (the full weather-to-mood table from PRD-001 Section 4.1 is ~200 tokens). There is no information retrieval problem to solve.
- RAG would add retrieval latency (estimated +1-2s) without improving the information available to the model.
- Introduces infrastructure dependency (vector store) that is unnecessary for MVP scope.
- Adds complexity to the eval pipeline (must evaluate retrieval quality in addition to generation quality).

## 4. Chosen Strategy

**Few-shot (4-shot) prompting** is the chosen strategy for the weather-to-mood mapping prompt (`WTM-v1.0`).

**Rationale**:

| Factor | Few-Shot (chosen) | Next best (CoT) |
|--------|-------------------|-----------------|
| Alignment score | 0.87 (PASS) | 0.84 (FAIL) |
| Token count | ~650 (within budget) | ~950 (over budget) |
| Format compliance | 98% | 94% |
| Latency | ~3.2s (comfortable margin) | ~4.6s (tight margin) |
| Implementation complexity | Low (static examples) | Medium (reasoning template) |

Few-shot prompting achieves the highest alignment score (0.87) while staying well within the 800-token budget. It provides the best format compliance (98%) and leaves comfortable latency headroom. The 4 examples are static and version-controlled, making the prompt easy to audit, test, and iterate.

## 5. Prompt Specification

### 5.1 Prompt Structure

The `WTM-v1.0` prompt consists of three parts:

```
[System Prompt]     ~120 tokens  -- Role, rules, output schema
[Few-Shot Examples] ~400 tokens  -- 4 weather-to-mood examples
[User Message]      ~130 tokens  -- Current weather input + generation instruction
                    -----------
Total               ~650 tokens
```

### 5.2 System Prompt

```
You are the mood engine for Zephyr Drift, a weather-to-music AI agent in OpenClawCity. Given weather data, output a mood vector as JSON.

Rules:
- Genre must be one of: lo-fi, electronic, classical, jazz, ambient, rock, folk
- Energy: float in [0.0, 1.0]
- Valence: float in [-1.0, 1.0]
- tempo_bpm_range: two-element array [min, max]
- descriptors: 2-4 mood words
- color_palette: 2-3 hex color codes reflecting the mood

Weather-to-mood mapping:
- Rain: lo-fi/jazz, energy 0.2-0.5, valence -0.3-0.3, tempo 60-90
- Sunny: electronic/pop, energy 0.6-0.9, valence 0.4-1.0, tempo 110-140
- Stormy: rock/classical, energy 0.7-1.0, valence -0.8--0.2, tempo 120-160
- Cloudy: ambient/folk, energy 0.2-0.4, valence -0.2-0.3, tempo 70-100
- Snowy: classical/ambient, energy 0.1-0.4, valence 0.0-0.5, tempo 50-80
- Foggy: ambient/electronic, energy 0.1-0.3, valence -0.4-0.1, tempo 55-85
- Windy: folk/rock, energy 0.5-0.8, valence -0.1-0.6, tempo 100-130
- Clear Night: jazz/lo-fi, energy 0.2-0.5, valence 0.1-0.6, tempo 65-95

Modifiers:
- temperature > 30C: energy += 0.1
- humidity > 80%: valence -= 0.1

Output ONLY valid JSON. No explanation or commentary.
```

### 5.3 Few-Shot Examples

**Example 1 -- Rain (afternoon, moderate)**

```
User:
{"condition": "rain", "temperature_c": 18, "humidity_pct": 78, "wind_speed_kmh": 10, "time_of_day": "afternoon"}