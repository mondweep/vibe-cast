# ADR-0001: Hexagonal architecture with DDD bounded contexts

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Architecture swarm

## Context

The Assam Flood Situation Console ingests an ASDMA/DRIMS PDF and presents a decision-support view. Two forces dominate:

1. **The upstream format is volatile and outside our control.** ASDMA can change the bulletin layout at any time with no notice. Extraction logic will churn.
2. **The domain logic is the product.** Severity ranking, ration coverage, camp load, and scenario projection are the reason the product exists. That logic must remain correct across extraction churn and UI redesigns.

If domain logic is entangled with either pdf.js or React, every upstream layout change or UI refresh puts correctness at risk.

## Decision

Adopt **hexagonal (ports and adapters) architecture** with the DDD bounded contexts of PRD §3.2 as the primary module boundaries.

```
src/
├── domain/                       # Pure. No I/O, no framework, no DOM.
│   ├── shared/                   # Shared kernel: AdministrativeUnit, quantities
│   ├── situation/                # Situation Assessment context
│   ├── response/                 # Response Capacity context
│   ├── infrastructure-impact/    # Infrastructure Impact context
│   ├── scenario/                 # Scenario Planning context
│   └── timeline/                 # Temporal Comparison context
├── application/                  # Use cases. Orchestrates domain via ports.
│   └── ports/                    # Interfaces the domain needs from outside
├── adapters/
│   ├── pdf/                      # pdf.js — driven adapter, implements BulletinSource
│   ├── persistence/              # IndexedDB — implements ReportRepository
│   └── ui/                       # React — driving adapter
└── main.tsx                      # Composition root: the only place wiring happens
```

**Dependency rule:** dependencies point inward only. `domain/` imports nothing from `adapters/` or `application/`. Enforced by lint rule, not convention.

**Ports** (owned by the application layer, defined in domain terms):

- `BulletinSource` — `parse(file: Blob): Promise<FloodSituationReport>`
- `ReportRepository` — `save`, `findByDate`, `findAll`, `delete`
- `Clock` — injected, never `new Date()` inside domain code

## Consequences

**Positive**

- Domain logic is testable with zero mocking infrastructure — no jsdom, no fake PDFs, no browser. Tests run in milliseconds.
- A DRIMS layout change touches `adapters/pdf/` alone. The blast radius of the highest-churn risk is one directory.
- The composition root is the single place where dependencies are wired, which makes London-School TDD (ADR-0003) natural rather than forced.
- Bounded contexts as directories make the strategic design visible in the file tree. A newcomer reads the architecture by running `ls`.

**Negative**

- More indirection than a straightforward React app. For a small project this is real overhead.
- Mapping between the PDF's shape and the domain's shape is explicit work in the ACL rather than free.

**Accepted because** the domain logic is the product's value and the upstream format is the product's biggest risk. Isolating one from the other is the whole point.

## Alternatives considered

- **Feature-folder React app** (`components/`, `hooks/`, `utils/`). Rejected: domain rules would end up distributed across hooks and components, making the invariants of PRD §5 unenforceable and untestable in isolation.
- **Layered n-tier.** Rejected: allows the domain to depend on infrastructure interfaces defined by infrastructure, which is precisely the coupling we are trying to avoid.
