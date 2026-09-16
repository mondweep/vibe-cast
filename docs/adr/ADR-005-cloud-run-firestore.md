# ADR-005: Cloud Run + Firestore in europe-west2

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** NFR-5, NFR-7, NFR-9

## Context

The backend's job is small by design (ADR-001): accept a few kilobytes of event
metadata per night, store it, compute cross-night aggregates, serve reports.
Traffic is roughly one write and a handful of reads per user per day. The user
is in the UK. Budget is under £5/month.

## Decision

**Cloud Run** for the API container and **Firestore (Native mode)** for storage,
both in **europe-west2 (London)**. Container images in **Artifact Registry**,
built by **Cloud Build**.

Firestore data model, keyed for the access patterns we actually have:

```
users/{userId}
  ├── consent           : { version, grantedAt, items[] }
  ├── nights/{nightId}  : { date, monitoredMs, snoreIndex, stf,
  │                         episodeCount, bandDistribution,
  │                         analyserVersion, status }
  ├── episodes/{nightId}: { episodes: [{startMs, durationMs, intensityDb, band}] }
  ├── journal/{date}    : { factors: {...}, recordedAt, amendedAt }
  ├── trials/{trialId}  : { intervention, baselineWindow, nights[], verdict }
  └── risk/{screenId}   : { answers, score, band, completedAt, flags[] }
```

Episodes live in a separate document from the night summary because the summary
is read on every dashboard load while the episode list is read only on the
night-detail screen — splitting them keeps the hot read small.

## Alternatives considered

1. **Firebase Hosting + Cloud Functions.** Simplest possible deploy, tight
   Firebase integration. Rejected: cold starts are worse for a containerised
   Express app, per-function deploys fragment the API, and we lose the ability
   to run the exact same container locally.
2. **App Engine Standard.** Mature, scales to zero. Rejected: Cloud Run is the
   strategic successor, offers a plain container contract, and gives better
   local/prod parity.
3. **Cloud SQL (Postgres).** Real SQL for the correlation queries in Insight.
   Rejected on cost — the smallest instance runs ~£20/month and cannot scale to
   zero, blowing NFR-7 on its own. The aggregate volume here (hundreds of
   documents per user) does not need a relational engine; correlations are
   computed in the domain layer over a fetched window.
4. **GKE.** Rejected outright — absurd for this workload.

## Consequences

**Positive**
- Scale-to-zero: the bill is effectively zero on nights nobody opens the app.
- Container parity between laptop, CI and production.
- Firestore's offline-capable client model aligns with ADR-007's sync design.
- europe-west2 satisfies NFR-9 data residency with no extra work.

**Negative**
- Cold starts of 1–3 s on the first request after idle. Acceptable: the user
  opens this app in the morning, not in a latency-sensitive loop. Mitigated by
  a slim container and lazy Firestore initialisation.
- Cross-night analytics in Firestore means fetching a window of documents and
  computing in application code rather than pushing an aggregate query down.
  Fine at this scale; would need rethinking at thousands of nights per user.
- Firestore's query constraints (no joins, limited compound queries) require
  the denormalised layout above; adding an access pattern may mean a migration.

## Validation

- Deployed service responds on `/healthz` in europe-west2.
- Billing export confirms monthly spend under NFR-7 after one month of use.
- Load check: p95 read latency < 400 ms warm (NFR-6).
