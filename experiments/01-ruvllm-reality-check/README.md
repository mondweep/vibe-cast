# 01 — ruvLLM reality check

**Question:** Is `@ruvector/ruvllm` a working local LLM runtime?

**Answer:** No. It downloads real model weights it has no code to read, and its embeddings
cannot tell related text from unrelated text. The scaffolding around those two things is real
and runs cleanly.

## Run it

```bash
npm install
npm run check          # exits non-zero if any claim fails
```

No network access needed except an `npm view` call in claim 3. Model weights are optional —
claim 8 reports whether they're present locally rather than requiring them.

## What was tested

The package advertises itself as:

> "Self-learning LLM runtime — TurboQuant KV-cache (6-8x compression), SONA adaptive learning,
> FlashAttention, speculative decoding, GGUF inference"

Eight testable claims, against `@ruvector/ruvllm@2.6.2` on linux-x64, Node 22.22.2:

| # | Claim | Verdict |
|---|---|---|
| 1 | Version metadata self-consistent | ⚠️ WARN — `package.json` says `2.6.2`, `version()` returns `0.1.0` |
| 2 | Native bindings load | ✅ PASS |
| 3 | Fallback message names a real package | ❌ FAIL |
| 4 | GGUF inference implemented | ❌ FAIL |
| 5 | `generate()` produces coherent text | ❌ FAIL |
| 6 | Embeddings carry semantic meaning | ❌ FAIL |
| 7 | `searchMemory()` retrieves relevant entries | ❌ FAIL |
| 8 | RuvLTRA weights real and downloadable | ✅ PASS |

**2 passed, 5 failed, 1 warning.** Full output in [`results/`](./results/).

## The three findings that matter

### 1. GGUF inference is not implemented (claims 4, 5)

`RuvLTRA` weights are genuinely real — `ruvltra-claude-code-0.5b-q4_k_m.gguf`, 398 MB, downloads
in seconds from `hf.co/ruv/ruvltra`. But nothing in the package can read them:

- `RuvLLMConfig` has **no model-path field**. `toNativeConfig()` whitelists exactly eight keys
  (`embeddingDim`, `routerHiddenDim`, `hnswM`, `hnswEfConstruction`, `hnswEfSearch`,
  `learningEnabled`, `qualityThreshold`, `ewcLambda`) and silently drops everything else. Passing
  `modelPath` throws nothing and changes nothing.
- **Zero** GGUF/llama references in the JS `dist/`, and **zero** `gguf|llama|tokenizer|vocab`
  strings in the 1 MB native `.node` binary. No llama.cpp, no subprocess, no GGUF parser.

So `generate()` runs against an untrained 1 MB engine and emits exactly what you'd expect:

```
|yTintothe6thatfrom_that/_:of:hthattododothe$+k\of_the6:cantcan}L+that:|mcan_cany%canyOTTTO_N...
```

1259 ms, 78% letters, 1 of 6 expected words. That is not a language model — it's a randomly
initialised sampler over a token vocabulary.

### 2. Embeddings are degenerate (claims 6, 7)

The decisive test. Five genuinely related pairs vs five unrelated pairs:

| | mean | range |
|---|---|---|
| Related | 0.986150 | 0.959317 – 0.999556 |
| Unrelated | 0.985020 | 0.965133 – 0.998724 |

**Separation: 0.00113**, and the distributions fully overlap. Worse, two strings of pure
gibberish (`"qq zz xx"` vs `"vv ww yy"`) score **0.999664** — higher than *any* genuinely
related pair in the set.

Every vector is near-parallel to every other, so cosine ranking over them is arbitrary. This is
what a hash-like projection looks like, not a trained embedding. `searchMemory()` scored **0/3**
on obvious retrieval probes, which follows directly.

Separately, `searchMemory()` **drops metadata** — entries stored with `{branch: '...'}` come back
with `{}`, so a hit can't be traced to its source even when it's correct.

### 3. Two packaging bugs (claims 3, 8)

- **The fallback message is wrong.** With no native module, `generate()` tells you to
  `npm install @ruvector/ruvllm-linux-x64`. That package **404s**. The real name in
  `native.js` `PLATFORM_PACKAGES` is `@ruvector/ruvllm-linux-x64-gnu` — the `-gnu` suffix is
  missing from the message. (In practice the native binding ships as an optional dependency and
  loads automatically, so most users never see this — but anyone who hits the fallback is sent
  to a dead end.)
- **Two crossed model registries.** `listModels()` returns `RUVLTRA_MODELS` with ids
  `claude-code` / `small` / `medium`. `downloadModel()` looks up `COMPARISON_MODELS`, whose ids
  are `ruvltra-claude-code` / `qwen-base`. So the obvious call —
  `downloadModel('claude-code')` on an id `listModels()` just advertised — throws
  `Unknown model: claude-code`. Use `ruvltra-claude-code`.

## Incidental finding: what RuvLTRA is

`COMPARISON_MODELS` pairs `ruvltra-claude-code` against `qwen-base` —
**Qwen2.5-0.5B-Instruct**. The comparison harness exists to benchmark RuvLTRA against that base,
which strongly implies RuvLTRA-claude-code-0.5B is a fine-tune of Qwen2.5-0.5B-Instruct. Both
files are downloaded and byte-identical in quantisation (Q4_K_M), so a head-to-head is feasible —
**but not with this package**, since it cannot run either file. It would need llama.cpp or
similar.

## Fairness note

ruvnet's own **ADR-086** (in the ruflo repo, examining ruvllm 2.5.4) is candid about much of this:

> "A well-structured JS library with SIMD support flag. NOT native Rust/NAPI for most operations.
> Value is in the **coordination framework**, not raw speed."

It independently reports `ReasoningBank.findSimilar` broken (returns 0 always) and
`EwcManager.computePenalty` returning NaN, and decides to keep pure JS for most numerics. So the
internal engineering assessment and this external check broadly agree. The gap is between that
assessment and the **npm package description**, which still advertises FlashAttention,
speculative decoding, and GGUF inference.

## What this means for the branch

ruvLLM cannot be the inference layer for anything in this repo today. Anything built on
`generate()` would be theatre, and anything built on `embed()`/`searchMemory()` would return
arbitrary results while looking like it worked — the more dangerous failure of the two.

The coordination scaffolding (sessions, trajectories, LoRA checkpoint plumbing, HNSW index
mechanics) is real and may still be worth studying as architecture — just not as working ML.

## Reproducibility

- `@ruvector/ruvllm@2.6.2`, native `@ruvector/ruvllm-linux-x64-gnu`
- Node v22.22.2, linux-x64
- ruflo marketplace @ `db49919` (release 3.38.21)
- Run: 2026-09-02 — [`results/2026-09-02-linux-x64.txt`](./results/2026-09-02-linux-x64.txt)

Claim 6 is stochastic in principle but was stable across runs (separation 0.00109 / 0.00113).
Re-run before citing; if a future version fixes this, the separation should jump by orders of
magnitude, not percentages.
