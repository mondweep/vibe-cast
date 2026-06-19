# ADR-0003: GDELT data-access strategy — raw GKG files first

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Lead agent (Opus), researcher, system-architect
- **Tags:** data, ingestion, cost

## Context

GDELT exposes the same underlying data three ways (see
[`../research/01-gdelt-capabilities.md`](../research/01-gdelt-capabilities.md)):
the **DOC 2.0 API** (live, no key, but no ADM1 filter and an unreachable host in
our build network), **raw GKG 15-minute CSV files** (free, no key, full GKG incl.
ADM1 geocoding), and **BigQuery `gdelt-bq`** (powerful, but billed beyond 1
TiB/month). Our core need — per-state NE filtering by FIPS ADM1 code, theme/tone/
entity aggregation, near-real-time — was **proven end-to-end against the raw GKG
files** in Phase 0 (95 NE articles / 6h on 2026-06-19).

## Decision

**Primary ingestion = raw GKG 15-minute files** from
`http://data.gdeltproject.org/gdeltv2/` (poll `lastupdate.txt`, download new
`*.gkg.csv.zip`, parse, filter to NE ADM1 codes, store normalised Mentions).

- The **DOC 2.0 API is a secondary/optional** source for live keyword timelines
  and article lists where convenient — behind the Ingestion ACL, never required.
- **BigQuery is opt-in (Phase 2+/FR-13)** for deep historical or ADM2 analysis,
  off by default, behind cost guardrails.

## Alternatives considered

- **DOC 2.0 API as primary** — simplest API, but **cannot filter by ADM1** (state
  precision would be keyword-only), undocumented rate limits, and its host was
  **unreachable** in our build environment. Rejected as primary.
- **BigQuery as primary** — richest querying, but introduces standing GCP billing
  risk for a free-by-design product, and per-column scan costs on GKG. Rejected
  as primary; kept as opt-in.

## Consequences

- Ingestion owns a small download/parse/cache pipeline (proven in
  [`../../scripts/ne_pulse_snapshot.py`](../../scripts/ne_pulse_snapshot.py)).
- We depend on GKG's CSV field layout and FIPS ADM1 codes — isolated behind the
  Anti-Corruption Layer with contract tests; ADM1 codes were verified empirically.
- Free to operate; sidesteps the blocked DOC API host; no GCP billing for v1.
- Single-slice volume is low (~3 NE articles/15 min) → Analytics must aggregate
  over multi-hour windows and maintain baselines (reflected in the domain model).
