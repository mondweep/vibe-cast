# ADR-013: Learning Domain — Curriculum, Paths & Lessons

**Status:** PROPOSED (2026-06-07)
**Context:** Closes the gap between PRD §4 (Learning Domain) and the shipped build
**Deciders:** (pending) Product owner, Architecture team
**Methodology:** SPARC + DDD + TDD (London School), per PRD

---

## Problem

### The build drifted from the PRD

The PRD (`PRD_RUFLO_LEARNING_PLATFORM.md` §4) specifies a **Learning Domain** as the primary product surface: Learning Paths → Lessons, progress tracking, and a 38-lesson curriculum (§4.4). **None of it was implemented.** Evidence:

| PRD artefact | Spec location | Built? |
|---|---|---|
| `LearningPath` aggregate (`startPath`, `completeLesson`, prerequisite gating, unlock-next) | §4.1 | ❌ no model |
| `Lesson` / `InteractiveLesson` (content, runnable examples) | §4.2 | ❌ no model |
| Curriculum: Beginner 12 / Intermediate 14 / Advanced 12 = **38 lessons** | §4.4 | ❌ no data |
| Domain events `LearnerEnrolled`, `LessonCompleted`, `PathCompleted` | §9 | ⚠️ only `EnrollmentCompleted` exists |
| Learning Paths UI + Lesson viewer + progress dashboard | §4.1–§4.3 | ❌ UI shows "Browse Certifications" instead |

What **was** built (in the Claude Code web session) is the **certification / exam / community** slice: `Certification`/`Exam` models, an enrollment service, learner-profile + certification-progress + community read models. The frontend models *Certifications*, not *Paths/Lessons*. The DB (`migrations/ruflo_demo_schema.sql`) has `learner_profile`, `certification_progress`, `community_profile`, `metrics` read models — **no `learning_path` or `lesson` tables.**

**Consequence observed:** the learner sees an empty dashboard with "Browse Certifications" and no pathway, because the entire curriculum layer — domain, data, API, and UI — is absent. This ADR defines how to build it back to the PRD.

---

## Decision

Implement the Learning Domain as a first-class bounded context following the existing DDD + CQRS + event-driven patterns (ADR-009 EventBus, ADR-011 CQRS read models), with **authored lesson content** sourced from the Ruflo project (https://github.com/ruvnet/ruflo).

### 1. Domain model (write side)

```
LearningPath (Aggregate Root)
 ├─ id, level (beginner|intermediate|advanced), title, description
 ├─ estimatedHours, prerequisitePathId?, status (DRAFT|PUBLISHED|ARCHIVED)
 ├─ orderedLessonIds: LessonId[]
 ├─ startPath(learnerId)            → invariant: prerequisite path 100% complete
 ├─ completeLesson(learnerId, id)   → recompute progress, unlock next lesson
 └─ emits: LearnerEnrolled, LessonCompleted, PathCompleted

Lesson (Entity, owned by LearningPath)
 ├─ id, pathId, order, title, topics[], estimatedHours
 ├─ prerequisiteLessonId?, capstone (Quiz|CodeExercise|Design|Deployment|...)
 ├─ content: ContentBlock[]   (see §5 — authored)
 └─ status (DRAFT|PUBLISHED)

PathProgress (Aggregate — per learner per path)
 ├─ learnerId, pathId, completedLessonIds[], progressPct, status
 └─ startedAt, completedAt?
```

**Value objects:** `PathLevel`, `LessonOrder`, `CapstoneType`, `ContentBlock` (discriminated union: `prose | code | callout | quiz`).

**Events** (align names to PRD §9): `LearnerEnrolled(learnerId, pathId)`, `LessonCompleted(learnerId, lessonId, pathId)`, `PathCompleted(learnerId, pathId)`. `PathCompleted` is consumed by the Certification context (existing `LearningToCertificationACL`) to check eligibility — preserving current cross-domain wiring.

### 2. Read models (CQRS — follow `ruflo_demo` conventions)

New migration `migrations/002_create_learning_curriculum.sql` adds, in schema `ruflo_demo`, with the same RLS/`projection_version`/`last_synced_event_id` pattern as existing tables:

- `ruflo_demo_learning_path_read_model` — catalog: path metadata, lesson_count, prerequisite, learner_count. **Public read.**
- `ruflo_demo_lesson_read_model` — lesson catalog + authored `content JSONB`. **Public read** for published lessons.
- `ruflo_demo_path_progress_read_model` — per-learner progress (completed_lesson_ids, progress_pct, status, current_lesson_id). **Owner + service read** (mirror `learner_profile` RLS).

Projectors (`src/learning/infrastructure/projectors/`) subscribe to the three events and materialize these tables, consistent with `LearnerProfileProjector`.

### 3. API (fixes ADR-audit gaps + adds curriculum)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/learning/paths` | list 3 paths w/ lock state |
| GET | `/api/v1/learning/paths/:id` | path detail |
| GET | `/api/v1/learning/paths/:id/lessons` | ordered lessons |
| GET | `/api/v1/learning/lessons/:id` | lesson + authored content |
| POST | `/api/v1/learning/paths/:id/start` | start path (prereq-gated) |
| POST | `/api/v1/learning/lessons/:id/complete` | complete lesson |
| GET | `/api/v1/learning/learners/:id/progress` | path progress (dashboard) |
| GET | `/api/v1/learning/learners/:id/enrollments` | *(also closes the contract-audit gap)* |

### 4. Frontend (re-aligns UI to PRD)

- New types: `LearningPath`, `Lesson`, `ContentBlock`, `PathProgress` (`src/web/types`).
- New API client `src/web/api/paths.ts`.
- New pages: `LearningPathsPage` (3 paths, locked/unlocked per §4.1), `PathDetailPage` (lesson list + progress bar), `LessonPage` (content viewer; runnable example per §4.2 — see Risks). Update `DashboardPage` to show active path + next lesson + streak.
- Nav: add **"Learning Paths"** as the primary learning surface; keep "Certifications" as the credentialing surface that *gates on path completion* (§6). This reconciles the drift rather than deleting the certification work.

### 5. Authored lesson content (depth = full content)

Each of the 38 lessons gets authored `ContentBlock[]` (prose + code + callouts + a capstone prompt), sourced from the Ruflo repo. Topic→source mapping (from the Ruflo README):

| Path | PRD topics (§4.4) | Ruflo source concepts |
|---|---|---|
| Beginner (12) | agents, messages, topologies, swarm setup, state, resilience, observability, scaling, testing, deploy, capstone | `npx ruflo init`, queen/mesh/gossip topologies, agent lifecycle, `memory_store`/`memory_search`, hooks |
| Intermediate (14) | byzantine consensus, leader election, CQRS/event sourcing, topology evolution, custom skills, perf, security, federation | Raft queen elections, AgentDB HNSW, SONA learning loops, background workers, zero-trust federation (mTLS/ed25519) |
| Advanced (12) | game theory, BFT, adaptive ML topologies, custom frameworks, multi-cloud, zero-trust, capstone defense, mentorship | Byzantine tolerance, behavioral trust scoring, GOAP A* planning, compliance audit modes, plugin authoring |

Content stored as structured JSONB (renderable as MDX). Authoring is the largest workstream and is parallelizable per-lesson — a good candidate for a multi-agent (SPARC) run, one agent per lesson with a shared template + a review pass.

### 6. TDD (London School)

Tests-first, reusing the specs the PRD already wrote: `LearningPath.startPath`/`completeLesson` (§4.1), `InteractiveLesson.runExample`/`submitSolution` (§4.2). Mock `LearningRepository`, `MetricsService`, `MessagingService`, `SkillLabService`.

---

## Phased implementation plan

| Phase | Deliverable | Notes |
|---|---|---|
| **0** | This ADR approved + per-lesson content outline | no code |
| **1** | `LearningPath` + `Lesson` + `PathProgress` domain + events, TDD-first | pure domain, no I/O |
| **2** | Migration `002` (write tables + 3 read models) + projectors + **seed 38 lessons (structure)** | schema/structure only |
| **3** | 8 API endpoints (read + commands) | closes audit gaps |
| **4** | Frontend types, client, 3 pages, routing, nav, dashboard update | UI re-aligned to PRD |
| **5** | **Author 38 lesson contents** from Ruflo | parallelizable; largest effort |
| **6** | Interactive runnable examples (§4.2) | **depends on Skill Lab simulator (§5), also unbuilt** |

---

## Consequences

### Positive
✅ Restores the PRD's core product surface (the actual course pathway).
✅ Reuses existing DDD/CQRS/event infrastructure — additive, low-conflict.
✅ Closes the frontend↔backend contract-audit gaps for the learning domain.
✅ Certification work is preserved and correctly positioned downstream of path completion.

### Tradeoffs
⚠️ Large scope (6 phases); content authoring (Phase 5) dominates effort.
⚠️ Interactive code execution (Phase 6) is blocked on the unbuilt Skill Lab simulator — recommend shipping lessons as read + capstone-submit first, deferring the live sandbox.
⚠️ Two enrollment concepts now coexist (path enrollment vs certification enrollment); the ACL boundary must stay explicit to avoid model confusion.

---

## Alternatives considered

1. **Reuse `Certification` as the learning container** — Rejected: conflates credentialing with curriculum; contradicts PRD bounded contexts (§3).
2. **Static lesson content (markdown files, no domain)** — Rejected: no progress tracking, prerequisites, or events; fails §4.1 acceptance criteria.
3. **Author content first, model later** — Rejected: TDD/DDD sequencing wants the domain + schema stable before bulk content.

---

## Implementation checklist (Phase 1 entry)

- [ ] Approve ADR + curriculum content outline
- [ ] Write failing tests for `LearningPath.startPath` / `completeLesson` (port PRD §4.1)
- [ ] Implement `LearningPath`, `Lesson`, `PathProgress`, value objects
- [ ] Define `LearnerEnrolled` / `LessonCompleted` / `PathCompleted` events
- [ ] Migration `002`: write tables + 3 read models (RLS per existing pattern)
- [ ] Projectors + seed 38 lessons (structure from §4.4)
- [ ] 8 API endpoints + controller + route tests
- [ ] Frontend types, client, pages, nav, dashboard
- [ ] Author 38 lesson contents (Ruflo-sourced) + content review pass
- [ ] (Deferred) Skill Lab simulator for runnable examples

---

## Related decisions
- **ADR-009:** EventBus design (source of read-model updates)
- **ADR-011:** CQRS Read Model strategy (schema conventions reused here)
- **PRD §4 / §9:** Learning Domain spec and domain events
- **Source:** Ruflo — https://github.com/ruvnet/ruflo (lesson content)

**Review date:** after Phase 4 (UI re-aligned, before bulk content authoring)
