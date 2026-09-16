# ADR-003: Installable PWA rather than native apps

**Status:** Accepted · **Date:** 2026-09-16

## Context

The app must run overnight on the user's phone with microphone access and a
screen wake lock. The user is a single individual with an immediate need, not a
market we are chasing.

## Decision

Ship an **installable Progressive Web App** — React 19 + TypeScript + Vite,
with a service worker, a web app manifest, `getUserMedia`, `AudioWorklet` and
the Screen Wake Lock API. Add to Home Screen gives a full-screen, icon-launched
experience without an app store.

## Alternatives considered

1. **React Native / Expo.** True background audio, proper foreground-service
   semantics on Android, better battery control. Rejected for v1: app store
   review and signing for a single user is disproportionate, iOS requires a
   paid developer account and a Mac in the loop, and the build/deploy cycle is
   an order of magnitude slower. This is the right answer if the product ever
   serves real users at scale.
2. **Capacitor wrapper over the same web code.** Keeps one codebase and unlocks
   native background audio. A genuinely attractive middle path, and the PWA
   architecture here is deliberately Capacitor-compatible (all platform access
   sits behind ports — ADR-004). Deferred to v2, gated on Q1's outcome.
3. **Native Swift/Kotlin.** Best possible battery and background behaviour.
   Rejected: two codebases, no shared domain, vastly more work.

## Consequences

**Positive**
- One codebase, one deploy, instant iteration; a fix is live in minutes.
- Shares the domain package with the backend — the metric definitions cannot
  drift between what the phone computes and what the server reports.
- No app store gatekeeping, no review latency, no developer account cost.

**Negative**
- **iOS backgrounding is the material risk.** Safari suspends audio processing
  when the tab is backgrounded or the screen locks. Mitigation: Screen Wake Lock
  plus explicit guidance to keep the app foregrounded, screen dimmed, face down
  and charging. This is PRD Q1 and is the first thing M1 must prove on real
  hardware.
- Battery cost is higher than a native foreground service would be.
- `AudioWorklet` requires a secure context — fine, we are HTTPS-only on Cloud Run.

## Validation

- M1 spike: an 8-hour overnight run on the user's actual phone, on both a
  charging and a battery-only night, before any further feature work.
