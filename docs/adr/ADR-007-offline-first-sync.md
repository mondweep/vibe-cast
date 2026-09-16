# ADR-007: Offline-first capture with IndexedDB and idempotent sync

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** FR-C6, FR-C8, NFR-5

## Context

A Night is a six-to-nine hour unattended run that cannot be repeated — if it
fails at 4am, that night's data is gone forever and the user has to wait a full
day to try again. Meanwhile the phone may be in flight mode, on flaky wifi, or
simply asleep on the network.

Failure modes we must survive: no connectivity for the whole night; the tab or
OS killing the page mid-session; the battery dying; the user force-closing the
app; the API being down at sync time.

## Decision

**Capture is fully offline-first. The network is never on the critical path of
a Night.**

1. **Continuous journaling.** Candidates are appended to IndexedDB in batches
   every 30 s, alongside a session header that is updated with a heartbeat.
   Worst-case data loss from a hard crash is one batch interval.
2. **Crash recovery.** On launch, any session header without a clean stop marker
   is recovered: it is closed at its last heartbeat, marked `interrupted`, and
   `interruptedMs` is excluded from `monitoredMs` so SI is not silently inflated
   by time we were not actually listening.
3. **Deferred, idempotent sync.** Analysis runs locally on Stop; the resulting
   NightAnalysis is queued for upload. Sync retries with exponential backoff and
   survives restarts. Every night carries a **client-generated `nightId`
   (UUIDv4)** used as the document id, so replaying a sync is a no-op rather
   than a duplicate. The API treats writes as idempotent upserts keyed on that id.
4. **Local is the source of truth until acknowledged.** Nothing is deleted from
   IndexedDB until the server confirms receipt.

## Alternatives considered

1. **Stream events to the API live over WebSocket.** Real-time dashboard, no
   local storage needed. Rejected: it makes an eight-hour radio session a
   prerequisite for data integrity, wrecking battery (NFR-2) and losing the whole
   night on a connectivity drop. There is no user need for live remote viewing.
2. **Firestore's built-in offline persistence.** Would handle queueing for us.
   Rejected as the primary mechanism: we need control over batching cadence and
   over what gets written at all (ADR-001), and the recovery semantics for a
   half-written session are ours to define, not the SDK's.
3. **Server-assigned ids.** Rejected: requires connectivity at the moment of
   creation, which is exactly what we are designing away from.

## Consequences

**Positive**
- A Night succeeds in flight mode, in a basement, or with our API entirely down.
- NFR-5's 99.5 % availability target applies only to reporting, never to capture.
- Idempotent upserts make retry logic trivial and safe to be aggressive about.
- Interrupted nights produce honest, correctly-attributed numbers rather than
  quietly wrong ones.

**Negative**
- Two storage systems to reason about, with a sync state machine between them.
- IndexedDB quota is finite; we prune synced nights older than 30 days locally.
- The user can see a night on their phone that is not yet on the server, so the
  UI must show sync state explicitly rather than pretending it is instant.
- Clock skew between device and server means `nightDate` is device-local; the
  server stores the device's timezone offset alongside it.

## Validation

- Test: kill the page mid-session, relaunch, assert the night is recovered,
  marked `interrupted`, and `monitoredMs` excludes the gap.
- Test: sync the same night twice, assert exactly one document and no change.
- Test: a full Night completes with the API returning 503 throughout, then syncs
  successfully once it recovers.
