# 0008 — London-school TDD over a ports-and-adapters core

**Status:** Accepted · **Date:** 2026-09-05

## Context

The requested development loop is PRD → ADR → issues → London-school TDD → build,
test, fix, deploy. London school (mockist, outside-in) drives design from the
outside in, using mocked collaborators to discover interfaces before implementing
them. That only works if collaborators are addressable — which means the domain
must not reach out to Firestore, the DOM or the clock directly.

## Decision

**Hexagonal core with driven ports.** The domain — lesson graph, mastery,
scheduling, assessment grading — is pure TypeScript that knows nothing about
React, Firestore or the browser. Everything external is a port:

| Port | Real adapter | Test double |
|---|---|---|
| `ProgressStore` | Firestore | in-memory fake |
| `Scheduler` | `ts-fsrs` | stub returning fixed intervals |
| `Clock` | `Date.now` | fixed/controllable clock |
| `Viewport` | DOM + `IntersectionObserver` | scripted geometry |

**The outside-in loop, per issue:**

1. Write a failing **acceptance test** stating the learner-visible behaviour.
2. Step inward. At each layer, mock the *next* collaborator and let the mock's
   expectations define that collaborator's interface.
3. Implement the collaborator, repeating until the acceptance test passes.
4. Refactor with all tests green.

**Mock only what you own.** Third-party libraries are wrapped in one of our own
adapters and *that* is mocked. We never assert against `ts-fsrs` or the Firestore
SDK's call shapes.

**Contract tests** run the same suite against both the real adapter and its
in-memory fake, so fakes cannot drift from the things they stand in for. This is
the discipline that keeps mockist testing honest.

Tooling: Vitest, Testing Library for component behaviour, the Firebase emulator
for rules, Playwright for the handful of true end-to-end scroll journeys.

## Alternatives considered

- **Classicist (Detroit-school) TDD.** Fewer mocks, tests survive refactoring
  better. Rejected as the primary style because it was explicitly requested —
  but its influence is kept deliberately: the pure scene and grading functions
  (ADRs 0002, 0003) are tested classically on state, not on interactions, because
  mocking arithmetic proves nothing.
- **Testing through the UI only.** Rejected: scroll-driven animation is slow and
  flaky to drive end-to-end, which is exactly why the pure progress model exists.

## Consequences

- More interfaces than a naive design would have. That is the point — it is what
  makes the core testable without a browser or a network.
- Interaction tests couple to call shapes and will break under refactoring. Bounded
  by keeping mockist tests at the *boundaries* and state-based tests in the pure core.
- Contract tests are extra work per port and are non-negotiable; without them the
  in-memory fakes silently stop resembling reality.
