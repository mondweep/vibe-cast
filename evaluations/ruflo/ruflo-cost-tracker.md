---
plugin: ruflo-cost-tracker
plugin_id: ruflo-cost-tracker
category: hooks
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

# ruflo-cost-tracker

> Token usage tracking, model cost attribution per agent, budget alerts, and optimization recommendations

## Dependencies

Requires **hooks on Stop**. Confirm each is authorised before testing; if any is missing, set `status: blocked` and record which one.

Measured surface area: 1 commands, 1 agents, 20 skills, no MCP server, hooks on Stop (v0.26.3).

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
