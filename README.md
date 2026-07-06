# Lattice exploration — querying a knowledge pack with lattice's own embedder

Session notes + code from wiring the [lattice](https://github.com/ohdearquant/lattice)
inference engine into a self-contained RAG knowledge pack, so KB queries are embedded by
**lattice** (bge-small-en-v1.5, 384-dim) instead of the pack's bundled transformers.js.

This is an **orphan branch** of exploration artifacts — it does not contain the lattice
source tree, the knowledge pack's binary data (`.rvf`, passages), or `node_modules`.

## What's here

| Path | What |
| --- | --- |
| `learnings.md` | Full running log of getting lattice running + this session's RAG findings (§12) |
| `lattice-embed-examples/query_kb.rs` | Pure-lattice RAG: embed passages **and** query with lattice, cosine top-k (has a stdin REPL). Drop into `crates/embed/examples/` |
| `lattice-embed-examples/embed_query.rs` | Prints a bge-small query embedding as a JSON float array — the bridge for reusing a prebuilt vector index |
| `kb-integration/rvf-lattice.mjs` | Reuses the pack's prebuilt `.rvf` (`@ruvector/rvf`), with the query vector produced by lattice |
| `kb-integration/ask-kb.lattice.patch` | Gates the pack's `embed()` on `LATTICE_EMBED_BIN` so the CLI **and** MCP server route through lattice |
| `kb-integration/kb.config.lattice.patch` | Sets `defaultTarget = 'lattice'` so MCP clients need no `store` arg |

## Key findings

- **lattice's default embedder == the pack's build model** (`BgeSmallEnV15`, 384-dim) — no config.
- **BGE is asymmetric retrieval, lattice treats it as symmetric.** The query needs the prefix
  `"Represent this sentence for searching relevant passages: "` manually; lattice's
  `embed_query()` won't add it for BGE. Passages get no prefix.
- **The `.rvf` is a segmented binary (`SFVR`/`IDIF`), not a flat f32 array** — don't hand-parse;
  use ruvector's reader or re-embed from `passages.jsonl`.
- **Reusing the `.rvf` mixes embedders** (int8-quantized bge passages vs f32 lattice query):
  rankings hold, absolute cosine scores don't (GPU-lock top hit: reuse ≈ 0.29 vs re-embed ≈ 0.73).
  Re-embedding is higher-fidelity; reusing the index is faster to stand up.
- **MCP is for AI hosts, not the terminal** — run the Node scripts to query it yourself; register
  the MCP server only to let a Claude session pull KB context.

## Reproduce

```sh
# build the lattice query-embedder
cargo build -q -p lattice-embed --example embed_query --release

# reuse the prebuilt .rvf, query embedded by lattice
cd <pack>/for-ai && npm install
export LATTICE_EMBED_BIN=<repo>/target/release/examples/embed_query
node rvf-lattice.mjs "your question" 5

# apply the pack integration (CLI + MCP route through lattice)
git apply kb-integration/ask-kb.lattice.patch kb-integration/kb.config.lattice.patch
```
