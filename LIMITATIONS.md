# Limitations, Bugs, and Enhancement Requests

A catalog of everything we observed about the **Cognitum Seed**, its **RVF vector store**, and the **`neural-trader` cog** during this exploration that warrants reporting to the developers — formatted as ready-to-paste GitHub issues.

> **How to use this document:** Each entry below has a Title, Type, Severity, and a fully-written body. To raise an issue, copy the **Title** as the issue title and the contents under **Issue body** as the issue body. Entries are numbered (`B1`, `E1`, `D1`, `Q1`) so we can cross-reference them between this repo and the seed repo.

---

## Summary table

| ID | Type | Severity | Title |
|---|---|---|---|
| [B1](#b1-dedupfalse-silently-allows-duplicate-vector-ids) | bug | high | `dedup=false` silently allows duplicate vector IDs |
| [E1](#e1-allow-vector-store-dimension-other-than-8) | enhancement | medium | Allow vector-store dimension other than 8 |
| [E2](#e2-tag--namespace-filtering-on-knn-queries) | enhancement | high | Tag / namespace filtering on kNN queries |
| [E3](#e3-vector-deletion--scrubbing-api) | enhancement | medium | Vector deletion / scrubbing API |
| [E4](#e4-sidecar-metadata-on-vectors-eg-labels) | enhancement | medium | Sidecar metadata on vectors (e.g. labels) |
| [E5](#e5-per-cog-store-isolation--multi-tenancy) | enhancement | high | Per-cog store isolation / multi-tenancy |
| [E6](#e6-richer-cog-configuration-surface) | enhancement | medium | Richer cog configuration surface |
| [E7](#e7-cog-observability--metrics-endpoint) | enhancement | high | Cog observability / metrics endpoint |
| [E8](#e8-cog-state-persistence-across-stops-or-explicit-restart-ttl) | enhancement | low | Cog state persistence / auto-restart hint |
| [E9](#e9-non-ssh-authenticated-store-access) | enhancement | medium | Non-SSH authenticated store access |
| [D1](#d1-publish-the-rvf-store-http-api-spec) | docs | high | Publish the RVF store HTTP API spec |
| [D2](#d2-document-the-neural-trader-cogs-decision-pipeline) | docs | medium | Document the neural-trader cog's decision pipeline |
| [Q1](#q1-which-similarity-metrics-does-the-rvf-store-actually-support) | question | low | Which similarity metrics does the RVF store actually support? |
| [Q2](#q2-is-the-witness-chain-pruneable-or-archiveable) | question | low | Is the witness chain pruneable or archiveable? |

---

# Bugs

## B1: `dedup=false` silently allows duplicate vector IDs

**Type:** bug
**Severity:** high (silent wrong behavior, easy to trip)
**Component:** RVF store / `POST /api/v1/store/ingest`

### Issue body

#### Summary

The ingest endpoint with `dedup: false` accepts vectors whose IDs **already exist** in the store, persisting both the original and the duplicate as independent rows. Subsequent kNN queries then return both as separate neighbors, double-counting them.

#### Reproduction

1. Ingest a vector at id `12345` with some payload `[v0..v7]`. Returns success.
2. Ingest a second vector at id `12345` (same or different payload) with `dedup: false`. Also returns success.
3. Query the store with any vector. Both copies appear in the results, both with id `12345`.

#### Observed during this exploration

When we re-ran a backtest variant with the same `SPY_ID_BASE`, every walk-forward step's kNN call returned duplicate neighbors per past day, silently doubling neighbor weight in the strategy's mean prediction. We worked around this by **always picking a fresh `SPY_ID_BASE`** per variant (10B → 11B → 12B), but a less-careful user would not notice the corruption — it doesn't error, it doesn't warn, it just shifts the strategy's behavior.

#### Impact

- Backtests are silently invalidated when re-run without changing the ID base.
- Any pipeline that assumes "id is a primary key" (which is the default mental model for any store with an `id` field) is broken.
- The flag name `dedup` doesn't communicate what `false` does — most readers would expect "skip dedup check, last-write-wins on collision" rather than "permit duplicate primary keys."

#### Suggested resolution

Pick one of:

1. **(Preferred)** Treat `id` as a primary key. `dedup=false` should mean *"don't compare vector contents for dedup-by-similarity"* — but ID collisions should be rejected (HTTP 409) or upserted (last-write-wins), never duplicated.
2. Rename the flag to `allow_duplicates: bool` so the semantics are explicit, and default it to `false`.
3. At minimum, document the current behavior prominently in the API reference, and emit a warning header on the response when a duplicate ID is created.

#### Workaround for users today

Always pick a fresh ID range per experiment. Track ID bases used externally — there's no API to enumerate them.

---

# Enhancements

## E1: Allow vector-store dimension other than 8

**Type:** enhancement
**Severity:** medium
**Component:** RVF store

### Issue body

#### Summary

The seed's RVF store appears hard-coded to `dimension: 8`. We could not extend the existing 7-feature + bias embedding to add a regime feature without sacrificing the bias slot, and we couldn't experiment with higher-dimension embeddings (sentence transformers, multi-asset features, etc.) at all.

#### Use cases

- Higher-resolution market features (32–128 dim) for kNN that captures more pattern nuance
- Reusing standard embedding models (ada-002 = 1536, MiniLM = 384) on the same hardware
- Experimentation across dim choices without re-flashing the device

#### Suggested resolution

Either:
- Make dimension a per-store-create parameter (allow multiple stores at different dims), or
- Allow ingest to declare dim and reject mismatched queries, or
- Document why 8 is fixed (perhaps storage/integrity constraints) so users can plan around it.

#### Workaround

Compress your features into 8 dimensions using PCA, or accept that you're limited to 8-dim embeddings.

---

## E2: Tag / namespace filtering on kNN queries

**Type:** enhancement
**Severity:** high (operationally painful)
**Component:** RVF store / `POST /api/v1/store/query`

### Issue body

#### Summary

The store keeps **all vectors in one flat ID space**. The `neural-trader` cog's sensor data and our SPY backtest vectors coexist (~60K total at the time of writing). To get 10 SPY-only neighbors we had to query with `k=2000` and post-filter by ID range on the client. Naive `k=10` returned mostly sensor data.

#### Reproduction

1. The seed has both cog-written vectors (~54K sensor data at unspecified IDs) and user-written vectors (our SPY at id range `[10_000_000_000, ...)`).
2. Query the store with a SPY vector and `k=10`. Almost all results are sensor data, useless to a SPY strategy.
3. Workaround: query with `k=2000`, then post-filter by `SPY_ID_BASE <= id < bar_id`, then take top 10.

#### Impact

- Massive over-querying — we transferred 200x more data than needed per kNN call.
- Quadratic-ish slowdown as the store grows: with 4M total vectors and 100K SPY vectors, you'd need k=80K to get reliable SPY-only matches.
- Any multi-tenant use of the store is fundamentally broken — apps can't isolate their data.

#### Suggested resolution

Add tag-based filtering at the store layer. Several plausible APIs:

- **Tag on ingest, filter on query:**
  ```json
  POST /store/ingest  { "vectors": [[id, [v...], {"tag": "spy"}], ...] }
  POST /store/query   { "k": 10, "vector": [...], "filter": {"tag": "spy"} }
  ```
- **ID-range filter (already implementable):**
  ```json
  POST /store/query   { "k": 10, "vector": [...], "id_range": [10000000000, 11000000000] }
  ```
- **Per-namespace stores:**
  ```
  POST /stores/create  { "name": "neural-trader", "dim": 8 }
  POST /stores/neural-trader/ingest
  POST /stores/neural-trader/query
  ```

The namespace approach (#3) also cleanly fixes [E5](#e5-per-cog-store-isolation--multi-tenancy).

#### Workaround

Massive client-side oversampling + post-filter. Works at small scale, breaks at scale.

---

## E3: Vector deletion / scrubbing API

**Type:** enhancement
**Severity:** medium
**Component:** RVF store

### Issue body

#### Summary

We could not find any API to delete vectors from the store. The `deleted_vectors` field in `seed_device_status` stayed at `0` across the entire session even after we wrote ~6,500 SPY vectors across four backtest variants. Those vectors are now permanent residents of the store.

#### Use cases

- Cleaning up after backtest experiments
- Implementing TTL / retention policies
- GDPR-style "right to delete" for end users
- Recovering from accidental ingests

#### Suggested resolution

Add either:

- **Single delete:** `DELETE /api/v1/store/vector/<id>` (200 if deleted, 404 if absent)
- **Bulk delete:** `POST /api/v1/store/delete { "ids": [...], "id_range": [from, to] }`
- **Tombstone-style with witness chain integrity preserved:** mark deleted, exclude from queries, but keep crypto chain entry for tamper evidence.

The witness-chain design probably wants soft-deletes rather than hard-deletes to preserve chain continuity. A "tombstone" entry would be philosophically aligned.

#### Workaround

None today. Once written, vectors are forever.

---

## E4: Sidecar metadata on vectors (e.g. labels)

**Type:** enhancement
**Severity:** medium
**Component:** RVF store

### Issue body

#### Summary

When ingesting a vector representing "today's market features," we don't yet know "tomorrow's return" (which is what the kNN actually predicts). We need a way to **attach the label later** — i.e., update the vector's metadata after the fact.

The store doesn't appear to support this. We worked around it by maintaining a Python-side `label_lookup: dict[id, float]` throughout the walk-forward, which:

- doesn't survive a process crash
- doesn't survive `git clone` of the project to another machine
- can't be shared across cogs operating on the same store

#### Use cases

- Time-series ML where "label" is only knowable in the future (this exact case)
- Active-learning workflows where labels arrive asynchronously
- Reinforcement-learning settings where reward is computed after the action

#### Suggested resolution

Add an optional metadata blob per vector:

```json
POST /store/ingest  {
  "vectors": [[id, [v...], {"meta": {"asof": "2024-01-15"}}], ...]
}
POST /store/update_meta  {
  "id": 12345,
  "meta": {"forward_return_1d": 0.0042}
}
GET  /store/vector/12345  ->  { "vector": [...], "meta": {...} }
```

This also enables: storing the **prediction** the cog made alongside the vector, so accuracy can be back-computed later. Hugely useful for observability.

#### Workaround

Maintain a sidecar dict in your client process. Lose it if the process dies.

---

## E5: Per-cog store isolation / multi-tenancy

**Type:** enhancement
**Severity:** high
**Component:** seed platform / cog runtime

### Issue body

#### Summary

The `neural-trader` cog and our local backtest write to the **same store, in the same flat ID space**. To run our backtest cleanly we had to manually `seed_cogs_stop neural-trader` so its 60-second-cycle ingests wouldn't interleave with our SPY ingests.

#### Reproduction

1. While `neural-trader` is running with `--interval=60`, run our `src/v1_5_long_only.py` backtest.
2. Some of our walk-forward kNN queries will return cog-written vectors mixed in with SPY history.
3. Conversely, our SPY ingests at `[11B, ...]` are visible to whatever the cog does (we don't know if/how it uses them).

#### Impact

- No cog can assume the store contents are stable across its lifetime.
- Two cogs that both write vectors will pollute each other's neighbor pools.
- A user running multiple AI applications on one seed has no guarantee of separation.
- A buggy cog can permanently corrupt another cog's data.

#### Suggested resolution

Per-cog namespaces, automatically scoped:

```
cog "neural-trader" → /stores/cog/neural-trader/...
cog "ruview-densepose" → /stores/cog/ruview-densepose/...
user app           → /stores/user/<app-name>/...
```

Each cog's store handle is auto-injected at runtime; the cog cannot reach another cog's data without an explicit cross-namespace permission grant.

This composes with [E2](#e2-tag--namespace-filtering-on-knn-queries) — namespaces can be the implementation of namespace-filtering.

#### Workaround

Manually stop other cogs during your run, hope nothing else is writing.

---

## E6: Richer cog configuration surface

**Type:** enhancement
**Severity:** medium
**Component:** `neural-trader` cog (and probably all cogs)

### Issue body

#### Summary

The `neural-trader` cog exposes only one configuration parameter via the seed admin surface and MCP tool:

```json
{
  "cli_arg": "--interval",
  "default": 60,
  "min": 5, "max": 3600,
  "type": "integer",
  "label": "Analysis interval"
}
```

Everything else — the embedding choice, k for kNN, the decision threshold, the aggregation rule, the position sizing, the symbol(s) traded — is baked into the binary.

#### Use cases

- Tuning k based on store size
- Adjusting threshold based on observed hit rate
- Switching between long-only and long/flat/short
- Trading a different symbol (the cog says "Spot market patterns" but doesn't say which market)

#### Suggested resolution

Expose via the cog's config block:

```json
"config": [
  { "key": "interval",    "type": "integer", "default": 60,    "min": 5, "max": 3600 },
  { "key": "k_neighbors", "type": "integer", "default": 10,    "min": 3, "max": 100 },
  { "key": "threshold_bps", "type": "number", "default": 5,    "min": 0, "max": 100 },
  { "key": "decision_rule", "type": "enum",   "default": "long_only", "options": ["long_only", "long_short", "long_flat_short"] },
  { "key": "symbols",     "type": "list[str]", "default": ["SPY"] }
]
```

The exploration in this repo essentially demonstrates that **defaults matter** — v1 (the apparent default) loses money; v1.5 makes money. If users can't tune from defaults, they're stuck with whatever choice the cog ships with.

#### Workaround

Read the cog's binary and rebuild it with different constants, or run a paper-trader on the side (this repo).

---

## E7: Cog observability / metrics endpoint

**Type:** enhancement
**Severity:** high (visibility into a black box)
**Component:** `neural-trader` cog (and cog runtime generally)

### Issue body

#### Summary

We can see *that* the cog is running (`seed_cogs_list`), and we can read its container-style logs (`seed_cogs_logs`), but we have **no structured visibility** into:

- What signal/prediction did the cog produce in the last N minutes?
- Which historical neighbors did it pick, with what cosine distances?
- What is its hit rate / Sharpe / drawdown over the window it's been running?
- How long does an analysis cycle take? Is the seed I/O-bound, CPU-bound?
- How many vectors has the cog ingested vs queried?

For a cog whose entire value is "make trading decisions for me," this is a startling lack of operational insight.

#### Suggested resolution

Add a per-cog metrics endpoint:

```
GET /api/v1/apps/<id>/metrics
{
  "uptime_secs": 3938,
  "cycles_completed": 234,
  "last_cycle": {
    "asof": "2026-05-08T09:15:00Z",
    "prediction": 0.00042,        // mean_pred or whatever the cog computes
    "decision": "long",            // current position
    "neighbors": [                 // top-k with distances
      {"id": 11000001234, "distance": 0.93},
      ...
    ],
    "duration_ms": 87
  },
  "rolling_metrics": {
    "hit_rate_30d": 0.534,
    "predictions_made": 14400,
    ...
  }
}
```

Exposing this opens the door to:
- Self-validating: users can spot when the cog has degraded
- Comparable: a paper-trader (this repo) can be back-compared against the live cog
- Debuggable: when the cog goes silent or weird, you can see why

#### Workaround

None — the cog is currently a black box. We had to build a separate paper-trader (this repo) to even guess what it might be doing.

---

## E8: Cog state persistence / auto-restart hint

**Type:** enhancement
**Severity:** low
**Component:** `neural-trader` cog / cog runtime

### Issue body

#### Summary

We stopped `neural-trader` for our backtest. **It stayed stopped.** There is no:

- "auto-restart after N minutes of inactivity"
- "auto-restart on next boot"
- "remind me that I stopped this"

If a user forgets to restart the cog, their live trading silently doesn't run for days/weeks.

#### Suggested resolution

A minimum:

- Persist the user-intended state ("on" / "off") separately from the runtime state.
- Restart `intended=on` cogs on boot.
- Warn in the seed admin UI when an `intended=on` cog has been runtime-stopped for more than X hours.
- Emit a daily heartbeat notification: *"these cogs have been off for 3+ days: neural-trader. Did you mean to leave them off?"*

This is a UX/reliability concern more than a technical one.

#### Workaround

Set a calendar reminder.

---

## E9: Non-SSH authenticated store access

**Type:** enhancement
**Severity:** medium
**Component:** seed platform networking

### Issue body

#### Summary

The RVF store's HTTP API binds to `localhost:80` on the seed. To use it from another device you have to set up an SSH tunnel:

```bash
ssh -fN -L 9080:127.0.0.1:80 genesis@169.254.42.1
```

This works, but:

- Every client process needs SSH access to the seed (full shell, not just store access)
- No scoped tokens — you can't issue a "store-read-only" credential
- Tunnels can drop silently (we saw this happen mid-session)
- Mobile / embedded clients that don't speak SSH are excluded

#### Suggested resolution

A network-exposed, token-authenticated API:

- TLS-terminating reverse proxy on the seed (Caddy/Traefik handle this trivially)
- Per-token scoping: read, ingest-into-namespace-X, full-admin
- Tokens issued via the admin UI, revocable
- Optional per-token rate-limits

This composes with [E5](#e5-per-cog-store-isolation--multi-tenancy) (token scoped to a namespace).

#### Workaround

Use the SSH tunnel; restart it when it drops.

---

# Documentation gaps

## D1: Publish the RVF store HTTP API spec

**Type:** docs
**Severity:** high
**Component:** RVF store

### Issue body

#### Summary

We could not find a public reference for the store's HTTP wire format. The client we wrote (`src/store_client.py`) describes its origin in the docstring:

> *Wire format (reverse-engineered via strace of the neural-trader cog):*
> ```
> POST /api/v1/store/ingest  {"dedup": bool, "vectors": [[id, [v0..v7]], ...]}
> POST /api/v1/store/query   {"k": int, "metric": "cosine", "vector": [v0..v7]}
> ```

This is fragile:

- The format may change between cog versions without warning.
- Edge-case behaviors ([B1](#b1-dedupfalse-silently-allows-duplicate-vector-ids), [Q1](#q1-which-similarity-metrics-does-the-rvf-store-actually-support)) are unknown.
- We don't know what other endpoints exist (`/status` we found by inspection; what about pagination, batch query, deletion, metadata?).

#### Suggested resolution

Publish:

- An OpenAPI / JSON Schema spec, ideally hosted at `/api/v1/openapi.json` on the seed itself.
- A changelog of API changes per release.
- Stability guarantees ("v1 endpoints are stable; experimental endpoints prefixed `/api/v1/experimental/`").

#### Workaround

Read the cog's source code if open / strace if not.

---

## D2: Document the `neural-trader` cog's decision pipeline

**Type:** docs
**Severity:** medium
**Component:** `neural-trader` cog

### Issue body

#### Summary

The cog's description is *"🤖 Spot market patterns and trends from live data"*. We don't know:

- What features does it embed?
- What symbol(s) does it trade?
- What's the decision rule (long/flat/short, threshold, sizing)?
- Does it actually trade, or just signal?
- How does it handle market hours, holidays, gaps?
- How does it bootstrap when the store is empty?

We built a paper-trading variant (this repo) by **assuming** it uses the 8-dim embedding our `store_client.py` describes and a kNN-mean rule. That assumption may be wrong.

#### Suggested resolution

A `COG_NEURAL_TRADER.md` in the seed-cogs repo (or wherever cog source lives) covering:

- Architecture diagram (input → embedding → store → query → decision → output)
- Feature spec (column names, computations, normalization)
- Decision rule pseudocode
- Configuration parameters and their effects
- Known limitations (e.g. *"this cog uses 1-day forward returns and is unlikely to beat buy-and-hold during sustained bull markets — see exploration here"*)

#### Workaround

Reverse-engineer via strace; build a paper-trader; assume the cog is similar.

---

# Open questions

## Q1: Which similarity metrics does the RVF store actually support?

**Type:** question
**Severity:** low
**Component:** RVF store

### Issue body

The query API takes `metric: "cosine"`. We never tested whether other values are accepted:

- `"l2"` (Euclidean)
- `"dot"` (inner product)
- `"manhattan"` (L1)

If only cosine is supported, that's fine — but it should be documented (vector-magnitude design choices change accordingly). If multiple are supported, the user-facing config should expose the choice.

---

## Q2: Is the witness chain pruneable or archiveable?

**Type:** question
**Severity:** low
**Component:** seed platform / witness chain

### Issue body

The witness chain grew from 84,070 → 97,096 entries during our session (~13K growth for ~6K vector writes — roughly 2 chain entries per write?). Extrapolating to a 4-million-vector use case, the chain alone would be on the order of millions of entries.

Questions:

- Does the chain ever get rolled / archived to cold storage?
- Can old segments be pruned with a "checkpoint commitment" left behind?
- What's the practical upper limit before performance degrades?
- Is there a way to introspect chain size / size-on-disk via the API?

Helpful for capacity planning, especially on storage-constrained devices like a Pi.

---

# Out of scope (for the seed/cog developers)

These are things we hit during the exploration but are **not** issues for the cog/seed team:

## Local environment

- **macOS Optimized Storage / iCloud Drive** evicted several files in `Documents/Claude/Projects/...` to "dataless" state mid-session. They reported the correct size on `stat` but read as 0 bytes via `open()`. Broke `import yfinance_loader`, `pd.read_csv("spy_daily.csv")`, and `git add` (with `SIGBUS`/exit 138). Worked around by rewriting files from in-memory context.
- **macOS quarantine xattrs** on `numpy`'s `.so` files caused `import numpy` to `SIGBUS` after some file touches. Fixed with `xattr -cr .venv`.
- **System git is 2.10.1 (2016)** — lacks `git stash push -m`, `git rev-parse --abbrev-ref HEAD --show-current`. Workable but quirky.
- **GitHub PAT embedded in plain `.git/config`** of the home repo. Not committed but visible in `git remote -v` output. Recommend rotating + switching to gh credential helper or SSH.

## Improvements to *this* repo's backtest code (tracked separately)

- **kNN-mean aggregator** gives equal weight to a 1987 neighbor and a 2024 neighbor. A distance-weighted aggregator (`exp(-distance)` or `1/(1-cosine)` weights) is the obvious next step — see [`EXPLORATION_LOG.md` § 6 row 2](EXPLORATION_LOG.md).
- **Static z-score scaler** fit on the first 252 bars and never refit. Feature distributions drift over a 7-year backtest. Rolling-window refit would be a small change.
- **1-day forward-return label is mostly noise**. Switching to 5-day or 10-day labels is the highest-expected-lift change, with the tradeoff of longer holding periods. See [`EXPLORATION_LOG.md` § 6 row 1](EXPLORATION_LOG.md).
- **Single-asset universe (SPY only)**. To beat buy-and-hold during bull markets the strategy probably needs a multi-asset rotation universe. Architectural change.

---

## Cross-references

- Full narrative: [`EXPLORATION_LOG.md`](EXPLORATION_LOG.md)
- Top-level overview & quickstart: [`README.md`](README.md)
- Per-run reports: [`results/<variant>/report.md`](results/)
