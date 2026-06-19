# ADR-0001: Use a RuFlo (claude-flow) agent swarm to deliver the project

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Lead agent (Opus), project owner
- **Tags:** process, tooling, orchestration

## Context

NE India Pulse spans research, domain modelling, backend, frontend, infra and
CI/CD. The brief mandates a multi-agent ("swarm") delivery with models matched
to task complexity, plus DDD, ADRs and TDD (London School). We need a structured
way to coordinate specialised agents rather than a single linear session.

## Decision

We will use **RuFlo v3 (`npx ruflo@latest init`)** — the claude-flow V3
orchestrator — as the delivery harness. It is initialised at the project root
and provides:

- A **hierarchical-mesh** topology (anti-drift), up to 15 agents.
- Ready-made agents we map to our process: `specification`/`architecture`
  (SPARC), `planner`, `tdd-london-swarm`, `coder`, `tester`, `reviewer`,
  `security-architect`, `pr-manager`/`release-manager`.
- A **3-tier model routing** (Haiku / Sonnet / Opus) we apply via the
  model-matching strategy in [`../SWARM-STRATEGY.md`](../SWARM-STRATEGY.md).
- `SendMessage`-based agent coordination, hybrid memory with vector search.

## Alternatives considered

- **Single-agent linear session** — simpler, but no parallel research, weaker
  separation of concerns, and doesn't satisfy the swarm/model-matching brief.
- **Hand-rolled subagent orchestration** — full control but reinvents topology,
  memory and coordination that RuFlo already provides.

## Consequences

- The RuFlo config (`.claude/`, `CLAUDE.md`, `.mcp.json`) lives in the repo;
  generated runtime state (`.claude-flow/data|logs|sessions`) is git-ignored.
- The optional background `daemon` is left **off** to avoid continuous token
  spend; workers are dispatched explicitly.
- Contributors need `npx`/Node available; the MCP server (`ruflo mcp start`) is
  opt-in (`autoStart: false`).
