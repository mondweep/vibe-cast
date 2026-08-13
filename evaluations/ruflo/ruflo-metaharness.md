---
plugin: ruflo-metaharness
plugin_id: ruflo-metaharness
category: prompt-only
status: pending
evaluated:
scores:
  job_fit:
  activation:
  output_quality:
  setup_cost:
  data_trust:
  overhead:
collisions:
---

# ruflo-metaharness

> MetaHarness integration — surfaces score/genome/mint/mcp-scan/threat-model via skills; pairs with @metaharness/router (ADR-148/149) for cost-optimal model routing; honors ADR-150 optional-augmentation constraint

## Dependencies

None declared. Works out of the box.

Measured surface area: 1 commands, 1 agents, 13 skills, no MCP server, no hooks (v0.1.1).

## T1 — Canonical task

**Prompt:** `<the exact prompt>`

- **Activated:** yes / no (expected: yes)
- **vs baseline:** <one line>

## T2 — Adjacent task

**Prompt:** `<the exact prompt>`

- **Activated:** yes / no (expected: yes)
- **vs baseline:** <one line>

## T3 — Off-target task

**Prompt:** `<the exact prompt>`

- **Activated:** yes / no (expected: **no**)
- **vs baseline:** <one line>

## Scoring notes

Justify anything scored 0–1 or 5. Mid-range scores can stand without comment.

| Criterion | Score | Note |
|---|---:|---|
| Job fit | | |
| Activation reliability | | |
| Output quality | | |
| Setup cost | | |
| Data exposure | | |
| Overhead | | |

## Verdict

<Adopt / Trial / Hold / Drop, and the one sentence that decided it. If an override rule
from the framework applied, name it.>
