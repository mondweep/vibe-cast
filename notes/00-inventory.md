# Phase 0 — Inventory

**State:** in progress
**Goal:** replace the hypothesis table in `README.md` with what the repos actually say.

## Method

For each component: locate the repo, read the README and any docs/, record the facts below,
and note whether it is a runnable tool or a design artefact.

## Record (one block per component)

```
Component:
Repo URL:
Commit / version examined:
Language & build:
Licence:
Last meaningful commit:
What it actually does (one paragraph, from source not marketing):
Runnable? (yes / yes-with-caveats / no — design only):
Depends on:
Depended on by:
Open question:
```

---

## Finding 001 — the stack has been repackaged as `ruflo`

**Date:** 2026-09-02 · **Source:** executed (`claude plugin marketplace add ruvnet/ruflo`)

```
Component:      ruflo (Claude Code plugin marketplace)
Repo URL:       https://github.com/ruvnet/ruflo
Commit:         db49919 — "chore(release): 3.38.20 -> 3.38.21"
npm identity:   package.json says name "claude-flow", version 3.38.21
Language:       TypeScript monorepo (v3/@claude-flow/*) + Rust crates/ + Cargo.toml
Licence:        MIT
Runnable?       yes — marketplace added and validated locally
```

**What it actually is:** an "agent meta-harness for Claude Code and Codex", distributed as a
marketplace of **39 plugins**. Critically, the repo's own `package.json` still declares
`"name": "claude-flow"` — so ruflo is not a sibling of claude-flow, it *is* claude-flow, renamed
and repackaged. That single fact reorganises the whole plan below.

**Plugins mapping onto the Phase-0 hypothesis table:**

| README hypothesis | ruflo plugin(s) | Verdict |
|---|---|---|
| claude-flow (orchestration) | `ruflo-core`, `ruflo-swarm`, `ruflo-sparc` | confirmed, renamed |
| RVF / RuVector | `ruflo-rvf`, `ruflo-ruvector`, `ruflo-rag-memory` | confirmed |
| DAA | `ruflo-daa` | **corrected** — see below |
| neural layer | `ruflo-intelligence` (SONA), `ruflo-ruvllm`, `ruflo-neural-trader` | confirmed, different shape |
| QuDAG / consensus | *no plugin* | not present in ruflo |
| ruv-FANN, ruv-swarm, Synaptic Mesh | *no plugin* | not present in ruflo |

**Correction — DAA.** The README guessed "Decentralised Autonomous Agents". In ruflo, `ruflo-daa`
is **"Dynamic Agentic Architecture"** — cognitive patterns, knowledge sharing, adaptive agents.
Different concept entirely. Either the acronym was reused or the original was superseded; unresolved.

**Open question:** are ruv-FANN / ruv-swarm / QuDAG / Synaptic Mesh superseded by ruflo, or do they
live on as separate repos that ruflo depends on? Not yet checked — Phase 0 is not done.

---

## Finding 002 — ruvLLM is a real local runtime with real weights

**Date:** 2026-09-02 · **Source:** executed (`npm install @ruvector/ruvllm`, API introspection)

```
Component:      @ruvector/ruvllm
Version:        2.6.2 (npm)   ⚠ but version() returns "0.1.0" — metadata disagrees with itself
Package size:   3.2 MB — no weights, no .wasm, no .onnx shipped
Runtime deps:   chalk, commander, ora  (i.e. CLI cosmetics only)
Licence:        MIT
Runnable?       yes — 68 exports load cleanly under CJS
```

**Self-description:** "Self-learning LLM runtime — TurboQuant KV-cache (6-8x compression), SONA
adaptive learning, FlashAttention, speculative decoding, GGUF inference."

**The models are real and downloadable** (`RUVLTRA_MODELS`), hosted at `huggingface.co/ruv/ruvltra`:

| id | file | params | quant | ctx | size |
|---|---|---|---|---|---|
| `claude-code` (alias `cc`, `default`) | `ruvltra-claude-code-0.5b-q4_k_m.gguf` | 0.5B | Q4_K_M | 4096 | 398 MB |
| `small` | `ruvltra-small-0.5b-q4_k_m.gguf` | 0.5B | Q4_K_M | 4096 | 398 MB |
| `medium` | `ruvltra-medium-1.1b-q4_k_m.gguf` | 1.1B | Q4_K_M | 8192 | 669 MB |

Weights are **downloaded on demand** into `~/.ruvllm/models`, not bundled in the npm package.

`RuvLLM` exposes: `query, generate, route, searchMemory, addMemory, feedback, stats, forceLearn,
embed, similarity, hasSimd, simdCapabilities, batchQuery, isNativeLoaded`. Plus `StreamingGenerator`
(`stream`, `streamWithCallbacks`, `collect`).

### ⚠ Conflicting evidence — resolve before trusting this

ruvnet's own **ADR-086** (`v3/docs/adr/ADR-086-ruvllm-native-intelligence-backend.md`, dated
2026-04-07, examining ruvllm **2.5.4** — one minor version behind what npm serves) is markedly less
flattering than the package description:

> "A well-structured JS library with SIMD support flag. NOT native Rust/NAPI for most operations.
> Value is in the **coordination framework**, not raw speed."

Its own API test table reports `ReasoningBank.findSimilar` **broken (returns 0 always)**,
`EwcManager.computePenalty` **returns NaN**, and `cosineSimilarity` no faster than plain JS. The ADR's
decision was to use ruvllm only for `SonaCoordinator` / `ContrastiveTrainer` / `TrainingPipeline`
and keep pure JS for the rest.

So there are two claims in tension: the package advertises FlashAttention and speculative decoding;
the vendor's own ADR describes a JS coordination library with several broken numerics. **Neither has
been tested here yet.** Generation quality and throughput are unmeasured — see `experiments/`.

**Open questions:**
1. Does `generate()` produce coherent text, and at what tokens/sec?
2. Is the GGUF path native or JS? `isNativeLoaded()` should answer it.
3. Are the ADR-086 defects still present in 2.6.2, or fixed since 2.5.4?
4. What is RuvLTRA distilled from, and what does "claude-code" fine-tuning actually mean?

---

## Corrections to README

Applied to `README.md` in the same commit as this finding:
- claude-flow → renamed to ruflo; the two are one codebase, not two.
- DAA expanded wrongly; corrected to "Dynamic Agentic Architecture".
- ruvLLM promoted from a vague "neural" row to its own row with the RuvLTRA weights recorded.
- QuDAG / ruv-FANN / ruv-swarm / Synaptic Mesh flagged as *not present in ruflo* — status unresolved.
