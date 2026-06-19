# ADR-0006: Ingestion scheduling — lazy refresh in v1, Cloud Scheduler later

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** system-architect (Opus)
- **Tags:** ingestion, scheduling, infrastructure

## Context

GDELT publishes a new slice every 15 minutes. We need the dashboard to reflect
fresh data without hammering GDELT (NFR-9) and without paying for an always-on
worker (NFR-2). Cloud Run scales to zero, so a background in-process loop only
runs while an instance is alive.

## Decision

**v1: lazy, cache-driven refresh.** On request, if the cache is stale (latest
GDELT slice advanced past the cached one, per `lastupdate.txt`), ingest the
recent window once and serve; otherwise serve cache. A short default window
(env-configurable, e.g. `PULSE_WINDOW_HOURS`) keeps cold-start ingest bounded.

**v2: Cloud Scheduler → Cloud Run.** A scheduled job (every ~15 min, offset to
~7/25/40/55 past the hour) pre-warms/refreshes the read model so users never pay
the ingest latency, and enables historical accumulation.

## Alternatives considered

- **In-app background thread/loop** — keeps data warm, but does nothing while the
  instance is scaled to zero and complicates the request path; rejected for v1.
- **Always-on min-instance=1** — predictable freshness but standing cost;
  rejected for a free-by-design product.

## Consequences

- v1 is simple and cost-free; first request after a slice flip pays a bounded
  ingest cost (mitigated by a small default window + cache).
- The refresh entrypoint is a single function, so wiring Cloud Scheduler in v2 is
  additive, not a rewrite.
