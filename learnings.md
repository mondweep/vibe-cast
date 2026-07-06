# Lattice — Setup & Learnings

A running log of getting [Lattice](https://github.com/ohdearquant/lattice) running on this
Mac Mini (Apple Silicon, 16 GB), plus the general lessons picked up along the way.

_Environment: macOS (Darwin), zsh, Apple Silicon (aarch64), 16 GB RAM._

---

## 1. Installing Rust

Lattice is a Rust project, so the first requirement is the Rust toolchain (via `rustup`).

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"          # load it into the CURRENT shell
```

Installed: `rustc` / `cargo` 1.96.1, `rustup` 1.29.0.

**Learnings**
- The toolchain lives in `~/.cargo/bin`. The installer adds `. "$HOME/.cargo/env"` to
  `~/.zshenv`, so **new** terminals get `cargo`/`rustc` automatically; the **current** shell
  needs `. "$HOME/.cargo/env"` once.
- `~/.cargo/bin` being on `PATH` becomes important later (see §9 — global `lattice`).

---

## 2. The "package not found" trap — you must be *inside* the repo

First error hit:

```
error: package(s) `lattice-embed` not found in workspace `.../hello`
```

**Cause:** the command was run from a throwaway `cargo new hello` test project, not from a
clone of Lattice. `lattice-embed` only exists inside the Lattice workspace.

**Fix:** clone the real repo and run commands from its root.

```sh
cd ~/Documents/Lattice
git clone https://github.com/ohdearquant/lattice
cd lattice
cargo build            # compiles all 5 crates
```

Workspace crates: `inference`, `embed`, `fann`, `tune`, `transport`.

**Learnings**
- `cargo run -p <pkg>` resolves `<pkg>` against the **workspace of the current directory**.
  Wrong directory → "package not found," even though the code exists elsewhere on disk.
- Don't paste the trailing prose from a tutorial into the terminal
  (e.g. `... --example similarity — outputs cosine similarity...`). Everything after the real
  command is not part of it.

---

## 3. Running the getting-started examples

All four ran cleanly from `~/Documents/Lattice/lattice`:

```sh
cargo run -p lattice-embed     --example basic_embed     # embeddings + SIMD caps (NEON on M-series)
cargo run -p lattice-embed     --example similarity      # cosine sim, nearest-neighbor
cargo run -p lattice-fann      --example fann_xor         # tiny NN learns XOR (converges ~24 epochs)
cargo run -p lattice-transport --example sinkhorn_ot      # optimal-transport / Sinkhorn
```

**Learnings**
- These use **auto-downloaded** BERT-family embedding models — `bge-small-en-v1.5` landed at
  `~/.lattice/models/` on first run (~129 MB), no manual step.

---

## 4. The Metal GPU benchmark — feature flags + manual model download

Command from the guide failed twice, for two different reasons.

### 4a. Missing feature flag
```
error: target `bench_metal` in package `lattice-inference`
       requires the features: `f16`, `metal-gpu`
```
The guide's *run* line only passed `metal-gpu`; the example needs **both**:
```sh
cargo run --release -p lattice-inference --example bench_metal --features metal-gpu,f16
```

### 4b. Model not auto-downloaded
Then it needed a model that Lattice does **not** fetch automatically:
```
Model not found at ~/.lattice/models/qwen3-embedding-0.6b
```
The in-code hint (`--bin bench_embedding`) is **stale** — that binary doesn't exist. The real
fix is to download the model from HuggingFace yourself:

```sh
pip3 install -U huggingface_hub                      # installs `hf` CLI (into ~/Library/Python/3.9/bin)
export PATH="$HOME/Library/Python/3.9/bin:$PATH"     # that dir isn't on PATH by default
hf download Qwen/Qwen3-Embedding-0.6B --local-dir ~/.lattice/models/qwen3-embedding-0.6b
```

Then the bench runs. On this Mac: CPU ≈ Metal (~1.0×), cosine-sim 1.0000 across lengths,
~29 texts/sec. **No speedup is expected** for a 0.6B model at short sequences on Apple Silicon
(memory-bandwidth-bound; unified memory makes the CPU path already fast). Metal wins show up on
much larger models.

**Learnings**
- Cargo **example/bin targets can gate on features** via `required-features`; you must pass all
  of them. Read them with `grep required-features crates/*/Cargo.toml`.
- **Only 7 BERT-family embedding models auto-download.** Qwen3-Embedding (0.6B / 4B) is
  **"local dir only"** — you must place it at `~/.lattice/models/<slug>/` yourself.
  (Confirmed in `crates/embed/src/service/native.rs`.)

---

## 5. Model compatibility — what Lattice can and cannot load

**Key finding:** none of the pre-existing Ollama models on this machine work with Lattice, for
**two independent reasons**:

| Reason | Detail |
| --- | --- |
| **Format** | Lattice loads **HuggingFace `.safetensors`** only. **Zero GGUF support** (grep of the whole codebase = 0 hits). Ollama stores everything as GGUF blobs in `~/.ollama/models`. |
| **Architecture** | Lattice implements specific families only. |

Lattice's supported models (from README "Supported Models"):
- **Generation:** Qwen**3.5** (0.8B / 2B), Qwen**3.6** (27B, 35B-A3B MoE) — hybrid
  GatedDeltaNet + GQA architecture.
- **Embedding:** BGE, E5, MiniLM (BERT-family, auto-download), + Qwen3-Embedding 0.6B/4B (manual).

So Qwen**2.5**-Coder and Gemma 4 (the Ollama models here) are unsupported regardless of format.

**Learnings**
- "Can model X run in engine Y?" is always **two questions**: right *file format* AND right
  *architecture implementation*. Ollama/llama.cpp (GGUF) and Lattice/HF-native (safetensors) are
  different worlds — models don't cross over without conversion.

---

## 6. Local model inventory (this Mac Mini)

**Ollama** (`~/.ollama/models`, ~32 GB, GGUF — *not* Lattice-compatible):
- `qwen2.5-coder:14b` / `qwen-coder-14b:latest` (9.0 GB) — code
- `qwen2.5-coder:7b` / `qwen-coder-16k:latest` (4.7 GB) — code
- `gemma4:12b` (7.6 GB)
- `hf.co/unsloth/gemma-4-26B-A4B-it-GGUF:UD-IQ3_XXS` (12 GB)

**Lattice** (`~/.lattice/models`, safetensors — compatible):
- `bge-small-en-v1.5` (~129 MB) — auto-downloaded
- `qwen3-embedding-0.6b` (~1.1 GB) — manually downloaded (§4)
- `qwen3.5-0.8b` (~1.6 GB) — manually downloaded (§7)

Handy commands: `ollama list`, `du -sh ~/.ollama/models`, `ls ~/.lattice/models`.

---

## 7. LoRA end-to-end: train → save → load → generate

Downloaded the chat/base model first (this is the vision-language `Qwen3.5-0.8B`; Lattice's
loader correctly reads the text sub-model out of it):
```sh
hf download Qwen/Qwen3.5-0.8B --local-dir ~/.lattice/models/qwen3.5-0.8b
```

`generate_lora` runs base-model generation, and with `--lora` applies an adapter:
```sh
cargo run --release -p lattice-tune --features safetensors,inference-hook \
  --bin generate_lora -- --prompt "..." --lora <adapter.safetensors>
```

To get a **real** adapter, trained one with `train_grad_full` on a tiny hand-made dataset
(6 prompt/completion pairs teaching a "pirate" answer style):
```sh
cargo run --release -p lattice-tune --features train-backward,safetensors \
  --bin train_grad_full -- --data-dir <dir> --first-layer 22 --steps 40 \
  --rank 8 --alpha 16 --save <adapter.safetensors>
```
Result: train NLL **4.96 → 0.007**, held-out **5.30 → 1.51**. Then the same held-out prompt:
- **Base:** "A mountain is an elevated landform that rises above the surrounding terrain…"
- **+ LoRA:** "Arrr, a mountain be a blazin' ball o' fire in the sky, matey! Yarrr!"

Same prompt, same seed — the only difference is the adapter. It works.

**Learnings**
- The **`Qwen3.5-0.8B` model has 24 layers (0–23)** → `--first-layer` must be ≤ 23. Training
  many layers on **CPU is slow** (12 layers timed out at ~7 min); **top 2 layers** is the sweet
  spot for a quick demo.
- Adapters are saved in **PEFT safetensors format** (`base_model.model.model.layers.N.…lora_A/B.weight`).
- Tiny data + few layers = **obvious overfitting** (it repeated "Yarrr!" and borrowed phrases
  from other training rows). Expected, not a bug — quality needs more data/layers/steps.
- `train_grad` does **not** save an adapter (it's a gradient-check demo). `train_grad_full` and
  `train_grad_layer23` do (`--save`).

---

## 8. `make bench-compare` is a *developer* tool, not a user step

It runs Criterion micro-benchmarks on **two git refs and diffs them** (default
`origin/main` vs `HEAD`) using a git worktree — to catch performance regressions in code changes.

On a clean, unmodified clone `HEAD == origin/main`, so it would benchmark a commit against
itself → meaningless. It's only relevant when **you're editing Lattice's source**.
(The repo's own `CLAUDE.md` requires its output on any perf PR — confirming it's a contributor tool.)

For a real "is everything healthy" check, the user-facing command is `cargo test --workspace`.

---

## 9. Running `lattice` — the CLI

The `lattice` binary (interactive chat + HTTP serve + doctor) needs features `serve,f16`
(+ `metal-gpu` for GPU):
```sh
cargo build --release -p lattice-inference --features serve,f16,metal-gpu --bin lattice
```

Subcommands:
```sh
lattice doctor --model ~/.lattice/models/qwen3.5-0.8b     # preflight: memory fit (non-interactive)
lattice chat   --model ~/.lattice/models/qwen3.5-0.8b     # interactive REPL
lattice serve  --model ~/.lattice/models/qwen3.5-0.8b --port 8080   # OpenAI-compatible HTTP API
```
`chat` flags: `--max-tokens` (default 256), `--temperature` (default 0.7). Exit with `Ctrl-C` / `Ctrl-D`.

### Making it global
Symlinked the built binary into a PATH directory so `lattice` works from anywhere:
```sh
ln -sf ~/Documents/Lattice/lattice/target/release/lattice ~/.cargo/bin/lattice
```
- A **symlink** (not a copy) so it always tracks the latest `--release` build.
- **Don't move/delete the repo**, or the symlink dangles. Re-point with `ln -sf` if you move it.
- Remove with `rm ~/.cargo/bin/lattice`. In an open shell, run `rehash` (zsh) so it's found.

---

## 10. Shell lessons (the ones that actually bit us)

1. **`./` vs bare name.** `lattice` (bare) → zsh searches **`$PATH` only**, never the current
   directory. `./lattice` → run the file **here**. Standing in the same folder as a binary is not
   enough. (Fixed by §9's symlink so the bare name works everywhere.)

2. **No space after commas in `--features`.**
   `--features safetensors, inference-hook` (with a space) → the shell splits it; `cargo run`
   then treats the stray word as a **program argument** and swallows your `--bin ...`, giving a
   confusing "could not determine which binary to run." Write `--features safetensors,inference-hook`
   or `--features "safetensors inference-hook"`.

3. **`~` is expanded by the shell**, before the program sees it — the binary receives the full
   `/Users/...` path.

4. **`cargo run` vs the built binary.** `./target/release/lattice` is the fast path (no rebuild);
   `cargo run --release ... --bin lattice --` rebuilds-if-needed and doesn't care about your CWD.
   Equivalent otherwise.

---

## 11. Token limits & the small-model reality

- **`--max-tokens` hard cap = 4096 tokens total (prompt + reply)** on the Metal build
  (`METAL_RUNTIME_MAX_CACHE_LEN = 4096` in `crates/inference/src/bin/lattice.rs`). The model
  *architecturally* supports 262,144 context, but the chat/serve binaries never allow more than
  4096 on Metal. Practical max ≈ `--max-tokens 3500`.
- **Raising the limit does not improve quality — only length.** `Qwen3.5-0.8B` is a **0.8-billion
  parameter** model; asked to "build a Snakes and Ladders game" it produced incoherent output
  (a random "slideshow" plan) and would only produce *more* of the same with a higher limit.
  Quality ≠ length; small models have a hard capability ceiling.
- For local code generation, the Ollama `qwen2.5-coder:14b` (~17× larger) is a far better tool
  than the 0.8B — but even it won't one-shot a polished app.

---

## 12. Querying the knowledge pack with lattice (RAG over the `.rvf`)

The `lattice-knowledge-pack.zip` is a self-contained RAG kit: a `.rvf` vector DB (963
passages, 384-dim **bge-small-en-v1.5**) + full passage text in `.passages.jsonl` + a Node
CLI (`ask-kb.mjs`) and MCP server (`kb-mcp-server.mjs`). Out of the box it embeds queries with
**transformers.js**. The whole point of this session's work: **lattice *is* a bge-small
embedder**, so we can embed queries with lattice instead and search the same passages.

### Two ways to do it

1. **Pure-lattice (re-embed).** Embed *both* passages and query with lattice, cosine top-k.
   Fully lattice, no Node/`.rvf`, self-consistent. Costs a one-time re-embed of 963 passages.
   → `crates/embed/examples/query_kb.rs` (supports a stdin REPL when given no query).
2. **Reuse the prebuilt `.rvf`.** Embed only the *query* with lattice, feed the vector into
   ruvector's own reader (`@ruvector/rvf` `RvfDatabase.query(qv, k)`) to search the shipped
   index. → `crates/embed/examples/embed_query.rs` (prints the query vector as JSON) +
   `for-ai/rvf-lattice.mjs` (glue).

### Key learnings

- **lattice's default embedder matches the pack exactly.** `NativeEmbeddingService::default()`
  = `BgeSmallEnV15`, 384-dim — the same model the `.rvf` was built with. No config needed.
- **BGE is asymmetric-retrieval, and lattice treats it as symmetric.** The pack embeds
  *passages* with no prefix but *queries* with `"Represent this sentence for searching relevant
  passages: "` (from `lattice-kb.rvf.embed.json`). lattice's `embed_query()` adds **no** prefix
  for BGE — so calling it silently skips the instruction and degrades ranking. **Prepend the
  prefix manually** for the query; use plain `embed()` (no prefix) for passages.
- **The `.rvf` is a segmented binary (`SFVR`/`IDIF`), not a flat f32 array.** `IDIF` sits at
  byte 90; every f32-offset gives garbage norms (~1e18). Don't hand-parse it — use ruvector's
  own JS reader, or just re-embed from `.passages.jsonl` (which we have).
- **Reusing the `.rvf` mixes two embedders → parity gap.** Its passage vectors come from
  **int8-quantized** transformers.js bge (`ask-kb.mjs:166` uses `{ quantized: true }`); lattice
  queries in **f32**. Rankings stay sound (top hits correct), but absolute cosine distances are
  *not* apples-to-apples (e.g. GPU-lock top hit: reuse sim ≈ 0.29 vs re-embed ≈ 0.73). The
  re-embed path is actually *higher-fidelity* retrieval, at the cost of the re-embed time.
- **`lattice` binary has no `embed` subcommand** (only `chat`/`serve`/`doctor`), and no
  `/v1/embeddings` route on `serve`. Embedding is reached via the `lattice-embed` crate —
  examples, or `NativeEmbeddingService` in code.

### Wiring the MCP server through lattice

One gated change in `ask-kb.mjs`: `embed()` shells out to the `embed_query` binary when
`LATTICE_EMBED_BIN` is set (routes **both** the CLI and the MCP server's `searchKb`); unset →
transformers.js fallback. Also set `defaultTarget = 'lattice'` in `kb.config.mjs` (the shipped
config is a shared multi-repo one defaulting to `agent-harness-generator`, whose `.rvf` isn't
in the bundle).

- **MCP is for AI hosts, not the terminal.** You don't "run the MCP" by hand — it speaks
  JSON-RPC over stdio for a *Claude session* to call `search_kb` mid-conversation. To query it
  *yourself*, skip MCP entirely and run the Node scripts. MCP only earns its keep when you want
  Claude to pull KB context automatically.
- Register in Claude Code: `claude mcp add lattice-kb --scope project --env LATTICE_EMBED_BIN=<bin> -- node <…>/kb-mcp-server.mjs`, then `/mcp` to connect. Verify with `claude mcp list`.

### Commands

```sh
# build the lattice query-embedder once
cargo build -q -p lattice-embed --example embed_query --release   # -> target/release/examples/embed_query

# reuse the prebuilt .rvf, query embedded by lattice
cd ~/Documents/Lattice/lattice-dropin/for-ai && npm install       # @ruvector/rvf reader
export LATTICE_EMBED_BIN=~/Documents/Lattice/lattice/target/release/examples/embed_query
node rvf-lattice.mjs "your question" 5          # standalone, passage-level
node ask-kb.mjs lattice "your question"         # pack CLI, doc-level (now via lattice)

# pure-lattice, no .rvf (re-embeds passages; REPL if no query given)
cargo run -q -p lattice-embed --example query_kb --release -- <passages.jsonl> "your question"
```

---

## Quick reference — everything installed/created this session

| Thing | Location |
| --- | --- |
| Rust toolchain | `~/.cargo/bin` (rustc/cargo 1.96.1) |
| Lattice repo (built) | `~/Documents/Lattice/lattice` |
| Global `lattice` command | `~/.cargo/bin/lattice` → repo's `target/release/lattice` |
| Lattice models | `~/.lattice/models/{bge-small-en-v1.5, qwen3-embedding-0.6b, qwen3.5-0.8b}` |
| `hf` CLI | `~/Library/Python/3.9/bin/hf` (add to PATH to use) |
| Knowledge pack (unzipped) | `~/Documents/Lattice/lattice-dropin/` (RAG `.rvf` + Node CLI/MCP) |
| lattice query-embedder bin | `~/Documents/Lattice/lattice/target/release/examples/embed_query` |
| RAG examples (source) | `crates/embed/examples/{query_kb,embed_query}.rs` (untracked) |
| `.rvf`→lattice glue | `lattice-dropin/for-ai/rvf-lattice.mjs` |
| This doc | `~/Documents/Lattice/learnings.md` |

## Golden rules
1. Run `cargo` commands from **inside** `~/Documents/Lattice/lattice`.
2. Check `required-features` before running an example/bin; pass them **comma-separated, no spaces**.
3. BERT-family embeddings auto-download; **Qwen3 models are manual** via `hf download … --local-dir`.
4. Lattice = **safetensors + specific architectures**. Ollama's GGUF models don't transfer.
5. Small local models have a **capability ceiling** — more tokens ≠ better answers.
6. Querying the KB with lattice: **manually prepend the bge query prefix** (lattice treats BGE
   as symmetric and won't add it), and remember **reusing the `.rvf` mixes quantized-bge
   passages with f32 lattice queries** — rankings hold, absolute scores don't.
7. **MCP ≠ a terminal command.** Run the Node scripts to query it yourself; register the MCP
   server only to let a Claude session query the KB for you.
