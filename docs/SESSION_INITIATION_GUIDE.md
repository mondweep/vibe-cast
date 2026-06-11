# How We Built Vibe-Cast: From Problem Statement to Production
## A Repeatable Initiation Process for AI-Assisted Full-Stack Projects

**Project**: Vibe-Cast Learning Platform  
**Session Type**: Greenfield full-stack SaaS  
**Stack**: TypeScript, React, Fastify, Supabase, Vercel/Railway/Cloud Run  
**Approach**: DDD + CQRS + Event Sourcing + TDD + Agentic QE + Swarm AI  

---

## 1. Starting Point: Problem Statement

Before writing a single line of code, the initiative began with a clear problem statement:

> **"Professionals need a modern, structured platform to pursue certifications with interactive exercises, community learning, and AI-guided support."**

This drove every subsequent decision. The problem statement should answer:
- **Who** has the problem? (Learners, professionals)
- **What** is the pain? (Fragmented, passive learning)
- **Why** now? (AI-enabled tutoring, remote learning growth)
- **What does success look like?** (Learner completes a path and earns a badge)

**Lesson**: A sharp problem statement prevents scope creep. Every feature request should trace back to it.

---

## 2. GitHub Setup

Set up GitHub **before** writing code. It's the single source of truth.

```bash
# Create repo on GitHub (via UI or gh CLI)
gh repo create vibe-cast --private

# Initial commit
git init
git add .
git commit -m "Initial commit"
git push -u origin main
```

**Branch strategy adopted**:
- `main` — stable, protected
- `ruflo-demonstration` — active development branch (orphan, clean history)
- Feature branches per Claude Code session (auto-named e.g. `claude/zealous-volta-mfw14`)

**Lesson**: Create an orphan branch for demos/agents to prevent polluting `main` with AI-generated commits.

```bash
git checkout --orphan ruflo-demonstration
git rm -rf .
git commit --allow-empty -m "Initial commit for ruflo-demonstration orphan branch"
```

---

## 3. Ruflo Setup (Claude Flow Orchestration)

Ruflo is the AI orchestration framework (built on Claude Code + claude-flow) that coordinated agents across the project.

```bash
# Install claude-flow
npx @claude-flow/cli@latest init --wizard

# Start the swarm daemon
npx @claude-flow/cli@latest daemon start

# Verify health
npx @claude-flow/cli@latest doctor --fix
```

**What Ruflo provides**:
- Named agent spawning with message passing
- Memory persistence across sessions (vector search)
- Hook system (pre/post task automation)
- Swarm topology (hierarchical, mesh, pipeline)

**Key CLAUDE.md configuration** (checked into repo):
```
- Topology: hierarchical-mesh
- Max Agents: 15
- Memory: hybrid (HNSW + neural)
- Named agents communicate via SendMessage (not polling)
```

---

## 4. Product Requirements Document (PRD)

Before any architecture, a PRD was created to align on scope:

```
docs/PRD.md (or embedded in IMPLEMENTATION_PLAN.md)
```

**PRD sections**:
1. **Executive Summary** — one paragraph on what the product does
2. **User Personas** — Learner, Instructor, Admin
3. **Core User Stories** — as a learner, I want to...
4. **MVP Feature Set** — what ships in v1
5. **Out of Scope** — explicit exclusions prevent feature creep
6. **Success Metrics** — completion rate, DAU, badge issuance

**Lesson**: The PRD became the source for DDD bounded contexts. Each major noun in the PRD became a domain.

---

## 5. Architecture Decision Records (ADRs)

Every major technical decision was documented as an ADR in `docs/adr/`:

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-009 | In-memory EventBus (dev), RabbitMQ (prod) | Fast iteration, swappable via interface |
| ADR-010 | SAGA Orchestration for distributed transactions | Rollback safety across domains |
| ADR-011 | CQRS Read Models (Supabase projectors) | Separate write/read performance concerns |
| ADR-012 | Kubernetes deployment target | Production scalability |
| ADR-013 | Learning Domain curriculum model | Structured paths with lessons and capstones |
| ADR-014 | Knowledge Graph + AI Tutor | Graph-based learning with Claude API |
| ADR-015 | Skill Lab Domain | Interactive code exercises |
| ADR-016 | Community Domain | Discussion and pattern sharing |
| ADR-017 | Metrics Domain | Analytics and progress tracking |
| ADR-018 | Freemium Coupon Access Control | Monetisation without full paywall |

**ADR template**:
```markdown
## Status: ACCEPTED / PROPOSED / DEPRECATED
## Context: Why is this decision needed?
## Decision: What was chosen?
## Consequences: What are the trade-offs?
## Alternatives Considered: What was rejected and why?
```

**Lesson**: ADRs prevent re-litigating past decisions. When a developer asks "why Supabase?", the ADR answers it without a meeting.

---

## 6. Domain-Driven Design (DDD)

The PRD nouns became DDD **Bounded Contexts**:

```
Learning Domain      → Paths, Lessons, Enrollment, Progress
Certification Domain → Badges, Exams, Certificates
Skill Lab Domain     → Exercises, Lab Sessions
Community Domain     → Members, Discussions, Patterns
Metrics Domain       → Analytics, Leaderboard
```

**DDD layers per domain**:
```
src/{domain}/
├── domain/
│   ├── models/          # Aggregates (e.g. LearningPath, PathProgress)
│   ├── events/          # Domain events (e.g. LessonCompleted)
│   └── value-objects/   # Immutable values (e.g. PathLevel, CapstoneType)
├── application/         # Use cases / command handlers
└── infrastructure/
    └── repositories/    # Supabase queries
```

**Key DDD patterns applied**:
- **Aggregates**: Enforce invariants (e.g. can't complete a path with incomplete lessons)
- **Domain Events**: Published on state changes, consumed by projectors and SAGAs
- **Anti-Corruption Layer (ACL)**: Translates events between domains to prevent coupling
- **Repository pattern**: Abstracts Supabase behind interfaces for testability

---

## 7. CQRS + Event Sourcing

**Command side** (writes):
```
HTTP POST → Controller → Domain Aggregate → Publish DomainEvent → EventBus
```

**Query side** (reads):
```
EventBus → Projector → Update Supabase read model → HTTP GET → Frontend
```

**Why this matters**:
- Write path optimizes for correctness (validation, business rules)
- Read path optimizes for speed (pre-computed, indexed views)
- Eventual consistency (~50-100ms lag) is acceptable for a learning platform

**EventBus tiered strategy**:
- Dev: In-memory (zero dependencies)
- Production: RabbitMQ/Kafka (swap via interface, no code changes)

---

## 8. TDD (Test-Driven Development)

Tests were written **before or alongside** implementation using the London School (mock-driven) approach.

**Test pyramid**:
```
E2E (Playwright)        — 5-10%  — full user flows
Integration             — 20-30% — HTTP + DB interaction
Unit                    — 60-70% — domain logic, pure functions
```

**Vitest** was chosen (not Jest) because:
- Native ESM support
- Vite ecosystem compatibility
- Faster test execution

**Test file locations**:
```
tests/unit/{domain}/    # Domain model tests
tests/integration/      # Cross-domain, event-driven tests
tests/contracts/        # Contract tests for aggregates
tests/api/              # HTTP endpoint tests
```

**Key lesson**: Tests caught a critical bug in LearnerProfileProjector where `average_score` was computed incorrectly across multiple enrollments. Without TDD, this would have shipped.

---

## 8.5 Agentic QE — Quality Governance Above TDD

TDD covered *how each unit was built*. **Agentic QE (AQE)** sat one level above it as the
**quality-governance layer** — defining *what must be tested across domains* and *what
coverage counts as done*. It was run as a **fleet/CLI initialized over the repository**,
not as in-application code.

### How AQE was actually used

```
aqe init  → writes .agentic-qe/config.json (fleet config for THIS repo)
            ├── enumerates each domain, its models, test files, contract files
            ├── declares SAGA scenarios (trigger → steps → verification)
            └── sets coverage thresholds (statements 80 / branches 75 / functions 80 / lines 80)
                    ↓
AQE drives test DESIGN: contract tests + cross-domain integration + SAGA failure cases
                    ↓
Vitest EXECUTES the tests; coverage measured against AQE thresholds
```

**Evidence in this repo**:
- `.agentic-qe/config.json` — the fleet config, scoped to real files (e.g.
  `src/skill-lab/domain/models/Exercise.ts`, `LabSession`), with per-model coverage
  targets (85%) and SAGA definitions like `LabSessionCompletionSaga`.
- `.gitignore` keeps `.agentic-qe/` local (working dir, not committed).
- `tests/integration/` (~4,500 lines, 9 specs) and `tests/contracts/` — the
  cross-domain, idempotency, event-log-replay, and query-model-sync scenarios AQE targeted.
- `docs/SAGA_FLOWS_DESIGN.md §"Testing Strategy (agentic-qe Integration)"` documents the
  SAGA contract-test strategy whose thresholds match `config.json`.

### Two honest caveats (don't over-claim)

1. **AQE is a QE fleet, not in-repo source.** An earlier plan
   (`docs/PHASE_2_IMPLEMENTATION_PLAN.md`) proposed building
   `src/shared/testing/agentic-qe/` orchestrator classes — those were **never committed**.
   The real value came from the fleet operating *on* the repo, not code shipped *in* it.
2. **AQE governed design; Vitest executed.** `config.json` names jest/ts-jest, but the
   committed suite runs under **Vitest**. Treat AQE as the coverage/contract authority and
   Vitest as the runner — they are complementary, not the same tool.

### Why this matters for repeatability

The division of labour is the reusable pattern:
- **TDD** → correctness of each unit (inner loop)
- **AQE** → cross-domain contract + SAGA coverage + threshold governance (outer loop)
- **Vitest/Playwright** → execution

**Lesson**: Initialize the QE fleet *after* the domains exist but *before* you call testing
"done" — it surfaces the cross-domain and failure-path scenarios that unit TDD never prompts you to write.

---

## 9. Swarm Orchestration

For multi-file, multi-domain tasks, agents were launched in parallel using the pipeline pattern:

```javascript
// ALL agents launched in ONE message
Agent({ name: "researcher",  prompt: "Research codebase → SendMessage to architect" })
Agent({ name: "architect",   prompt: "Wait for researcher → Design → SendMessage to coder" })
Agent({ name: "coder",       prompt: "Wait for architect → Implement → SendMessage to tester" })
Agent({ name: "tester",      prompt: "Wait for coder → Write tests → SendMessage to reviewer" })
Agent({ name: "reviewer",    prompt: "Wait for tester → Security/quality review" })
```

**Swarm topologies used**:
| Task | Topology | Agents |
|------|----------|--------|
| Domain model implementation | Pipeline | researcher → architect → coder → tester |
| API + Frontend (parallel) | Fan-out | api-coder ∥ frontend-coder → reviewer |
| Security review | Specialist | security-architect → auditor |
| Database migrations | Sequential | architect → coder → tester |

**Lesson**: Name every agent. Unnamed agents can't receive SendMessage and become dead ends.

---

## 10. Database: Choosing and Securing Supabase

### Why Supabase was chosen over alternatives

| Option | Rejected Because |
|--------|-----------------|
| PostgreSQL (raw) | Manual auth, hosting overhead |
| Firebase | NoSQL, poor relational queries |
| PlanetScale | No RLS, MySQL (not Postgres) |
| Neon | Less mature auth ecosystem |
| **Supabase** ✅ | PostgreSQL + Auth + RLS + realtime + free tier |

### Key pivot moment
Initially considered a simple REST API with a raw PostgreSQL instance. The pivot to Supabase happened when we needed:
1. Built-in **JWT authentication** (Supabase Auth)
2. **Row Level Security** (RLS) for multi-tenant data
3. **Realtime subscriptions** (future feature)
4. A **hosted solution** with no infra management

### Security best practices applied

**1. Row Level Security (RLS) on every table**:
```sql
ALTER TABLE ruflo_demo_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own enrollments
CREATE POLICY "learners_own_enrollments"
  ON ruflo_demo_enrollments FOR SELECT
  USING (auth.uid() = learner_id);
```

**2. Separate keys for frontend and backend**:
- `VITE_SUPABASE_ANON_KEY` — public key, exposed in browser (safe because RLS enforces access)
- `SUPABASE_SECRET_KEY` — service role key, server-side only, bypasses RLS

**3. Secret scanning** (gitleaks):
```bash
# Pre-commit hook to prevent secret leakage
git config core.hooksPath .githooks
# .gitleaks.toml configured with allowlists for known-safe keys
```

**4. Table naming convention**: `ruflo_demo_` prefix on all tables to:
- Identify platform-specific tables
- Avoid collision with Supabase system tables
- Enable easy cleanup in shared projects

**5. Never expose service role key in frontend code** — This was caught and fixed before it shipped.

**6. Optimistic locking on SAGA state**:
```sql
-- Prevents race conditions in distributed workflows
ALTER TABLE ruflo_demo_saga_state ADD COLUMN version INTEGER DEFAULT 0;
-- Application checks version before update
```

---

## 11. Deployment Pipeline

### Phase 1: Vercel (Frontend + Serverless)
- ✅ SPA routing via `vercel.json` rewrites
- ✅ Environment variables via Vercel dashboard
- ⚠️ Hit 100 deployments/day limit on free tier during debugging
- **Lesson**: Batch changes before pushing; use empty commits sparingly

### Phase 2: Docker + Cloud Run / Railway
When Vercel hit limits, pivoted to containerized deployment:

```dockerfile
# Multi-stage build
FROM node:20-slim AS builder    # Build frontend + bundle backend
FROM node:20-slim               # Runtime: copy dist + serve SPA + API
```

**Key Dockerfile decisions**:
- `node:20-slim` not `alpine` — required for `@xenova/transformers` (ONNX runtime, glibc-only)
- `dumb-init` for signal handling (graceful shutdown in containers)
- Regenerate `package-lock.json` inside builder (cross-platform npm optional deps bug)
- Backend bundled with `esbuild` to single ESM file (eliminates tsx ESM resolver race)

### Environment variables checklist
```
Backend (secret):
  SUPABASE_URL
  SUPABASE_SECRET_KEY
  SUPABASE_PUBLISHABLE_KEY

Frontend (public, VITE_ prefix):
  VITE_API_URL
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
```

### CI/CD
`.github/workflows/deploy.yml` — Auto-deploys to Cloud Run on push to `ruflo-demonstration`.

---

## 12. Process Retrospective: What Worked

| Practice | Impact |
|----------|--------|
| Problem statement first | Prevented scope creep |
| ADRs for every major decision | Zero re-litigation of past choices |
| DDD bounded contexts | Clean separation, parallel agent work |
| TDD before implementation | Caught 3 critical bugs before ship |
| Agentic QE fleet for cross-domain coverage | Surfaced SAGA/contract scenarios unit TDD misses; enforced 80% thresholds |
| Named swarm agents | Parallel execution, clear handoffs |
| Interface-driven dependencies | Swapped EventBus/Repository without touching domain code |
| Gitleaks pre-commit | Prevented 2 secret exposure incidents |
| Orphan branch for demo | Clean git history, no main branch pollution |

---

## 13. What to Do Differently Next Time

1. **Run `npm install` immediately after adding dependencies** to keep lock file in sync
2. **Test Docker build locally** before pushing to CI (`docker build .`)
3. **Set Vercel Production branch before first deploy** — not after
4. **Add `vercel.json` on day 1** for SPA projects — not when 404s appear
5. **Use Railway or Cloud Run from the start** if you expect >100 deployments during development
6. **Create seed data migrations early** so the app has demo content on first launch

---

## 14. Reusable Skill Template

This process can be abstracted into a `project-initiation` skill:

```
Input:
  - problem_statement: string
  - project_type: "saas" | "api" | "mobile" | "cli"
  - deployment_target: "vercel" | "railway" | "cloud-run"
  - database: "supabase" | "planetscale" | "postgres"

Output:
  - GitHub repo structure
  - CLAUDE.md with swarm config
  - Initial ADRs (3-5 foundational decisions)
  - DDD domain map
  - Dockerfile + deploy config
  - Environment variable checklist
  - CI/CD workflow
  - Seed migration
```

**Estimated skill build time**: 2-3 hours to parameterize and test against a new project.

---

## Summary: The Initiation Checklist

```
[ ] Problem statement written (1 paragraph, clear user + pain)
[ ] GitHub repo created, orphan demo branch set up
[ ] Ruflo / claude-flow initialized (CLAUDE.md configured)
[ ] PRD drafted (personas, user stories, MVP scope)
[ ] DDD bounded contexts identified from PRD nouns
[ ] Foundational ADRs written (EventBus, DB, Auth, Deployment)
[ ] Test framework configured (Vitest + RTL)
[ ] Database chosen + RLS policies planned
[ ] Secret scanning configured (gitleaks pre-commit)
[ ] Environment variables documented (.env.example)
[ ] Dockerfile + vercel.json / railway config created
[ ] Swarm topology chosen for first implementation sprint
[ ] Seed migration planned for demo data
```

**Total initiation time**: 2-4 hours before first line of domain code.
