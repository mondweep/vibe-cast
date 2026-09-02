# 02 — RuvLTRA vs Qwen, head to head

**Question:** Experiment 01 showed ruvLLM can't run its own weights. But are the *weights* any
good? Is `RuvLTRA-claude-code-0.5B` better than the Qwen base it was fine-tuned from?

**Answer:** The question dissolves on contact. **RuvLTRA was never fine-tuned.** All three
"RuvLTRA" models are byte-for-byte copies of well-known public models, re-hosted under new names.

## The finding

Hashes of the files served from `huggingface.co/ruv/ruvltra`, compared with their originals:

| RuvLTRA model | advertised as | SHA256 (HF `x-linked-etag`) | actually is |
|---|---|---|---|
| `ruvltra-claude-code-0.5b-q4_k_m.gguf` | "fine-tuned for Claude Code workflows" | `f0a42bb9…ab81a8` | **Qwen2-0.5B-Instruct**, unmodified |
| `ruvltra-small-0.5b-q4_k_m.gguf` | "Edge devices, IoT, resource-constrained" | `f0a42bb9…ab81a8` | **the same file again** |
| `ruvltra-medium-1.1b-q4_k_m.gguf` | "General purpose, balanced performance" | `9fecc3b3…2776a0` | **TinyLlama-1.1B-Chat-v1.0** (TheBloke's GGUF), unmodified |

Originals for comparison:

| Source | SHA256 |
|---|---|
| `Qwen/Qwen2-0.5B-Instruct-GGUF/qwen2-0_5b-instruct-q4_k_m.gguf` | `f0a42bb9…ab81a8` |
| `TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/…Q4_K_M.gguf` | `9fecc3b3…2776a0` |

Two independent confirmations:

1. **Local** — downloaded both files and hashed them: identical MD5 *and* SHA256, identical size
   (397,805,248 bytes exactly).
2. **Server-side** — HuggingFace's `x-linked-etag` header *is* the content SHA256 of the stored
   LFS object. Both URLs report the same etag, so this holds at HF's storage layer regardless of
   my download.

So `claude-code` and `small` are presented in `listModels()` as two models with different
parameter counts' worth of distinct use cases ("Claude Code workflows, agentic coding" vs "Edge
devices, IoT") while being **the same bytes**. And the "Claude Code fine-tune" contains no
Claude Code fine-tuning — it is stock Qwen2-0.5B-Instruct.

### Corroborating metadata

The GGUF headers agree. `ruvltra-claude-code-0.5b`'s `general.name` is **`qwen2-0_5b-instruct`** —
the original name, never rewritten. Architecture `qwen2`, 24 blocks, 896 embedding dim, 14/2
attention heads, 151936 vocab: identical to the Qwen file in every field.

### A note on ruvnet's own baseline

`COMPARISON_MODELS` in `@ruvector/ruvllm` pits `ruvltra-claude-code` against **Qwen2.5**-0.5B-Instruct
— a *newer generation* than the Qwen**2** it actually is. So the package's built-in comparison
benchmarks a copy of Qwen2 against Qwen2.5 and attributes any difference to "RuvLTRA".

## Reproduce the hash check

```bash
etag() { curl -sSI -L "$1" | grep -i '^x-linked-etag' | sed 's/.*"\(.*\)".*/\1/'; }
etag https://huggingface.co/ruv/ruvltra/resolve/main/ruvltra-claude-code-0.5b-q4_k_m.gguf
etag https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/qwen2-0_5b-instruct-q4_k_m.gguf
# same hash -> same file
```

That is the whole finding, in two HTTP HEAD requests and no downloads.

## The benchmark

The harness was built before the hash check and kept, because it demonstrates the finding
behaviourally rather than cryptographically — and because it's reusable for any future GGUF
comparison.

```bash
npm install
npm run bench                      # all available models
node bench.mjs --models ruvltra,qwen2
```

**Design.** 12 JavaScript tasks (7 general, 5 "agentic" — CLI arg parsing, retry backoff, tool-call
validation, token budgeting — chosen to give the claimed Claude Code specialisation a fair shot),
32 executable assertions. Generated code is extracted from the response and run in an **isolated
child process** with a 5 s timeout, then scored against assertions. No LLM judge; a task passes
only if every assertion passes. Greedy decoding (`temperature: 0`) so runs are reproducible, and a
fresh context per task so there's no cross-task contamination.

Runtime is `node-llama-cpp` — necessary because, per experiment 01, ruvLLM cannot load GGUF files
at all.

### Result (2026-09-02)

| model | overall | general | agentic | tok/s |
|---|---|---|---|---|
| RuvLTRA claude-code 0.5B | **6/12 (50%)** | 6/7 | **0/5** | 37.6 |
| Qwen2-0.5B-Instruct *(true base)* | **6/12 (50%)** | 6/7 | **0/5** | 38.1 |
| Qwen2.5-0.5B-Instruct *(ruvnet's baseline)* | 9/12 (75%) | 6/7 | 3/5 | 37.2 |

RuvLTRA and Qwen2 produced **byte-identical responses on 12 of 12 tasks** — same text, same token
counts, same verdicts. Against Qwen2.5 as a control, only 1 of 12 matched. Two "different" models
agreeing character-for-character across every task is the behavioural proof of the hash finding.

The second detail is sharper than the first. RuvLTRA is sold for "Claude Code workflows, agentic
coding" and scores **0/5 on exactly those tasks** — while Qwen2.5, a general-purpose model with no
such claim, gets 3/5. The "agentic coding" specialisation doesn't merely fail to help; the model
carrying that label is beaten on its own advertised turf by an ordinary newer model.

Full transcripts: [`results/2026-09-02-transcripts.json`](./results/2026-09-02-transcripts.json) ·
console output: [`results/2026-09-02-run.txt`](./results/2026-09-02-run.txt)

## What this means

Experiment 01 found the runtime doesn't work. This one finds the weights don't exist as claimed.
Together they mean the "self-learning LLM runtime with GGUF inference" is, in its published form,
a re-host of two public models behind a runtime that cannot load them.

Worth being precise about scope: this is a finding about **`@ruvector/ruvllm` and `ruv/ruvltra` as
published**, verified on 2026-09-02. It says nothing about the rest of the ruflo ecosystem, which
is separately large and may hold up better — that is what the remaining phases are for. It is also
possible fine-tuned weights exist somewhere and the wrong files were uploaded; the observable
artifacts are what they are.

## Reproducibility

- `node-llama-cpp` (llama.cpp), CPU backend, Node v22.22.2, linux-x64
- Models from `hf.co/ruv/ruvltra`, `hf.co/Qwen/Qwen2-0.5B-Instruct-GGUF`,
  `hf.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF`, all Q4_K_M
- Hashes verified 2026-09-02, both locally and via HF etag
