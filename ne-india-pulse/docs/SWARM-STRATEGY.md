# Swarm & Model-Matching Strategy

How the **RuFlo (claude-flow V3)** agent swarm is organised for NE India Pulse,
and — per the project brief — **how each agent is matched to a model whose
capability fits the complexity of its task**.

## Principle: right-size the model to the task

RuFlo ships a 3-tier routing model (see `CLAUDE.md` → "3-Tier Model Routing").
We apply it deliberately so we spend the most capable (and expensive) reasoning
only where it changes the outcome, and use cheaper/faster models for mechanical
work.

| Tier | Model | Use when the task is… | Example work on this project |
|------|-------|------------------------|------------------------------|
| **0** | Agent Booster (WASM, no LLM) | A pure deterministic transform | Rename, format, codemod, simple Edits |
| **1** | **Haiku** | Low ambiguity, well-specified, mechanical | Boilerplate, config files, CRUD glue, fixture data, docstrings, simple test stubs |
| **2** | **Sonnet** | Moderate complexity, clear requirements | Feature implementation, API clients, integration tests, demographics research, CI YAML |
| **3** | **Opus** | High ambiguity, architecture, cross-cutting reasoning, security | PRD/DDD modelling, ADRs, GDELT capability analysis, domain design, threat modelling, hard debugging |

> Rule of thumb: **if getting it wrong is cheap to detect and fix → lower tier.
> If a wrong decision propagates (architecture, data model, security) → Opus.**

## Agent → role → model map

Roles map to the installed RuFlo agents under `.claude/agents/` plus standard
claude-flow agent types. The `model` is set per `Agent({ model: ... })` call.

| Phase | Agent (RuFlo type) | Responsibility | Model |
|-------|--------------------|----------------|-------|
| Discovery | `researcher` (GDELT capabilities) | What GDELT can/can't tell us about NE India | **Opus** |
| Discovery | `researcher` (NE India demographics) | Population/geography baselines & open datasets | **Sonnet** |
| Discovery | `specification` (SPARC) / `planner` | Author DDD PRD, bounded contexts, ubiquitous language | **Opus** |
| Design | `system-architect` / `architecture` (SPARC) | Context map, service design, ADRs | **Opus** |
| Design | `security-architect` | GDELT ToS compliance, secrets, Cloud Run IAM, threat model | **Opus** |
| Build | `tdd-london-swarm` | Outside-in failing tests (mocks/contracts) first | **Sonnet** |
| Build | `backend-dev` / `coder` | Ingestion + API + aggregation services | **Sonnet** |
| Build | `coder` (boilerplate) | Scaffolding, config, DTOs, fixtures | **Haiku** |
| Build | `mobile-dev`/`coder` (frontend) | Dashboard UI | **Sonnet** |
| Verify | `tester` / `production-validator` | Integration & e2e, contract verification | **Sonnet** |
| Verify | `reviewer` / `security-auditor` | Code review, dependency & secret scanning | **Opus** |
| Ship | `pr-manager` / `release-manager` | PRs, GitHub Actions, Cloud Run deploy wiring | **Sonnet** |

## Coordination topology

- **Topology:** `hierarchical-mesh` (RuFlo default, anti-drift), max 15 agents.
- **Discovery = fan-out:** independent research agents run in parallel, report
  back to the lead, which synthesises the PRD.
- **Build = pipeline:** `tdd-london-swarm → coder → tester → reviewer`, agents
  coordinate via `SendMessage` (not polling), per `CLAUDE.md`.
- **Memory:** hybrid backend with HNSW vector search; successful patterns are
  stored to the `patterns` namespace for reuse across phases.

## Operating notes

- All long-running agents are spawned `run_in_background: true` in a single
  message, then the lead stops and waits for completion/messages.
- The optional RuFlo `daemon` (interval workers spawning headless sessions) is
  **left off** to avoid continuous token spend; workers are dispatched
  explicitly when needed (e.g. `testgaps` after features, `audit` after
  security changes).
