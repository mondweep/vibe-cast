# ADR-004: Hexagonal architecture with a platform-free domain package

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** Testability, ADR-008

## Context

The same rules — what counts as a snore, how SI is computed, what raises a Red
Flag — matter on the phone (which computes them) and on the server (which
reports and aggregates them). If those rules are written twice they will drift,
and the user will eventually see two different numbers for the same night.

Separately, the core logic must be testable without a microphone, a browser, a
Firestore emulator or a network.

## Decision

Adopt **hexagonal architecture (ports and adapters)** with a shared
`@somnus/domain` TypeScript package at the centre.

```
        Adapters (impure, thin, integration-tested)
   ┌────────────────────────────────────────────────┐
   │  WebAudioAdapter   IndexedDbAdapter            │
   │  HttpSyncAdapter   FirestoreAdapter            │
   │  FirebaseAuthAdapter                           │
   └───────────────────┬────────────────────────────┘
                       │ implements
        ┌──────────────▼──────────────┐
        │  Ports (interfaces)         │
        │  AudioPort  ClockPort       │
        │  SessionRepositoryPort      │
        │  NightRepositoryPort        │
        │  SyncPort   IdPort          │
        └──────────────┬──────────────┘
                       │ depended upon by
        ┌──────────────▼──────────────────────────┐
        │  @somnus/domain  (pure, no I/O)         │
        │  detection · analysis · insight ·       │
        │  safeguarding · journal                 │
        └─────────────────────────────────────────┘
```

**Rules, enforced in CI:**
- `packages/domain` has zero runtime dependencies and no imports from `node:`,
  `dom` globals, or any framework. A dependency-check test asserts this.
- Time and identity enter through `ClockPort` and `IdPort` — the domain never
  calls `Date.now()` or `crypto.randomUUID()`, so every test is deterministic.
- Adapters contain no branching business logic; anything worth testing belongs
  in the domain.

## Alternatives considered

1. **Conventional layered app, logic in React hooks and Express handlers.**
   Faster to start. Rejected: the metric definitions end up duplicated across
   frontend and backend, and testing requires mounting components or booting a
   server — which makes the outside-in cycle of ADR-008 slow enough that it
   gets abandoned.
2. **Domain logic only on the device, server as a dumb store.** Tempting given
   ADR-001. Rejected: the server still needs to compute trends, Baseline
   Windows and RF-3 across nights, and it must agree exactly with the device.
3. **A monorepo with heavy tooling (Nx/Turborepo).** Rejected as disproportionate;
   npm workspaces with TypeScript project references is enough at this size.

## Consequences

**Positive**
- One definition of every metric, shared by phone and server. Drift is impossible.
- The entire core is testable in milliseconds with no test doubles for I/O
  beyond the ports themselves.
- ADR-003's Capacitor path stays open: only adapters would change.
- Swapping the classifier (ADR-002's v2 hybrid) touches one module.

**Negative**
- Upfront ceremony: ports and adapters for things that could have been a direct
  call. Justified by the ratio of domain logic to plumbing in this product.
- npm workspace + project-reference build configuration is fiddly.
- Developers must resist putting "just one if" into an adapter.

## Validation

- `packages/domain` test suite runs with no browser, no server, no emulator.
- Architecture test asserts the domain's import graph is dependency-free.
