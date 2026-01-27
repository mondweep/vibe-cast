# ADR-005: Claude Flow V3 Agent Coordination

## Status
Accepted

## Date
2026-01-27

## Context
LuitPlayer is a complex application spanning multiple domains that benefit from specialized expertise. Development requires coordination between different concerns (PDF, OMR, Audio, UI, Testing, Infrastructure). We need a systematic approach to manage parallel development and ensure architectural consistency.

## Decision
We will use **Claude Flow V3** with a **hierarchical-mesh topology** and **7 specialized agents** (an odd prime number for optimal consensus).

### Agent Configuration

| Agent | Type | Bounded Context | Responsibilities |
|-------|------|-----------------|------------------|
| Queen Coordinator | queen-coordinator | * | Task distribution, ADR enforcement, conflict resolution |
| PDF Domain Agent | domain-specialist | PDFProcessing | PDF parsing, rendering, coordinate mapping |
| OMR Domain Agent | domain-specialist | OMREngine | Staff detection, note recognition, chord analysis |
| Audio Domain Agent | domain-specialist | AudioEngine | Sample synthesis, mixer, tempo scaling |
| UI Domain Agent | domain-specialist | UIPresentation | React components, state management |
| Testing Agent | quality-assurance | * | TDD enforcement, test generation, coverage |
| Integration Agent | infrastructure-specialist | Infrastructure | WASM build, workers, PWA setup |

### Why 7 Agents?
- **Odd**: Prevents tie votes in consensus decisions
- **Prime**: Optimal distribution in mesh topology
- **Sufficient**: Covers all bounded contexts + cross-cutting concerns
- **Manageable**: Not too many for coordination overhead

### Workflow Phases
```
1. Analysis      → Queen Coordinator analyzes requirements
2. Test-First    → Testing Agent writes failing tests
3. Implementation→ Domain Agents implement in parallel
4. Integration   → Integration Agent wires WASM/Workers
5. Verification  → Testing Agent + Queen verify quality
```

### Communication Channels
- **domain-events**: Cross-context domain events
- **integration-events**: Infrastructure notifications
- **test-results**: Test outcomes and coverage reports

### Consensus Protocol
- Uses Raft protocol with quorum of 4 (majority of 7)
- Queen has tie-breaking authority on architectural decisions

## Consequences

### Positive
- Parallel development across domains
- Specialized expertise per domain
- Clear accountability
- Built-in quality gates

### Negative
- Coordination overhead
- Potential for conflicting implementations
- Learning curve for agent interaction

## Configuration
See `.claude-flow/swarm.config.json` for full agent definitions.

## References
- Claude Flow V3 Documentation
- PRD Implementation Roadmap
- ADR-002: Domain-Driven Design
