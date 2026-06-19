# ADR-0005: Persistence — in-memory TTL cache for v1 (no standing database)

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** system-architect (Opus)
- **Tags:** persistence, cost, infrastructure

## Context

GDELT data is itself the durable store; we re-derive Snapshots from it. v1 needs
freshness (≤20 min) and near-zero cost (NFR-2), and Cloud Run instances are
stateless and scale to zero. We must avoid re-downloading GKG slices on every
request and avoid standing infra we don't yet need.

## Decision

**v1 uses an in-process TTL cache, no external database.**

- The Ingestion gateway caches parsed Mentions for the current window keyed by
  the latest GDELT slice timestamp, with a **TTL ≈ 15 min** (matching GDELT's
  cadence). Cache miss → download recent slices, parse, cache.
- The read model (computed Snapshot) is likewise memoised per `(scope, window)`
  until the underlying slice advances.
- No user data is stored, so there is nothing to persist across instances in v1.

## Alternatives considered

- **Firestore / Cloud SQL now** — durable and shareable across instances, but
  adds cost, IAM and ops for data we can always recompute. Deferred to when we
  need historical trends (FR-10) or cross-instance sharing.
- **Local SQLite on a mounted volume** — Cloud Run's filesystem is ephemeral;
  not a fit for shared state.

## Consequences

- Trivial ops, zero DB cost; cold instances do one ingest then serve fast.
- Cache is per-instance: with multiple instances each warms independently
  (acceptable at v1 traffic). When historical trends arrive, introduce a managed
  store via a new ADR (likely Firestore) — the Analytics read model is already
  the seam for that.
