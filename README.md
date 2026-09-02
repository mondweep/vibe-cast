# Explore: the ruv stack

> Orphan branch of [`vibe-cast`](https://github.com/mondweep/vibe-cast) — a clean-slate lab for
> working through **[@ruvnet](https://github.com/ruvnet)'s agentic stack** ("ruvstack") end to end.
> No history from `main`; this branch stands on its own.

Sibling branches in this repo have already touched parts of the stack in passing
(`claude/explore-rvf-ruvector-iUqFW`, `explore-rvf-bird-song`, `dao-dag`, `esb32-tinker-ruview`,
`claude/pi-tinkering-86sN1`, the Claude Flow V3 branches). This branch is the attempt to see the
whole thing as **one system**, rather than one component at a time.

---

## Why

Individual pieces of this ecosystem keep showing up in other projects — Claude Flow for
orchestration, RVF/RuVector for cognitive containers, QuDAG for quantum-resistant consensus. What's
missing is a map: how the layers fit, where they overlap, what's production-shaped versus
research-shaped, and which parts are worth reaching for by default.

The output of this branch is that map, backed by things actually run rather than things read about.

---

## What's in scope

The stack, as understood going in — **every line here is a hypothesis to be checked against the
source, not a claim.** Correcting this table is part of the work.

| Layer | Component | What it's believed to do |
|---|---|---|
| Orchestration | `claude-flow` | Swarm/hive-mind orchestration on top of Claude Code; MCP server, SPARC modes, memory |
| Orchestration | `ruv-swarm` | Rust/WASM swarm runtime with per-agent neural models |
| Neural | `ruv-FANN` | Rust reimplementation of FANN; the numeric base for the swarm layer |
| Neural | `neuro-divergent` | Forecasting models built on `ruv-FANN` |
| Cognition | RVF / RuVector | "Cognitive containers" — portable, composable reasoning units |
| Mesh | Synaptic Neural Mesh | Distributed neural fabric across agents/nodes |
| Consensus | QuDAG | Quantum-resistant DAG network (ML-DSA); the substrate under DAA |
| Agents | DAA | Decentralised Autonomous Agents SDK on top of QuDAG |
| Cloud | Flow Nexus | Hosted swarm execution, sandboxes, challenges |
| Quality | Agentic QE | Agentic quality-engineering fleet |
| Edge | RuView | WiFi-CSI sensing (already tried on ESP32-S3 in `esb32-tinker-ruview`) |

Out of scope for now: anything requiring paid infrastructure, and anything that can't be run
locally or on a free tier.

---

## Plan

**Phase 0 — Inventory.** Enumerate the actual repos, read their READMEs, record versions, licences,
activity, and maturity. Fix the table above. Note what is a working tool versus a design document.

**Phase 1 — Foundations.** Get `claude-flow` running against Claude Code locally. Understand its
memory model, agent topology, and MCP surface. First real question: what does it give that plain
subagents don't?

**Phase 2 — Neural layer.** Build and run `ruv-FANN`. Train something small. Understand what
"per-agent neural model" means concretely in `ruv-swarm`, and whether it changes behaviour or is
mostly framing.

**Phase 3 — Cognition & mesh.** RVF cognitive containers, reusing what the RVF branches already
learned. Then Synaptic Mesh, if there's a runnable path.

**Phase 4 — Consensus.** QuDAG locally. Multi-node if feasible; otherwise read the protocol and
document it honestly as unrun.

**Phase 5 — Composition.** One small end-to-end build using at least three layers together. The
point is the seams: where the abstractions meet and whether they hold.

**Phase 6 — Verdict.** An honest assessment: what to use, what to watch, what to skip, and why.

Phases are a sequence, not a schedule. A phase that turns out to be a dead end gets written up as
one and skipped — the abandoned directions are part of the record.

---

## Layout

```
notes/          one file per phase — findings, dead ends, corrections
experiments/    runnable code, one directory per experiment
README.md       this map, kept current as understanding changes
```

## Ground rules

1. **Run it or mark it unrun.** Claims in `notes/` say whether they came from execution or reading.
2. **Version everything.** Fast-moving repos; a note without a commit SHA or version has a short shelf life.
3. **Record the failures.** The install that broke, the flag that was wrong, the concept that didn't land.
4. **No secrets in the tree.** API keys via `.env` (gitignored); `.env.example` documents the shape.

---

## Status

| Phase | State |
|---|---|
| 0 — Inventory | not started |
| 1 — Foundations | not started |
| 2 — Neural | not started |
| 3 — Cognition & mesh | not started |
| 4 — Consensus | not started |
| 5 — Composition | not started |
| 6 — Verdict | not started |

Branch created 2026-09-02. Nothing has been run yet — the table above is a starting hypothesis.

---

MIT licensed, same as the rest of `vibe-cast`. See [LICENSE](./LICENSE).
