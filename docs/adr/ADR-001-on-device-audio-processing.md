# ADR-001: All audio processing happens on-device

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** NFR-1, FR-D5, G2

## Context

The product's only sensor is a phone microphone running for 6–9 hours in the
user's bedroom. That audio contains the user sleeping, plausibly a bed partner,
and anything else said or done in that room overnight. It is among the most
sensitive data a consumer product can capture.

The conventional architecture — stream or batch-upload audio, analyse
server-side — would give us stronger models, easier iteration on the detector,
and the ability to re-analyse historical nights. It would also mean the user
must trust us with a recording of their bedroom, and mean a breach of our
storage is a catastrophic breach of their privacy rather than an embarrassing
one.

## Decision

**Raw audio never leaves the device and is never written to persistent storage,
on the device or off it.** Audio exists only as transient frames inside the
Web Audio callback. Only derived, non-reconstructable event metadata —
timestamps, durations, relative intensities, spectral summary features —
is persisted or transmitted.

This is enforced in three places, not one:
1. The `AudioPort` interface exposes only `FrameFeatures`, never sample buffers.
   The domain layer is structurally incapable of seeing audio.
2. A contract test asserts no network payload and no IndexedDB record contains
   a field of array type longer than a fixed small bound.
3. A CI check greps the sync payload builder for any reference to sample data.

## Alternatives considered

1. **Upload compressed audio, analyse server-side.** Best detection quality; we
   could swap models freely and re-analyse old nights. Rejected: the privacy
   cost is disproportionate to a wellness tool, it makes us a high-value breach
   target, it burns the user's mobile data allowance nightly, and it would
   require a far heavier consent and DPIA posture.
2. **Upload only "interesting" clips (detected episodes).** Smaller footprint,
   and enables user-verifiable results ("listen to what we flagged"). Rejected
   for v1: an episode clip still contains a bed partner's voice if they spoke
   during it, and the consent story becomes "we upload audio, but only
   sometimes" — which is materially harder to explain honestly. Revisit as an
   explicit opt-in feature in v2.
3. **On-device processing with encrypted audio backup.** Keeps re-analysis
   possible. Rejected: key management on a consumer PWA is not a problem we can
   solve well, and "encrypted" invites us to relax the rule later.

## Consequences

**Positive**
- The privacy claim is simple, absolute, and testable: *no audio leaves your phone.*
- Sync payloads are tiny (kilobytes per night), so NFR-7 (< £5/month) is easy.
- Capture works fully offline; the API being down never costs the user a night.
- Regulatory surface shrinks dramatically — we never process audio as a controller.

**Negative**
- We cannot re-analyse historical nights when the detector improves. Mitigated
  by ADR-009: analyses are version-stamped, so we can at least be honest about
  which detector produced which number, and trends warn on version boundaries.
- We cannot build a labelled corpus from real user data without a separate,
  explicit, opt-in donation flow.
- The detector must run in real time within a phone's CPU and battery budget,
  which constrains ADR-002.
- Debugging a user's false positives is hard — we can never see what they heard.

## Validation

- Full-night network capture shows zero audio payloads (v1 acceptance criterion 2).
- Automated contract test on payload shape, run in CI.
- Manual review of `buildSyncPayload` on every change touching capture.
