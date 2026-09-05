# 0006 — Firebase Hosting + Firestore + Firebase Auth

**Status:** Accepted · **Date:** 2026-09-05

## Context

The app must be hosted on Google Cloud. It is a static bundle with heavy visual
assets (ADR 0001) plus per-user progress state that syncs across devices
(ADR 0005), and it needs sign-in. Usage is one to a few users initially, so
scale-to-zero economics matter far more than throughput.

## Decision

A single Google Cloud project running:

- **Firebase Hosting** — static bundle on Google's global CDN, atomic deploys
  with instant rollback, and per-pull-request preview channels.
- **Cloud Firestore** — per-user progress, FSRS scheduling state and assessment
  history. Access controlled by security rules so a user can read and write only
  their own document subtree.
- **Firebase Authentication** — Google sign-in.

No backend service. The client talks to Firestore directly, with security rules
as the enforcement boundary.

## Alternatives considered

- **Cloud Run + Firestore.** More control and room for server-side logic.
  Rejected as unearned complexity: there is no server-side work to do, and it
  costs a container build, a load balancer and cold-start latency for nothing.
  Revisit if we ever need server-side grading to stop answer-key scraping.
- **Cloud Storage + Cloud CDN.** Cheapest possible and genuinely sufficient for
  the static half, but provides no auth and no sync, so progress would be
  trapped in one browser's storage.
- **App Engine.** Legacy fit; Cloud Run is the modern equivalent and we rejected
  that already.

## Consequences

- Security rules are the *only* thing standing between users' data, so they are
  tested with the Firestore emulator in CI, not eyeballed.
- Assessment answer keys ship in the client bundle and are therefore extractable.
  Accepted: this is a self-directed learning tool with no credential attached to
  a score, so cheating harms only the cheat. Revisit if that ever changes.
- Firestore's free tier comfortably covers expected usage; cost risk is near zero
  and budget alerts are still set.
