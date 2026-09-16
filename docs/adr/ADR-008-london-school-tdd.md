# ADR-008: London-school (mockist) TDD, outside-in

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** the whole build

## Context

The riskiest parts of this product are its *interactions*: capture handing
candidates to analysis, analysis raising events that safeguarding must react to,
coaching being suppressed by an active Red Flag. Bugs here are not arithmetic
errors — they are conversations between collaborators going wrong. Meanwhile the
real collaborators are slow and awkward: a microphone, an eight-hour session, a
cloud database.

## Decision

**London-school (mockist) TDD, driven outside-in.**

- **Start from the outside.** Every feature begins with a failing acceptance
  test expressed in the ubiquitous language of PRD §4.1, at the application
  service boundary.
- **Discover collaborators by mocking them.** When an object needs something it
  does not own, invent the *port* it wishes it had, mock it, and specify the
  interaction. The interface is designed by its consumer, not its implementer.
- **Test interactions, not state, at the boundaries.** Assert the messages sent
  between objects. State-based assertions are reserved for the genuinely pure
  value-object layer (metrics arithmetic, band classification, STOP-BANG
  scoring), where they are the honest tool.
- **Mock only types you own.** Never mock `AudioContext`, Firestore or Express
  directly. Wrap them in a port we control, mock the port, and cover the real
  adapter with a small integration test.
- **Every port gets a contract test** run against both its mock and its real
  adapter, so the doubles cannot drift from reality — the standard failure mode
  of mockist testing.

**The cycle for each GitHub issue:**
```
failing acceptance test (outside)
      ↓ discover a collaborator
  mock it, specify the interaction
      ↓ unit test drives the next object inward
  repeat until the innermost object is a pure function
      ↓
  implement adapters, contract-test them
      ↓
  acceptance test passes → refactor → commit
```

## Alternatives considered

1. **Chicago/Detroit school (state-based, real objects, few mocks).** Produces
   less brittle tests and better refactoring tolerance. Rejected as primary:
   the real collaborators here are a microphone and an overnight session, so
   "use the real thing" is either impossible or a multi-hour test. We do adopt
   it *within* the pure domain core, where objects are values and state
   assertions are cheap and meaningful — the two schools are used where each is
   strongest.
2. **Test-after with high coverage targets.** Rejected: coverage measures lines
   executed, not interactions specified, and it would not have forced the port
   boundaries that ADR-004 depends on.
3. **End-to-end-first (Cypress/Playwright driving a real browser).** Kept, but
   as a thin outer smoke layer only — too slow and too flaky to drive design.

## Consequences

**Positive**
- Ports emerge from real need rather than speculation, which is what makes
  ADR-004's hexagon honest rather than decorative.
- The full core suite runs in seconds with no I/O, so the red-green-refactor
  loop stays tight enough to actually be used.
- Interaction bugs — the ones that matter most here — are caught by design.
- Mocking forces small, single-responsibility collaborators.

**Negative**
- Mockist tests couple to interaction structure, so refactoring that changes
  *how* objects collaborate breaks tests even when behaviour is unchanged. This
  is the real cost and we accept it knowingly.
- Risk of doubles drifting from real adapters. Directly mitigated by the
  mandatory contract tests above — this is not optional.
- Over-mocking can produce tests that pass while the system is broken. Mitigated
  by the outer acceptance layer and the e2e smoke tests.

## Validation

- Every port has a contract test exercised against mock and real adapter.
- Domain suite runs with zero I/O and completes in under 10 s.
- Each GitHub issue's Definition of Done names its acceptance test.
