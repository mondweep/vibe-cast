---
id: TASK-003
spec: SPEC-001
adrs: [ADR-001]
status: draft
depends_on: [TASK-001, TASK-002]
parallel: false
estimated_tokens: ~4000
---

# TASK-003: Inference Engine with MedGemma 4B-IT

## Context
The inference engine is the core component. Per ADR-001, it uses MedGemma 4B-IT via HuggingFace Transformers. Per ADR-002, it must sit behind the API protocol boundary so it can be replaced later.

## Session Start
1. Read SPEC-001 §2 (Inference Engine) for interface and preprocessing pipeline
2. Read ADR-001 for model selection rationale
3. Read ADR-002 for pluggability requirements
4. Read prompt registry (TASK-002 output) for prompt loading

## Scope

### Files to create
- `backend/app/engine/base.py` — abstract inference engine interface
- `backend/app/engine/medgemma.py` — MedGemma implementation
- `backend/app/engine/prompts.py` — prompt loader from registry
- `backend/tests/test_engine.py` — unit tests

### Files to modify
- `backend/app/core/config.py` — add engine configuration

### Files excluded
- API routes (TASK-004)
- Android client (Phase 2)

## Implementation Steps

1. Define abstract `InferenceEngine` base class matching SPEC-001 interface
2. Implement `MedGemmaEngine` with:
   - Model loading (lazy, on first inference call)
   - Message construction from prompt registry files
   - Inference via `model.generate()`
   - Output extraction (strip input tokens)
3. Implement `PromptLoader` that reads prompts from `docs/prompts/` at startup
   - Resolves latest version per prompt ID
   - Caches loaded prompts in memory
4. Implement response parsing:
   - JSON extraction via regex
   - Fallback to raw output with `parse_success: false`
5. Add timing instrumentation (inference_time_ms)
6. Write unit tests:
   - Prompt loading from registry files
   - Response parsing (valid JSON, malformed, empty)
   - Engine interface contract tests with mock model

## Test Requirements
- Test prompt loading for all 4 modalities
- Test JSON parsing: valid structured output, partial JSON, no JSON, empty string
- Test engine interface: load → analyze → isLoaded lifecycle
- Mock model for unit tests (no GPU required)

## Acceptance Criteria
- [ ] Abstract engine interface matches SPEC-001
- [ ] MedGemma engine loads model and runs inference
- [ ] Prompts loaded from versioned registry files (not hardcoded)
- [ ] Response parsing handles all SPEC-001 error matrix scenarios
- [ ] inference_time_ms captured in metadata
- [ ] All unit tests pass without GPU (mocked model)

## Definition of Done
Engine loads MedGemma, constructs prompts from registry, runs inference, parses output, and passes all unit tests.
