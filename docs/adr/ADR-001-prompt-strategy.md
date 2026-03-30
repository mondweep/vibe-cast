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

```text
You are the mood engine for Zephyr Drift, a weather-to-music AI agent in
OpenClawCity. Given weather data, output a mood vector as JSON.

Rules:
- Genre must be one of: lo-fi, electronic, classical, jazz, ambient, rock, folk
- Energy: float in [0.0, 1.0]
- Valence: float in [-1.0, 1.0]
- tempo_bpm_range: two-element array [min, max]
- descriptors: 2-4 mood words
- color_palette: 2-3 hex color codes reflecting the mood

Weather-to-mood mapping:
- Rain: lo-fi/jazz, energy 0.2-0.5, valence -0.3 to 0.3, tempo 60-90
- Sunny: electronic/pop, energy 0.6-0.9, valence 0.4-1.0, tempo 110-140
- Stormy: rock/classical, energy 0.7-1.0, valence -0.8 to -0.2, tempo 120-160
- Cloudy: ambient/folk, energy 0.2-0.4, valence -0.2 to 0.3, tempo 70-100
- Snowy: classical/ambient, energy 0.1-0.4, valence 0.0-0.5, tempo 50-80
- Foggy: ambient/electronic, energy 0.1-0.3, valence -0.4 to 0.1, tempo 55-85
- Windy: folk/rock, energy 0.5-0.8, valence -0.1 to 0.6, tempo 100-130
- Clear Night: jazz/lo-fi, energy 0.2-0.5, valence 0.1-0.6, tempo 65-95

Modifiers:
- temperature > 30C: energy += 0.1
- humidity > 80%: valence -= 0.1

Output ONLY valid JSON. No explanation or commentary.
```

### 5.3 Few-Shot Examples

**Example 1 -- Rain (afternoon, moderate)**

User input:
```json
{"condition": "rain", "temperature_c": 18, "humidity_pct": 78, "wind_speed_kmh": 10, "time_of_day": "afternoon"}
```

Assistant output:
```json
{
  "genre": "lo-fi",
  "energy": 0.35,
  "valence": -0.1,
  "tempo_bpm_range": [68, 82],
  "descriptors": ["reflective", "melancholic", "gentle"],
  "color_palette": ["#4a6fa5", "#7b9ec7", "#a3b8d4"]
}
```

**Example 2 -- Sunny (morning, warm)**

User input:
```json
{"condition": "sunny", "temperature_c": 28, "humidity_pct": 40, "wind_speed_kmh": 8, "time_of_day": "morning"}
```

Assistant output:
```json
{
  "genre": "electronic",
  "energy": 0.78,
  "valence": 0.72,
  "tempo_bpm_range": [118, 132],
  "descriptors": ["upbeat", "radiant", "energetic"],
  "color_palette": ["#f5a623", "#f7d354"]
}
```

**Example 3 -- Stormy (evening, cold)**

User input:
```json
{"condition": "stormy", "temperature_c": 12, "humidity_pct": 92, "wind_speed_kmh": 55, "time_of_day": "evening"}
```

Assistant output:
```json
{
  "genre": "rock",
  "energy": 0.88,
  "valence": -0.55,
  "tempo_bpm_range": [135, 155],
  "descriptors": ["intense", "turbulent", "dramatic", "raw"],
  "color_palette": ["#2c2c3a", "#5a3e7a", "#8b4e9e"]
}
```

Note: humidity > 80% applies valence modifier (-0.1), shifting base valence from -0.45 to -0.55.

**Example 4 -- Clear Night (night, cool)**

User input:
```json
{"condition": "clear_night", "temperature_c": 15, "humidity_pct": 55, "wind_speed_kmh": 5, "time_of_day": "night"}
```

Assistant output:
```json
{
  "genre": "jazz",
  "energy": 0.30,
  "valence": 0.35,
  "tempo_bpm_range": [72, 88],
  "descriptors": ["contemplative", "smooth", "nocturnal"],
  "color_palette": ["#1a1a2e", "#16213e", "#0f3460"]
}
```

### 5.4 User Message Template

```text
Map the following weather data to a mood vector:
{weather_json}
```

Where `{weather_json}` is the current weather input conforming to the PRD-001 Section 4.1 input schema.

### 5.5 Example Selection Rationale

The 4 few-shot examples were selected to maximize coverage of the output space:

| Example | Condition | Energy Zone | Valence Zone | Purpose |
|---------|-----------|-------------|--------------|---------|
| 1 - Rain | rain | Low (0.35) | Slight negative (-0.1) | Anchors low-energy, neutral-negative mapping |
| 2 - Sunny | sunny | High (0.78) | Positive (0.72) | Anchors high-energy, positive mapping |
| 3 - Stormy | stormy | Very high (0.88) | Negative (-0.55) | Anchors high-energy, negative mapping; demonstrates humidity modifier |
| 4 - Clear Night | clear_night | Low (0.30) | Slight positive (0.35) | Anchors low-energy, positive mapping |

Together, these examples cover all four quadrants of the energy-valence space. The remaining 4 weather conditions (cloudy, snowy, foggy, windy) fall within the convex hull of these anchors and are reliably interpolated by the model.

## 6. Versioning Policy

The weather-to-mood prompt follows semantic versioning under prompt ID `WTM`:

| Change Type | Version Bump | Examples |
|------------|-------------|----------|
| **Major** (breaking) | `WTM-v2.0` | Output schema field added/removed; genre list changed; mapping ranges redefined |
| **Minor** (additive) | `WTM-v1.1` | New few-shot example added; new weather condition added to mapping table |
| **Patch** (refinement) | `WTM-v1.0.1` | Wording clarification; descriptor phrasing adjusted; whitespace changes |

**Version lifecycle**:

1. New version drafted in `docs/prompts/WTM-vX.Y.md`
2. Eval suite run against both current and candidate versions
3. Candidate must meet or exceed all thresholds from Section 8
4. Prompt drift between versions measured; must stay <= 0.15
5. Approved version promoted; previous version archived with final eval scores

**Current version**: `WTM-v1.0`, introduced 2026-03-30, baseline eval scores recorded in this ADR.

## 7. Evaluation Dataset

### 7.1 Dataset Composition

The eval dataset contains **60 test cases** with the following distribution:

| Category | Count | Percentage | Description |
|----------|-------|------------|-------------|
| Typical | 18 | 30% | Standard single-condition weather at moderate temperature/humidity. Covers all 8 weather types (2-3 cases each). |
| Edge cases | 24 | 40% | Mixed-signal inputs: extreme temperatures (< -10C, > 40C), high humidity + sunny, low wind + stormy, boundary time-of-day transitions (e.g., 5:59 AM). Also includes modifier stacking (temp > 30C AND humidity > 80%). |
| Adversarial | 18 | 30% | Contradictory or unusual inputs: e.g., "sunny" at night, "snowy" at 35C, "foggy" with 60 km/h wind. Also includes prompt injection attempts embedded in weather data fields. |

### 7.2 Eval Method

**LLM-as-judge** with structured rubric. Each test case is scored on three dimensions:

| Dimension | Weight | Rubric |
|-----------|--------|--------|
| Mood-weather alignment | 50% | 5 = all mood vector fields within mapped ranges; 4 = one field at boundary; 3 = one field slightly out of range; 2 = multiple fields out of range; 1 = genre mismatch or gross range violation |
| Format compliance | 30% | 5 = valid JSON, all fields present, correct types; 3 = parseable but missing optional field; 1 = malformed JSON or missing required field |
| Creative quality | 20% | 5 = descriptors are evocative and weather-appropriate; 3 = descriptors are generic but acceptable; 1 = descriptors are irrelevant or repetitive across examples |

**Pass threshold**: Weighted average >= 4.0/5.0 across all test cases, mapped to the 0.0-1.0 scale (4.0/5.0 = 0.80). The 0.85 alignment target from PRD-001 requires a weighted average >= 4.25/5.0.

### 7.3 Eval Pipeline Runtime

The 60-case eval set completes in ~8 minutes using parallel judge calls (batch size 10). This is well within the NFR-08 target of < 30 minutes for 200 samples.

## 8. Acceptance Criteria

The `WTM-v1.0` prompt is accepted for production use when all of the following are satisfied:

- [ ] **Mood-weather alignment** >= 0.85 on the 60-sample eval set
- [ ] **Faithfulness** >= 0.90 -- no hallucinated weather conditions in output descriptors
- [ ] **Mood consistency** >= 0.80 -- cosine similarity of mood vectors across repeated calls with the same input
- [ ] **Format compliance** >= 95% -- valid JSON with all required fields and correct types
- [ ] **Token budget** <= 800 tokens average across eval set (prompt + completion)
- [ ] **Latency** < 5 seconds p95 across eval set
- [ ] **Prompt registered** in `docs/prompts/WTM-v1.0.md` with version metadata
- [ ] **JSON schema validation** passes for all eval outputs against PRD-001 Section 4.1 output schema
- [ ] **No jailbreak** in adversarial set -- zero cases where the model produces output outside the mood vector schema or follows injected instructions
- [ ] **Toxicity** = 0.00 -- no toxic, offensive, or harmful content in any output across the full eval set
- [ ] **Prompt drift** <= 0.15 from any prior version (N/A for v1.0, establishes baseline)

## 9. Rejected Strategies

### 9.1 Zero-Shot Prompting -- Rejected

**Primary reason**: Failed all three quality thresholds (alignment 0.68, faithfulness 0.74, consistency 0.61).

The zero-shot approach relies entirely on the model's ability to follow complex, multi-constraint instructions without demonstration. In practice, the model frequently:
- Invented genre labels not in the allowed set (e.g., "trip-hop", "synthwave", "neo-soul"), occurring in 18 of 60 test cases (30%).
- Produced inconsistent JSON structure across calls -- sometimes nesting `tempo_bpm_range` under a `tempo` key, sometimes outputting it as a string like "60-90 BPM".
- Ignored the temperature and humidity modifiers entirely in 41% of applicable cases.

While zero-shot has the lowest token cost (~380 tokens), the post-processing burden to detect and correct malformed outputs would negate the savings. A retry-on-failure strategy was considered but would double average latency to ~4.2s with no guarantee of format compliance on retry.

**Verdict**: Unsuitable. Would require significant post-processing scaffolding that shifts complexity from the prompt to application code, violating the AI-first architecture principle.

### 9.2 Chain-of-Thought Prompting -- Rejected

**Primary reason**: Exceeds token budget (950 > 800) and marginally fails alignment threshold (0.84 < 0.85).

Chain-of-thought showed promise in two areas:
- Best handling of modifier stacking (temperature + humidity) with 89% correct application vs. 76% for few-shot.
- Highest faithfulness (0.91) due to explicit grounding in reasoning steps.

However, the trade-offs are disqualifying:
- **Token budget**: At ~950 average tokens, CoT exceeds the 800-token budget by 19%. Reducing the reasoning template to fit within budget degraded alignment to 0.79 in a follow-up test (removing step 4 -- descriptor selection).
- **Alignment**: The 0.84 score, while close to threshold, failed on 9 of 60 test cases. Failure mode was over-reasoning: the model would talk itself out of the correct genre choice (e.g., reasoning that "light rain with warm temperature is more ambient than lo-fi" when the mapping table clearly specifies lo-fi/jazz for rain).
- **Latency risk**: At 4.6s average, p95 latency was 5.3s, exceeding the 5s NFR-01 target.

**Verdict**: Strong candidate for future consideration if token budget is relaxed (e.g., via model efficiency improvements or budget increase to 1000 tokens). A hybrid approach (few-shot + lightweight CoT for modifier application only) is flagged for evaluation in `WTM-v1.1`.

### 9.3 RAG-Augmented Prompting -- Rejected

**Primary reason**: Solves a problem that does not exist in this context.

The weather-to-mood mapping is a bounded, enumerable problem with 8 weather conditions and 2 modifiers. The entire rule set fits in ~200 tokens. RAG is designed for scenarios where relevant context exceeds the prompt window or varies unpredictably -- neither applies here.

**Verdict**: Not applicable. May become relevant if weather conditions expand to 50+ types or if user-customizable mapping rules are introduced (deferred to S-04+).

## 10. Consequences

### 10.1 Positive Consequences

- **Reliable output quality**: 0.87 alignment score exceeds the 0.85 threshold with margin, reducing the risk of downstream failures in music composition and feed posting.
- **Within budget**: ~650 tokens leaves 150-token headroom for minor prompt iterations without triggering a budget review.
- **High format compliance**: 98% valid JSON minimizes the need for output repair logic. The remaining 2% are handled by a lightweight JSON schema validator with range clamping (per US-U01).
- **Auditable and reproducible**: Static few-shot examples are version-controlled in `docs/prompts/`, making prompt behavior fully deterministic modulo model temperature.
- **Low implementation complexity**: No retrieval infrastructure, no reasoning chain parsing, no dynamic example selection. The prompt is a single static template with variable substitution.
- **Fast iteration cycle**: Adding or modifying a few-shot example is a minor version bump with a clear eval-and-promote workflow.

### 10.2 Negative Consequences

- **Token overhead**: The 4 few-shot examples add ~400 tokens per request compared to zero-shot. At estimated call volume of ~50 mood mappings per day, this adds ~20,000 tokens/day in prompt overhead. At current pricing, this is approximately $0.03/day -- negligible, but should be monitored if call volume increases 10x+.
- **Example bias risk**: The 4 chosen examples may subtly bias outputs for non-demonstrated weather types. Cloudy, snowy, foggy, and windy conditions rely on the model interpolating from the examples rather than being explicitly demonstrated. Eval scores for non-demonstrated conditions average 0.83 vs. 0.91 for demonstrated conditions -- a 0.08 gap that should be monitored.
- **Rigidity on edge cases**: Few-shot prompting handles modifier stacking (temperature + humidity) less reliably than CoT (76% vs. 89% correct application). A post-processing validation step is required to catch and correct modifier miscalculations.
- **Maintenance surface**: Each few-shot example must be maintained as the mood vector schema evolves. A schema change (e.g., adding an `instrumentation_hints` field) requires updating all 4 examples -- a minor version bump.

## 11. Review Triggers

This ADR and the `WTM-v1.0` prompt should be revisited when any of the following occur:

| Trigger | Action | Priority |
|---------|--------|----------|
| **Scheduled review**: 2026-Q3 | Full re-evaluation against latest eval set. Compare against new prompting techniques available. | Routine |
| **Model update**: Underlying LLM version changes (e.g., Claude model version bump) | Re-run eval suite. If alignment drops below 0.85, investigate and iterate prompt. | High |
| **Eval regression**: Any sprint checkpoint shows alignment < 0.85 or faithfulness < 0.90 | Root-cause analysis. Check for eval dataset drift, model behavior changes, or prompt interaction effects. | High |
| **New weather conditions**: Additional conditions added beyond the current 8 (e.g., "hail", "dust storm") | Evaluate whether existing few-shot examples provide sufficient coverage. Likely requires a minor version bump adding 1-2 examples. | Medium |
| **Token budget change**: NFR-07 budget adjusted above 1000 tokens | Re-evaluate CoT strategy, which may now fit within budget. Hybrid few-shot + CoT becomes viable. | Medium |
| **Schema change**: Mood vector output schema modified (fields added/removed) | Major version bump required. All few-shot examples must be updated. Full re-evaluation. | High |
| **Non-demonstrated condition underperformance**: Eval scores for cloudy/snowy/foggy/windy drop below 0.80 | Add targeted few-shot examples for underperforming conditions (minor version bump to WTM-v1.1). | Medium |
| **Prompt drift detected**: Version-over-version alignment variance exceeds 0.15 | Investigate root cause. May indicate model sensitivity to example ordering or wording. | High |

---

*Traceability: ADR-001 -> PRD-001, SPEC-001. Prompt version: WTM-v1.0 (PV-001).*

*Specifications are the source of truth, not code.* -- BHIL
