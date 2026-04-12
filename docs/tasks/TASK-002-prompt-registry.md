---
id: TASK-002
spec: SPEC-001
adrs: [ADR-001, ADR-002]
status: draft
depends_on: []
parallel: true
estimated_tokens: ~3000
---

# TASK-002: Versioned Prompt Registry

## Context
BHIL requires all prompts to be version-controlled in `docs/prompts/`. SPEC-001 §4 defines 9 prompt IDs across 4 modalities plus a structured-output instruction. These prompts drive MedGemma's analysis quality and must be independently evaluable.

## Session Start
1. Read SPEC-001 §4 (Prompt Registry) for prompt IDs
2. Read SPEC-001 §2 (Inference Engine → Prompt Construction) for message format
3. Read MedGemma model card for recommended prompting patterns

## Scope

### Files to create
- `docs/prompts/PROMPT-REGISTRY.md`
- `docs/prompts/radiology-system/v1.0/system-prompt.md`
- `docs/prompts/radiology-user/v1.0/user-template.md`
- `docs/prompts/dermatology-system/v1.0/system-prompt.md`
- `docs/prompts/dermatology-user/v1.0/user-template.md`
- `docs/prompts/pathology-system/v1.0/system-prompt.md`
- `docs/prompts/pathology-user/v1.0/user-template.md`
- `docs/prompts/ophthalmology-system/v1.0/system-prompt.md`
- `docs/prompts/ophthalmology-user/v1.0/user-template.md`
- `docs/prompts/structured-output/v1.0/instruction.md`

### Files excluded
- No code changes — prompts only

## Implementation Steps

1. Create `PROMPT-REGISTRY.md` with table of all prompt IDs, versions, modalities
2. For each modality, create system prompt emphasizing:
   - Expert role for that specialty
   - Structured finding expectations
   - Severity classification guidance
   - Anatomical location specificity
3. For each modality, create user template with:
   - Default analysis query
   - Placeholder for custom user query override: `{{user_query}}`
   - Modality-specific clinical vocabulary
4. Create structured-output instruction that appends JSON format specification
5. Document versioning rules: major (format change), minor (new examples), patch (wording)

## Test Requirements
- Each prompt renders valid content when substituted into SPEC-001 message format
- No prompt exceeds 500 tokens (to preserve context for image + generation)

## Acceptance Criteria
- [ ] All 9 prompt IDs from SPEC-001 have v1.0 files
- [ ] PROMPT-REGISTRY.md lists all prompts with metadata
- [ ] Prompts follow semantic versioning scheme
- [ ] Each system prompt establishes expert role + structured output expectations

## Definition of Done
All prompts committed, registry complete, and prompts loadable by inference engine.
