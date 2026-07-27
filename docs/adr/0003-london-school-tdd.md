# ADR-0003: London-School (mockist) TDD

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Full swarm

## Context

The console is built by a swarm of agents working in parallel on different bounded contexts. Two problems follow directly:

1. **Parallel work needs contracts, not implementations.** The Scenario Planning agent needs `rationCoverageDays` while the Response Capacity agent is still writing it. Waiting serialises the swarm and throws away its only advantage.
2. **Correctness here is about relationships, not values.** The interesting bugs are "the ration calculation was given inmates when it should have had affected population" — a wiring error between collaborators, not an arithmetic error inside one.

Classicist (Detroit-school) TDD, testing through real collaborators with state assertions, addresses neither: it requires collaborators to exist before their consumers can be tested, and it verifies outputs rather than interactions.

## Decision

**London-School TDD throughout**, outside-in, with these rules binding on every agent:

1. **Test first.** Red, green, refactor. No production code without a failing test.
2. **Collaborators are injected**, never constructed inside the unit under test. Constructor or function parameters, typed by interface.
3. **Collaborators are doubled** with `vi.fn()`. A unit test exercises exactly one unit.
4. **Assert on interactions** where the interaction is the behaviour. `expect(rationCalculator).toHaveBeenCalledWith(rice, inmates, norm)` catches the wiring bug that a value assertion misses.
5. **Never test private internals.** Only the public interface.
6. **Policy is injected, not hard-coded.** Severity weights, ration norms, adequacy thresholds are parameters. This is simultaneously a testability property and a product requirement (FR-3.2 makes weights user-adjustable), which is a good sign the design is right.

**Where classicist testing is used instead.** Pure value-object arithmetic — `parseDrimsNumber`, `sumQuantities`, `geoCoordinate` — has no collaborators worth doubling. Those get direct state-based tests. Mocking a pure function tests nothing but the mock.

**Complementing the unit tests:**

- **Contract tests.** `ReportRepository` has two implementations (IndexedDB, in-memory). Both run the same behavioural suite, proving substitutability rather than asserting it.
- **A golden-file test.** The real 2026-07-27 bulletin is parsed end to end and checked against the PRD Appendix B figures. This is where London School's blind spot lives — every unit can pass in isolation while the composition is wrong — and the golden file is the counterweight.

## Consequences

**Positive**

- Agents work in parallel against interfaces. The Scenario agent tests `ProjectionEngine` fully while `rationCoverageDays` does not yet exist.
- Wiring errors are caught, which is the failure mode that matters most in a system whose job is relating numbers to each other.
- Injected policy makes assumptions visible and adjustable — the product is more honest as a direct result of the testing style.
- Tests run in milliseconds: no jsdom, no IndexedDB, no pdf.js in the domain suite.

**Negative**

- Interaction tests couple to the shape of collaboration, so refactoring collaborator signatures breaks tests even when behaviour is unchanged. This is the standard mockist tax and it is real.
- Over-mocking can produce a suite that is green while the system is broken. Mitigated deliberately by the golden-file and contract tests.
- More indirection: every dependency becomes a parameter.

**Accepted because** parallel swarm development is impossible without it, and the golden-file test covers the blind spot.

## Alternatives considered

- **Classicist TDD.** Rejected: serialises the swarm and misses wiring bugs.
- **Integration-first.** Rejected: too slow a feedback loop for the domain, and it localises failures poorly — a wrong statewide total tells you nothing about which of 22 sections caused it.
- **Property-based testing.** Not rejected, deferred. A good future fit for `parseDrimsNumber` and the quantity algebra.
