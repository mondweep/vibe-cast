---
plugin: example-plugin
plugin_id: plugin_00EXAMPLE
category: role-suite
status: evaluated
evaluated: 2026-08-13
scores:
  job_fit: 4
  activation: 2
  output_quality: 4
  setup_cost: 5
  data_trust: 4
  overhead: 3
collisions: fires on data-analysis prompts that belong to `data`
---

# example-plugin

> **This is an illustrative example, not a real evaluation.** No such plugin exists. It
> shows how a completed evaluation reads and what level of detail to aim for. The `_`
> prefix keeps it out of the leaderboard — see `scripts/score.py`.

## Dependencies

None. Works out of the box.

## T1 — Canonical task

**Prompt:** `Draft a standup update from the last three commits on this branch.`

- **Activated:** yes (expected: yes)
- **vs baseline:** Structure was better — grouped by workstream rather than per-commit —
  but baseline caught a revert the plugin summarised as a feature.

## T2 — Adjacent task

**Prompt:** `Turn that standup into a stakeholder-facing weekly note.`

- **Activated:** yes (expected: yes)
- **vs baseline:** Roughly equal. The plugin's house format is opinionated in a way that
  needed two rounds of correction to undo.

## T3 — Off-target task

**Prompt:** `Why is this SQL query doing a full table scan?`

- **Activated:** yes (expected: **no**)
- **vs baseline:** Worse. It framed a query-plan question as a process problem and
  suggested a retro. Baseline read the query and named the missing index.

## Scoring notes

Justify anything scored 0–1 or 5. Mid-range scores can stand without comment.

| Criterion | Score | Note |
|---|---:|---|
| Job fit | 4 | Standups and code review are weekly work |
| Activation reliability | 2 | Failed T3 outright; also grabbed two unrelated turns during the week |
| Output quality | 4 | Genuinely better structure on T1 |
| Setup cost | 5 | Zero configuration, no accounts, no OAuth |
| Data exposure | 4 | Stays in-session; no external egress observed |
| Overhead | 3 | Noticeable but tolerable context footprint |

## Verdict

**Hold.** Weighted score is 71.0, which lands in Trial, but activation scored 2 and the
framework's third override rule caps that at Hold. A plugin that answers SQL questions
with a retro suggestion costs more across a week than its better standups return. Worth
re-testing if activation scoping improves.
