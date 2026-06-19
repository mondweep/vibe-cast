# ADR-0006: Test-Driven Development, London School (mockist)

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
The system integrates flaky, rate-limited external services. We want a fast,
deterministic test suite that drives the *design* of the domain and documents
behaviour, without depending on the network or real orbital data in unit tests.

## Decision
Practise **TDD, London School (outside-in, interaction-based)**:
- Drive each domain service through its **collaborator ports**, substituting
  **test doubles** (jest mocks / hand-written scripted fakes).
- `NearbyAircraftService` is tested with a mocked `AircraftFeed`; we assert both
  the **interaction** (the bounding box queried) and the **behaviour** (range
  filtering + ordering).
- `PassPredictor` is tested with a **scripted fake `Propagator`** that returns a
  deterministic elevation curve — no SGP4 in the unit test.
- Adapters are covered separately: **pure mapping/parsing functions**
  (`mapOpenSkyStates`, `parseTleText`) tested directly; HTTP behaviour tested
  with an **injected `fetch`**; one **integration test** exercises real SGP4.
- Tooling: **Jest + ts-jest**, `clearMocks: true`, `--runInBand`. **No network**
  in any test.

## Consequences
### Positive
- Sub-2s suite; deterministic; safe to run anywhere/offline (NFR1).
- Mocking pressure keeps ports small and the domain decoupled.
- Tests double as executable specs of the ubiquitous language.
### Negative / trade-offs
- Mockist tests assert interactions, so some refactors require test updates.
- Real end-to-end behaviour needs a separate (few) integration tests — by design.
### Follow-ups
- Add contract tests for each new feed/source adapter.
- Add a thin e2e smoke test against live APIs in CI (allowed-failure / nightly).

## Alternatives considered
- **Classicist/Detroit TDD:** fewer mocks, but would pull real propagation/HTTP
  into unit tests, making them slow and non-deterministic.
