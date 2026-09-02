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

Phase 0 has started, so this table now mixes verified facts with open questions. ✅ = checked
against source or executed. ❓ = still a guess. The headline correction: **ruflo is claude-flow**,
and much of the stack has been repackaged into it.

| Layer | Component | Status after Phase 0 |
|---|---|---|
| Harness | **ruflo** | ✅ **This is claude-flow, renamed.** `package.json` still says `"name": "claude-flow"` @ 3.38.21. A marketplace of 39 Claude Code plugins. |
| Orchestration | `ruflo-core`, `ruflo-swarm`, `ruflo-sparc` | ✅ Present as plugins. Untested. |
| Neural runtime | **`@ruvector/ruvllm`** | ❌ **Tested — not functional.** Weights are real (RuvLTRA 0.5B/1.1B, `hf.co/ruv/ruvltra`) but the package ships no code that reads them: no model-path config, no GGUF parser, zero `gguf`/`llama` strings in the native binary. `generate()` emits garbage; embeddings can't separate related from unrelated text (0.001 separation). [Evidence →](./experiments/01-ruvllm-reality-check/) |
| Cognition | `ruflo-rvf`, `ruflo-ruvector`, `ruflo-rag-memory` | ✅ Present as plugins. Untested. |
| Agents | `ruflo-daa` | ⚠️ **Correction:** "Dynamic Agentic Architecture", *not* "Decentralised Autonomous Agents" as first guessed. |
| Learning | `ruflo-intelligence` (SONA), `ruflo-neural-trader` | ✅ Present. ruvnet's own ADR-086 reports defects in parts of this layer — see notes. |
| Consensus | QuDAG | ❓ **No ruflo plugin.** Superseded, or a separate repo? Unresolved. |
| Neural (orig.) | `ruv-FANN`, `neuro-divergent`, `ruv-swarm` | ❓ **No ruflo plugin.** Same question. |
| Mesh | Synaptic Neural Mesh | ❓ **No ruflo plugin.** Same question. |
| Cloud | Flow Nexus | ❓ Not yet checked. |
| Edge | RuView | ❓ Not yet checked (tried separately in `esb32-tinker-ruview`). |

Full evidence in [`notes/00-inventory.md`](./notes/00-inventory.md).

Out of scope for now: anything requiring paid infrastructure, and anything that can't be run
locally or on a free tier.

---

## Plan

**Phase 0 — Inventory.** Enumerate the actual repos, read their READMEs, record versions, licences,
activity, and maturity. Fix the table above. Note what is a working tool versus a design document.

**Phase 1 — Foundations.** Get `claude-flow` running against Claude Code locally. Understand its
memory model, agent topology, and MCP surface. First real question: what does it give that plain
subagents don't?

**Phase 2 — Neural layer.** ⚠️ *First pass done, and it stopped the phase.* `@ruvector/ruvllm`
was probed directly ([experiment 01](./experiments/01-ruvllm-reality-check/)): 2 of 8 advertised
claims hold. GGUF inference is absent and embeddings are degenerate, so the "per-agent neural
model" question can't be answered through ruvLLM. Open: run RuvLTRA under llama.cpp to see whether
the *weights* are any good independent of the runtime, then revisit `ruv-FANN`.

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
| 0 — Inventory | **in progress** — ruflo mapped; QuDAG / ruv-FANN / mesh still open |
| 1 — Foundations | not started |
| 2 — Neural | ⚠️ **blocked** — ruvLLM verified non-functional for inference ([experiment 01](./experiments/01-ruvllm-reality-check/)); needs a real runtime |
| 3 — Cognition & mesh | not started |
| 4 — Consensus | not started |
| 5 — Composition | not started |
| 6 — Verdict | not started |

Branch created 2026-09-02. First findings recorded the same day: the stack table above has already
been corrected twice by actually running things.

---

MIT licensed, same as the rest of `vibe-cast`. See [LICENSE](./LICENSE).
