# ADR-0003: Hexagonal architecture with DDD bounded contexts

- **Status:** Accepted
- **Date:** 2026-06-19

## Context
The system spans two very different domains (flights vs. satellites) and several
volatile external services (OpenSky, CelesTrak, SGP4 lib). We want the domain
logic to be pure, testable, and insulated from provider churn, and we want a
clear language shared between docs and code (DDD).

## Decision
Use **Ports & Adapters (Hexagonal)** structured around **DDD bounded contexts**:
- **Bounded contexts:** Flight Tracking, Satellite Tracking, with **Observer** as
  a Shared Kernel and an **Aggregation** application layer producing the Sky
  Snapshot.
- **Driven ports** (`AircraftFeed`, `TleSource`, `Propagator`) express what the
  domain needs; **adapters** implement them over real services.
- The **domain depends only on ports**, never on `fetch`, JSON shapes, or
  satellite.js. Adapters are the Anti-Corruption Layer.
- Directory layout mirrors the model: `src/<context>/domain`,
  `src/<context>/ports`, `src/<context>/adapters`, `src/application`,
  `src/shared`.

## Consequences
### Positive
- Domain is unit-testable with mocked ports and no network (enables ADR-0006).
- Providers and even the propagation library are replaceable in one place.
- Ubiquitous language in the PRD maps 1:1 to types in code.
### Negative / trade-offs
- More indirection/boilerplate than a script that calls APIs directly.
### Follow-ups
- Keep contexts *Separate Ways*; only the Shared Kernel (`Observer`) is common.

## Alternatives considered
- **Layered/transaction-script:** quicker initially but leaks provider detail
  into logic and resists testing.
- **One big model:** conflates flight and orbital concepts; rejected.
