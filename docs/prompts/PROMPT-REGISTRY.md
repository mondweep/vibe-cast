# Prompt Registry

Central registry tracking all prompt versions for the Vibe Cast system.

| Prompt ID | Version | Status | Date       | Eval Score | Description                              |
|-----------|---------|--------|------------|------------|------------------------------------------|
| WTM       | v1.0    | active | 2026-03-30 | pending    | Weather-to-mood mapping (few-shot, 4 examples) |
| COMP      | v1.0    | active | 2026-03-30 | pending    | Mood-to-composition prompt generation    |
| SOC       | v1.0    | active | 2026-03-30 | pending    | Social response generation               |
| NARR      | v1.0    | active | 2026-03-30 | pending    | Feed narrative generation                |

## Storage Layout

```
docs/prompts/
  PROMPT-REGISTRY.md          # This file
  WTM/v1.0/
    system-prompt.md           # System prompt with mapping rules
    user-template.md           # User message template
    few-shot-examples.json     # 4 few-shot examples (rain, sunny, stormy, clear_night)
  COMP/v1.0/
    system-prompt.md           # Composition prompt generator system prompt
    user-template.md           # User message template
  SOC/v1.0/
    system-prompt.md           # Social response generator system prompt
    user-template.md           # User message template
  NARR/v1.0/
    system-prompt.md           # Feed narrative generator system prompt
    user-template.md           # User message template
```

## Version Policy

- **Major** (vX.0): Breaking changes -- output schema changes, mapping rules redefined
- **Minor** (vX.Y): Additive changes -- new examples, new conditions added
- **Patch** (vX.Y.Z): Refinements -- wording clarifications, whitespace changes

A prompt version is promoted to production only when it meets or exceeds all AI quality metric thresholds on the eval set.

---

*Traceability: PROMPT-REGISTRY -> SPEC-001 Section 2.7, PRD-001 Section 5.3*
