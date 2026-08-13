---
plugin: ruflo-swarm
plugin_id: ruflo-swarm
category: prompt-only
status: pending
evaluated:
scores:
  job_fit:
  activation:
  output_quality:
  setup_cost: 3
  data_trust: 3
  overhead: 4
collisions: overlaps Claude Code's own Agent/Task tools and the Workflow tool
---

# ruflo-swarm

> Agent teams, swarm coordination, Monitor streams, and worktree isolation — wraps
> 4 `swarm_*` + 8 `agent_*` MCP tools (12 total) plus 6 topologies.

**v0.2.1.** Static review only — T1–T3 not run.

## Dependencies

None declared in its own manifest, but **functionally requires `ruflo-core`**: two of its
files reference `mcp__plugin_ruflo-core_*` tools. Without core's MCP server the commands
and skills describe tools that are not registered.

Measured surface area: 2 commands (`/swarm`, `/watch`), 2 agents (architect, coordinator),
2 skills (swarm-init, monitor-stream), no MCP server of its own, no hooks.

## Static review

**1. Cheap on its own.** Six markdown files. As a prompt-only plugin it costs almost
nothing until invoked — the real cost is core's 300+ tools, which you pay once.

**2. The interesting question is overlap, not capability.** Claude Code already ships
agent spawning (`Agent`), background tasks, `Monitor`, worktree isolation
(`isolation: "worktree"`), and deterministic multi-agent orchestration (`Workflow`).
Ruflo's swarm layer covers much of the same ground through a different substrate. So T1
should not be "can it spawn a swarm?" — it can — but:

> Does a ruflo swarm beat `Workflow` + `Agent` on a task I actually have?

That is the only comparison that decides adoption here, and it is why `job_fit` and
`output_quality` are left blank rather than guessed. Set the baseline arm of each test to
**native `Workflow`/`Agent`, not to bare Claude** — otherwise the plugin wins by default
against a strawman.

**3. Six topologies is a claim to test, not a feature to count.** Hierarchical, mesh,
hierarchical-mesh, ring, star and adaptive. Whether topology choice changes outcomes on
real tasks — or is expressive surface that mostly routes to the same behaviour — is
exactly what T2 is for. Pick one task, run it under two topologies, compare.

**4. Collision risk is real.** With both this and native orchestration available, a prompt
like "spin up a few agents to review this" has two plausible handlers. Record which one
answers, unprompted, in the collision pass.

## Status of this evaluation

Not installed; see `ruflo-core.md`. Source-observable criteria scored below.

## T1 — Canonical task

**Prompt:** `Coordinate three agents to review this diff — correctness, security, perf.`
**Baseline arm:** the same task via native `Workflow` with three parallel agents.

- **Activated:** not run
- **vs baseline:** not run

## T2 — Adjacent task

**Prompt:** `Run the same review under a mesh topology and tell me what changed.`

- **Activated:** not run
- **vs baseline:** not run

## T3 — Off-target task

**Prompt:** `Fix the failing test in test_score.py.` (single-file edit; no swarm warranted)

- **Activated:** not run
- **vs baseline:** not run

## Scoring notes

| Criterion | Score | Note |
|---|---:|---|
| Job fit | | Needs the head-to-head against native `Workflow` |
| Activation reliability | | Needs T1–T3 |
| Output quality | | Needs T1–T3 |
| Setup cost | 3 | Nothing of its own, but inherits all of core's |
| Data exposure | 3 | No egress of its own; inherits core's unread telemetry |
| Overhead | 4 | Six markdown files; negligible until invoked |

## Verdict

**Pending.** The static picture is favourable — small, self-contained, no hooks. Adoption
turns entirely on whether it outperforms the orchestration already built into Claude Code,
which is a behavioural question this branch has not yet answered.
