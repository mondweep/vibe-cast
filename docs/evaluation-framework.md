# Plugin Evaluation Framework

A plugin is not free. Every enabled plugin adds skills, slash commands, hooks, agents
and sometimes MCP tool schemas to a session. That costs context, adds surface area for
mis-triggering, and — for connector-backed plugins — moves data to a third party. So the
question is never "is this plugin good?" but **"is this plugin worth its cost for the way
I actually work?"**

This framework answers that with six weighted criteria, a fixed three-task test protocol,
and a four-band verdict.

---

## 1. The six criteria

Each is scored **0–5**. Weights sum to 100.

| # | Criterion | Weight | Score 0 | Score 5 |
|---|---|---:|---|---|
| 1 | **Job fit** | 20 | Nothing in it maps to work I do | Covers a task I do weekly or more |
| 2 | **Activation reliability** | 20 | Never fires when needed, or fires constantly when not | Fires precisely on-target, silent otherwise |
| 3 | **Output quality vs baseline** | 20 | Worse than plain Claude with no plugin | Clearly better, and better in a way I couldn't get by just asking well |
| 4 | **Setup & dependency cost** | 10 | Needs paid accounts, OAuth, and admin approval | Works immediately, zero configuration |
| 5 | **Data exposure & trust** | 15 | Sends sensitive data to a third party with unclear retention | Stays local to the session; no external egress |
| 6 | **Context & interference overhead** | 15 | Bloats every session; collides with other plugins | Negligible footprint until invoked |

### Scoring anchors

Use whole numbers. If you can't tell the difference between a 3 and a 4, score 3 — the
band boundaries are set so that honest uncertainty lands on the conservative side.

- **0** — actively harmful or entirely absent
- **1** — present but unusable
- **2** — usable with effort, not worth it
- **3** — works, roughly break-even
- **4** — good, a clear net positive
- **5** — excellent, would notice its absence

### Weighted score

```
score = Σ (criterion_score / 5) × weight     → 0–100
```

`scripts/score.py` computes this and writes `docs/leaderboard.md`.

---

## 2. The test protocol

Three tasks per plugin, always in this order. Run each **twice**: once with the plugin
enabled, once with it disabled (the baseline). Record both outputs.

| Task | Purpose | What it tells you |
|---|---|---|
| **T1 — Canonical** | The single task the plugin most obviously exists for | Ceiling: how good is it at its best? |
| **T2 — Adjacent** | A task at the edge of its stated scope | Generalisation: does it degrade gracefully or confidently mislead? |
| **T3 — Off-target** | A task it should *not* handle, in a neighbouring domain | Precision: does it stay quiet, or hijack the turn? |

**T3 is the criterion most people skip and the one that matters most when 20 plugins are
enabled at once.** A plugin that scores 5 on T1 and hijacks unrelated turns is a net
negative in a busy account.

### Recording rule

For each task, capture:
- the exact prompt used,
- whether the plugin activated (and whether it *should* have),
- a one-line verdict on the output difference vs baseline.

Do not paste full transcripts into the eval file. One line per task, plus the raw
transcript saved separately if it matters.

---

## 3. Verdict bands

Adapted from the technology-radar convention. The verdict is set by weighted score, then
adjusted by the override rules below.

| Band | Score | Meaning |
|---|---:|---|
| **Adopt** | ≥ 75 | Keep enabled by default |
| **Trial** | 55–74 | Keep enabled, re-evaluate in 90 days |
| **Hold** | 35–54 | Disable; enable per-task when specifically needed |
| **Drop** | < 35 | Disable and remove |

### Overrides

These outrank the numeric band:

1. **Any criterion scored 0 → cannot exceed Hold.** A zero anywhere is a disqualifier.
2. **Data exposure ≤ 2 → cannot exceed Trial**, regardless of usefulness. Convenience does
   not buy back an unclear data path.
3. **Activation reliability ≤ 2 → cannot exceed Hold.** A plugin that fires on the wrong
   turns taxes every session, not just the ones where you wanted it.
4. **Unevaluated dependency → status stays `blocked`, not a verdict.** If the plugin needs
   an MCP server or connector that isn't authorised, say so and stop. Do not guess a score.

---

## 4. Conflict of interest

Twelve of the twenty-one plugins on this account are role suites (engineering, sales,
finance, …) with overlapping scope. Score each one on its own merits first, then run the
**collision pass**:

> With all plugins in a category enabled at once, run each category member's T1. Note any
> case where the wrong plugin answers.

Collisions are recorded in the `collisions` field of each evaluation and summarised at the
bottom of the leaderboard. A plugin that only collides when a rarely used sibling is
enabled is a different problem from one that collides with a daily driver.

---

## 5. Re-evaluation cadence

- **Adopt** — re-check annually, or on a major plugin update
- **Trial** — 90 days, hard deadline; an expired Trial defaults to Hold
- **Hold / Drop** — only on request, or when the underlying tool changes materially

Record the date in `evaluated` and let `scripts/score.py --stale` flag anything overdue.
