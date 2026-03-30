---
id: TASK-002
title: "Prompt Registry and Initial Prompt Templates"
spec: SPEC-001
prd: PRD-001
adrs: [ADR-001]
status: draft
depends_on: []
parallel: true
estimated_tokens: 16K
sprint: S-01
created: 2026-03-30
---

# TASK-002: Prompt Registry and Initial Prompt Templates

## Task Context

| Field | Value |
|-------|-------|
| Feature | Versioned prompt management system |
| Purpose | Build the PromptRegistry that loads versioned prompts from docs/prompts/ and create all initial v1.0 prompt templates |
| Session Classification | Foundation / Greenfield |
| Agent Session | Single session (~16K tokens) |

## Session Start Instructions

Before writing any code, read and internalize:

1. **SPEC-001** Section 2.7 (PromptRegistry) -- interface definition, prompt IDs, storage layout
2. **ADR-001** Section 5 (Prompt Specification) -- full WTM-v1.0 system prompt, few-shot examples, user template
3. **PRD-001** Section 5.3 -- prompt version performance tracking requirements
4. **SPEC-001** Section 2.3, 2.5, 2.6 -- COMP, SOC, NARR prompt usage context

## Scope

### Files to Create

| File | Purpose |
|------|---------|
| `src/prompt-registry.ts` | PromptRegistry class that loads and manages versioned prompts |
| `docs/prompts/PROMPT-REGISTRY.md` | Central registry tracking all prompt versions with metadata and eval scores |
| `docs/prompts/WTM/v1.0/system-prompt.md` | WTM-v1.0 system prompt (from ADR-001 Section 5.2) |
| `docs/prompts/WTM/v1.0/user-template.md` | WTM-v1.0 user message template (from ADR-001 Section 5.4) |
| `docs/prompts/COMP/v1.0/system-prompt.md` | Composition prompt generation system prompt |
| `docs/prompts/COMP/v1.0/user-template.md` | Composition prompt user template |
| `docs/prompts/SOC/v1.0/system-prompt.md` | Social response generation system prompt |
| `docs/prompts/SOC/v1.0/user-template.md` | Social response user template |
| `docs/prompts/NARR/v1.0/system-prompt.md` | Feed narrative generation system prompt |
| `docs/prompts/NARR/v1.0/user-template.md` | Feed narrative user template |
| `src/__tests__/prompt-registry.test.ts` | Unit tests for the registry |

### Files to Modify

None -- this is a greenfield task.

### Files Excluded

All other `src/` files are out of scope. Do not implement MoodEngine or any consumer of the prompts.

## Implementation Steps

1. **Create the WTM-v1.0 prompt files**
   - `docs/prompts/WTM/v1.0/system-prompt.md`: Copy the exact system prompt from ADR-001 Section 5.2, including all mapping rules and modifier instructions
   - `docs/prompts/WTM/v1.0/user-template.md`: Copy from ADR-001 Section 5.4 with `{weather_json}` placeholder
   - The system prompt MUST include the 4 few-shot examples from ADR-001 Section 5.3 (rain, sunny, stormy, clear night)

2. **Create the COMP-v1.0 prompt files**
   - System prompt: instruct the LLM to generate a weather narrative fragment for use in a music composition prompt; reference the composition output format from SPEC-001 Section 2.3
   - User template: accept mood vector and weather data as input, with `{mood_json}` and `{weather_json}` placeholders

3. **Create the SOC-v1.0 prompt files**
   - System prompt: define Zephyr Drift's personality constants (name, core trait, speech style, siblings) from SPEC-001 Section 2.5; instruct mood-weather-consistent response generation
   - User template: accept mention content, current mood, and weather data with `{mention_json}`, `{mood_json}`, `{weather_json}` placeholders

4. **Create the NARR-v1.0 prompt files**
   - System prompt: instruct poetic weather-mood narrative generation for feed posts; reference the post structure from SPEC-001 Section 2.6
   - User template: accept weather, mood, and track data with `{weather_json}`, `{mood_json}`, `{track_json}` placeholders

5. **Create PROMPT-REGISTRY.md**
   - Table tracking all prompt versions: ID, version, date introduced, status (active/archived), eval scores (baseline), file paths
   - Include all 4 prompt types at v1.0

6. **Implement PromptRegistry class in `src/prompt-registry.ts`**
   - `getPrompt(id: string, version?: string): PromptTemplate` -- loads system-prompt.md and user-template.md from the appropriate directory; if version omitted, uses the active version
   - `listVersions(id: string): PromptVersion[]` -- scans the directory for available versions
   - `getActiveVersion(id: string): string` -- returns the current active version (reads from PROMPT-REGISTRY.md or a config)
   - PromptTemplate type: `{ systemPrompt: string, userTemplate: string, id: string, version: string }`
   - Handle missing prompt files gracefully with clear error messages
   - Cache loaded prompts in memory to avoid repeated file reads

7. **Write unit tests (test-first)**

## Test Requirements

### Test File: `src/__tests__/prompt-registry.test.ts`

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Loads WTM-v1.0 system prompt | `getPrompt("WTM", "v1.0")` | Returns PromptTemplate with non-empty systemPrompt containing mapping rules |
| Loads WTM-v1.0 user template | `getPrompt("WTM", "v1.0")` | Returns PromptTemplate with userTemplate containing `{weather_json}` placeholder |
| Loads all 4 prompt types | `getPrompt` for WTM, COMP, SOC, NARR | All return valid PromptTemplate objects |
| Returns active version when version omitted | `getPrompt("WTM")` | Returns v1.0 (the only/active version) |
| Lists versions for a prompt ID | `listVersions("WTM")` | Returns array containing "v1.0" |
| Gets active version | `getActiveVersion("WTM")` | Returns "v1.0" |
| Handles non-existent prompt ID | `getPrompt("INVALID")` | Throws descriptive error |
| Handles non-existent version | `getPrompt("WTM", "v9.9")` | Throws descriptive error |
| Caches loaded prompts | Call `getPrompt` twice | Second call does not re-read files |
| WTM system prompt contains few-shot examples | Inspect loaded WTM system prompt | Contains all 4 examples from ADR-001 |

## Acceptance Criteria

- [ ] PromptRegistry loads all 4 prompt types (WTM, COMP, SOC, NARR) at v1.0
- [ ] WTM-v1.0 system prompt contains the 4 few-shot examples from ADR-001 Section 5.3
- [ ] WTM-v1.0 system prompt contains all weather-to-mood mapping rules from ADR-001 Section 5.2
- [ ] All user templates contain appropriate placeholders for variable injection
- [ ] PROMPT-REGISTRY.md tracks all 4 prompt versions with metadata
- [ ] `getPrompt`, `listVersions`, and `getActiveVersion` all work correctly
- [ ] Missing prompts produce clear error messages, not silent failures
- [ ] All unit tests pass

## Definition of Done

- [ ] `src/prompt-registry.ts` exports PromptRegistry class
- [ ] All 8 prompt files exist under `docs/prompts/{ID}/v1.0/`
- [ ] `docs/prompts/PROMPT-REGISTRY.md` exists with complete version table
- [ ] All unit tests in `src/__tests__/prompt-registry.test.ts` pass
- [ ] Code compiles with `tsc --noEmit` without errors
- [ ] No lint errors

---

*Traceability: TASK-002 -> SPEC-001 Section 2.7 -> PRD-001 Section 5.3, ADR-001 Section 5*
