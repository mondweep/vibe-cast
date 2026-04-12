---
id: TASK-005
spec: SPEC-001
adrs: [ADR-001]
status: draft
depends_on: [TASK-003, TASK-004]
parallel: false
estimated_tokens: ~3000
---

# TASK-005: Evaluation Suite Against Published Benchmarks

## Context
BHIL requires eval-driven development. PRD-001 defines accuracy thresholds per modality. This task creates the evaluation infrastructure to validate MedGemma performance against those thresholds.

## Session Start
1. Read PRD-001 success metrics table
2. Read PRD-001 AI quality metrics table
3. Read SPEC-001 testing strategy (eval suite section)

## Scope

### Files to create
- `evals/promptfooconfig.yaml` — Promptfoo evaluation configuration
- `evals/golden/radiology.jsonl` — Golden test cases for radiology
- `evals/golden/dermatology.jsonl` — Golden test cases for dermatology
- `evals/golden/pathology.jsonl` — Golden test cases for pathology
- `evals/golden/ophthalmology.jsonl` — Golden test cases for ophthalmology
- `evals/judges/faithfulness.yaml` — LLM-as-judge rubric for faithfulness
- `evals/judges/relevance.yaml` — LLM-as-judge rubric for relevance
- `evals/run_eval.py` — Evaluation runner script

### Files excluded
- No production code changes

## Implementation Steps

1. Create Promptfoo config targeting the MedImage API endpoint
2. Create golden test cases per modality (minimum 50 per modality):
   - 30% typical cases (common conditions)
   - 40% edge cases (subtle findings, normal variants)
   - 30% adversarial (non-medical images, wrong modality, ambiguous)
3. Create LLM-as-judge rubrics:
   - Faithfulness: are findings grounded in image content? (threshold: ≥ 0.85)
   - Relevance: are findings relevant to selected modality? (threshold: ≥ 0.90)
4. Create evaluation runner that:
   - Loads golden test cases
   - Calls API for each case
   - Collects structured output parse rate
   - Runs LLM-as-judge assertions
   - Reports per-modality accuracy
5. Create consistency test:
   - Same image analyzed 5x
   - Measure finding overlap (threshold: ≥ 80%)
6. Include toxicity/safety checks per MedGemma model card

## Test Requirements
- Eval runner executes without errors on sample data
- Report format includes per-modality breakdown
- Thresholds match PRD-001 exactly

## Acceptance Criteria
- [ ] ≥ 50 golden test cases per modality (200+ total)
- [ ] LLM-as-judge rubrics for faithfulness and relevance
- [ ] Consistency evaluation (5x repeat) implemented
- [ ] Parse rate metric collected
- [ ] All PRD-001 thresholds encoded as pass/fail gates
- [ ] Evaluation report generated as markdown

## Definition of Done
Eval suite runs against live API, produces per-modality accuracy report, and gates against PRD-001 thresholds.
