---
plugin: ruflo-rag-memory
plugin_id: ruflo-rag-memory
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
collisions:
---

# ruflo-rag-memory

> RuVector memory with HNSW search, AgentDB, and semantic retrieval.

**v0.2.1.** Static review only — T1–T3 not run.

## Dependencies

**Explicitly requires `ruflo-core`.** Its README says so directly: "Requires — `ruflo-core`
plugin (provides MCP server)."

Measured surface area: 2 commands (`/recall`, `/ruflo-memory`), 1 agent
(memory-specialist), 2 skills (memory-bridge, memory-search), no MCP server of its own,
no hooks.

## Static review

**1. Two access paths, and they are not equivalent.** The README documents both a CLI form
and an MCP form for the same operation:

```
npx @claude-flow/cli@latest memory search --query "auth patterns" --smart --limit 10
mcp__plugin_ruflo-core_ruflo__memory_search({ query: "auth patterns", smart: true, limit: 10 })
```

The CLI path pulls a package at call time; the MCP path goes through core's already-running
server. Worth establishing which one the skills actually take in practice, because the
supply-chain surface differs between them.

**2. This is the plugin whose value proposition is most legible.** Cross-session memory is
a real gap in the default tooling — Claude Code carries context within a session and
summarises across compaction, but it does not persist a searchable store of decisions
between sessions. If any Ruflo plugin justifies core's overhead on its own, the prior
should be this one.

**3. Which makes the honest test a retrieval-quality test, not a storage test.** Storing is
trivially verifiable. What matters:

- Does `/recall` surface the right decision weeks later, from a query phrased differently
  than the stored text? (That is what HNSW + semantic retrieval is *for*.)
- What is the false-positive rate — how often does it confidently return a near-miss?

A memory layer that returns plausible-but-wrong prior decisions is worse than no memory
layer, because it launders a guess into an apparent record. T2 should deliberately probe
this: store two similar-but-distinct decisions, then query the boundary between them.

**4. Data lands on disk, and that is the trust question.** Content stored in AgentDB /
RuVector persists outside the session. Before adopting, establish where the store lives,
whether it is committed anywhere by accident, and what happens to it on
`--generate-summary --persist-state` at session end. This repo already runs gitleaks in CI
(see `main`); a memory store that captures snippets of source is exactly the kind of thing
worth keeping out of a commit.

## Status of this evaluation

Not installed; see `ruflo-core.md`. Source-observable criteria scored below.

## T1 — Canonical task

**Prompt:** `Store this branch's scoring-weight rationale, then recall it in a fresh session.`

- **Activated:** not run
- **vs baseline:** not run

## T2 — Adjacent task

**Prompt:** Store two adjacent decisions, then query the boundary — `Which store did we
pick for embeddings, and why not the other one?`

- **Activated:** not run
- **vs baseline:** not run — **watch for confident near-misses; this is the failure mode
  that matters.**

## T3 — Off-target task

**Prompt:** `What does score.py do?` (answerable by reading the file; no memory needed)

- **Activated:** not run — should read the file, not consult the store
- **vs baseline:** not run

## Scoring notes

| Criterion | Score | Note |
|---|---:|---|
| Job fit | | High prior — cross-session memory is a genuine gap — but unmeasured |
| Activation reliability | | Needs T1–T3 |
| Output quality | | Hinges on retrieval precision, not storage |
| Setup cost | 3 | Nothing of its own; inherits core's |
| Data exposure | 3 | Persists content to a local store; location and lifecycle unverified |
| Overhead | 4 | Five markdown files; negligible until invoked |

## Verdict

**Pending.** Strongest a-priori case of the four, and the one most worth running the full
protocol on. Verify where the store writes before putting anything real in it.
