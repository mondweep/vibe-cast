# ADR-015: Skill Lab Domain — Agent Simulator & Guided Exercises

**Status:** PROPOSED (2026-06-07)
**Context:** Closes the gap between PRD §5 (Skill Lab Domain) and the shipped build
**Deciders:** (pending) Product owner, Architecture team
**Methodology:** SPARC + DDD + TDD (London School), per PRD
**Related:** [ADR-013 Learning Domain], [ADR-011 CQRS Read Models], [ADR-009 EventBus], [ADR-014 Knowledge Graph & Tutor]

---

## Problem

PRD §5 specifies a **Skill Lab**: a sandbox where learners write orchestration code and (5.1) watch agents interact in a real-time simulator, and (5.2) complete guided exercises with hidden test suites, progressive hints, and automated feedback. **None of it is built** — there is no `Exercise`/`ExerciseAttempt` model, no simulator, no exercise data, and no Skill Lab UI.

**Accuracy hazard (must fix):** the PRD's example code uses a fictional API — `new Ruflo.Swarm(); swarm.agent('router', Router)`. Real Ruflo orchestrates via **named agents that coordinate with `SendMessage`** (the `Agent` tool + `run_in_background`), real topologies (`mesh | hierarchical | hierarchical-mesh | adaptive`), and the CLI/MCP surface. The Skill Lab MUST teach the real API, consistent with the curriculum (ADR-013) and the knowledge graph (ADR-014). The PRD code samples are illustrative only and are NOT to be reproduced verbatim.

---

## Decision

Implement **Skill Lab** as a bounded context following the existing DDD + CQRS + event-driven patterns. Learner code runs in a **deterministic, sandboxed simulator** — never against real infrastructure.

### 1. Domain model (write side)

```
Exercise (Aggregate Root)
 ├─ id, skillLabId, title, skill (message-passing|leader-election|consensus|topology|memory|...)
 ├─ level (beginner|intermediate|advanced), lessonId? (links to ADR-013 Lesson)
 ├─ starterCode, instructions, learningObjectives[]
 ├─ hiddenTestSuite (TestCase[] — not sent to client until evaluated server-side)
 ├─ hints: Hint[] (ordered, progressive — never the full solution)
 ├─ bonusChallenges[], status (DRAFT|PUBLISHED)

ExerciseAttempt (Aggregate Root — per learner per exercise)
 ├─ learnerId, exerciseId, submittedCode
 ├─ testResults (passed/failed counts + per-case detail), hintsUsed (cap 1 per PRD §5.2)
 ├─ status (IN_PROGRESS|PASSED|COMPLETED), startedAt, completedAt?
 └─ emits: ExerciseStarted, SolutionSubmitted, HintRequested, ExerciseCompleted
```

**Value objects:** `Skill`, `TestCase`, `Hint`, `TestRunResult`. The **Simulator** is a runtime/visualization concern (a service + UI), not an aggregate.

**Events** (PRD §9 alignment): `ExerciseStarted`, `SolutionSubmitted(learnerId, exerciseId, passed, failed)`, `HintRequested`, `ExerciseCompleted(learnerId, exerciseId)`. `ExerciseCompleted` is consumed by the Metrics context (ADR-017, "exercises completed X/Y") and contributes to certification eligibility/reputation.

### 2. Code execution — the load-bearing decision

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Client-side deterministic simulator** (Web Worker + an in-app mock Ruflo runtime that models named agents, a message bus, topologies, 30s cap) | Safe, offline, fast, no infra, deterministic visualization | Models — not real — agents; must track real API shape | **CHOSEN for the simulator (5.1)** |
| **B. Server-side WASM sandbox** (`ruflo-wasm` sandbox MCP, isolated) | Richer/real runtime for grading | Infra, latency, security surface | **CHOSEN for hidden-test grading (5.2) where needed** |
| C. Run untrusted code in the API process | — | Unsafe (RCE) | **REJECTED** |

The simulator emulates the **SendMessage-first** model: learners instantiate named agents and wire `SendMessage` flows; the runtime renders a message bus (arrows, type labels, success=green/error=red/timeout=orange, per §5.1). Hidden-test grading runs in a WASM sandbox (`ruflo-wasm` MCP) or a constrained Web Worker, returning pass/fail per case without leaking the suite.

### 3. Read models (CQRS — `ruflo_demo`, doubled-prefix, RLS + `projection_version`/`last_synced_event_id` per ADR-011)
- `ruflo_demo_exercise_read_model` — public_read (catalog).
- `ruflo_demo_exercise_attempt_read_model` — owner/service read (per-learner).

### 4. API
- `GET /api/v1/skill-lab/exercises` (+ `?skill=&level=`), `GET /skill-lab/exercises/:id` — public catalog.
- `POST /skill-lab/exercises/:id/submit { learnerId, code }` → runs hidden tests in the sandbox, returns `{ passed, failed, failures[] }`.
- `POST /skill-lab/exercises/:id/hint { learnerId }` → next progressive hint (enforce 1/exercise per §5.2).
- `POST /skill-lab/exercises/:id/complete { learnerId }` → emits `ExerciseCompleted`.

### 5. Frontend
- `SkillLabPage` (exercise grid, filter by skill/level, completed badges).
- `ExercisePage` — Monaco editor (starter code + TODOs), **visualization canvas** (agent nodes + animated message bus), console output, Play/Pause/Reset + speed slider (1x/2x…), instructions panel, "Get Hint", "Submit & Check" with inline pass/fail + line numbers.

### 6. Synergy
- **Hints are GraphRAG-grounded (ADR-014):** progressive hints can be retrieved from the knowledge graph (cite-or-refuse), never the full solution.
- Exercises link to ADR-013 lessons (e.g. the leader-election lesson → a leader-election exercise) and to KG concepts.

---

## Consequences / Risks
- **Sandbox safety** is the central risk — no untrusted code in the API process; WASM/Web Worker isolation, CPU/time caps (30s), no network.
- **Hidden tests** must never reach the client before evaluation.
- The client simulator is a *model*; keep its API surface synced to real Ruflo so learners build transferable skill (cross-check against `/tmp/ruflo-src` and the KG, as the curriculum reviewer did for lessons).

## Phasing
1. **P1:** Exercise catalog + attempts + hidden-test runner + submit/hint/complete + basic editor (no live viz).
2. **P2:** Real-time simulator visualization (canvas, message bus, controls).
3. **P3:** Server WASM sandbox for richer runtimes; bonus challenges; GraphRAG hints.

## Test strategy (London School)
Mock `TestRunner`, `SimulatorRuntime`, `FeedbackService`, `ProgressService`; assert orchestration (instantiate agents, draw messages, enforce timeout, hint cap, completion recording) — mirroring the PRD §5 test sketches but against the real-Ruflo API surface.
