# Ruflo Agent Orchestration Learning Platform

> Branch: **`ruflo-demonstration`** · part of the [vibe-cast](./MASTER-README.md) build-in-public lab by **[Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty)**.

A full-stack learning platform that teaches **real [Ruflo](https://github.com/ruvnet/ruflo) agent orchestration** through structured learning paths, source-grounded lessons, progress tracking, a GraphRAG AI tutor, interactive exercises, community patterns, and learner analytics. Built with DDD + CQRS + TDD against `PRD_RUFLO_LEARNING_PLATFORM.md`.

**🌐 Live:** https://learn-ruflo-xijtfcuhyq-nw.a.run.app  
**Stack:** Fastify + Node 20 (ESM) · Vite + React + TanStack Query · Supabase (Auth / Postgres / RLS / pgvector, schema `ruflo_demo`) · Cloud Run (`europe-west2`, auto-deploys on push to `ruflo-demonstration`)

---

## 📋 Project Status — 9 June 2026

**Headline:** the full PRD surface is **live in production** — a learner can sign up, work through 38 accurate lessons across three difficulty tiers, track progress, use the AI tutor, practice in the Skill Lab, browse community patterns, view their analytics, and unlock premium tiers with a coupon. **Freemium monetisation is live.**

### ✅ Completed & live

| Domain | PRD § | State |
|---|---|---|
| **Learning Domain** | §4 | **Complete** — 38-lesson curriculum (Beginner 12 · Intermediate 14 · Advanced 12), all authored and verified against the real Ruflo source; learning paths, lesson rendering, progress dashboard, prerequisite chain, lesson-complete and path-enrol writes. |
| **Knowledge Graph + AI Tutor** | ADR-014 | 166-node graph (command / MCP tool / agent type / topology / pattern nodes) + pgvector embeddings; GraphRAG retrieval + citation links; **multi-provider BYOK** (Anthropic, OpenAI, Requesty, Gemini — env var or in-browser key with Settings panel). |
| **Skill Lab** | §5 / ADR-015 | Exercise catalogue (5 exercises across 3 difficulty levels), server-side hidden-test grading, client-side pattern-matching simulator, hint system, exercise completion tracking. |
| **Community Patterns** | §7 / ADR-016 | Pattern library (6 seeded patterns), full CRUD for submitting patterns, star ratings, public browse with category/difficulty/search filters. |
| **Metrics & Analytics** | §8 / ADR-017 | Per-learner metrics dashboard (7 stat cards), cohort overview, projectors wired to the EventBus. |
| **Certification (read side)** | §6 | Certifications list/detail, learner badges, leaderboard + current-user rank, member search, single enrolment — all contract-gap reads closed. |
| **Freemium / Coupon System** | ADR-018 | Beginner path free; Intermediate + Advanced gated by time-bound coupon. Admin panel to create `RUFLO-XXXX-XXXX` codes, renew, deactivate. Premium badge + lock UI on path cards; coupon redemption modal; 1-week trial coupons. |
| **Feedback** | — | In-app feedback form backed by Supabase. |
| **Platform / DevOps** | — | Supabase JWT auth + RLS; GitHub Actions CD (auto-deploy on push); tsc clean; 459/471 tests passing (12 pre-existing failures unrelated to recent work). |

### 🟡 Known gaps / future work

| Area | Detail |
|---|---|
| **Certification write side** | Exam-taking, capstone review, and badge-award flow — models exist, UI not built. |
| **Coupon rate limiting** | `/api/v1/coupons/redeem` has no rate limit yet — add before public launch to prevent brute-force enumeration. |
| **Stripe integration** | Automated coupon mint via webhook (ADR-018 §Future). |
| **use_count concurrency** | Currently read-then-write; replace with `UPDATE … SET use_count = use_count + 1` for strict atomicity under high load. |
| **Legacy test failures** | 12 pre-existing failures (EventBus contract, empty stub specs, `@testing-library/jest-dom` setup). Not introduced by recent work. |
| **KG-5** | Optional: regenerate lesson content v2 from the knowledge graph. |

---

## Architecture

```
src/
├── api/                  # Fastify server, controllers, routes, middleware
│   ├── controllers/      # learningCatalog, learningProgress, coupon,
│   │                     # adminCoupons, skillLab, communityPatterns,
│   │                     # metrics, tutor, knowledgeGraph, feedback …
│   └── routes/           # one file per controller
├── learning/             # Learning bounded context (DDD)
│   ├── domain/           # LearningPath, Lesson, PathProgress aggregates
│   └── infrastructure/   # LearningCatalogRepository, ProgressReadRepository
├── community/            # Community Patterns bounded context
├── metrics/              # Metrics/Analytics bounded context
├── skilllab/             # Skill Lab bounded context
├── certification/        # Certification bounded context
├── shared/               # EventBus, DomainEvent, CQRS read-model repos,
│                         # IReadModelRepository, NullReadModelRepository,
│                         # SupabaseReadModelRepository, Logger
└── web/                  # Vite + React frontend
    ├── api/              # Axios clients (paths, progress, tutor, coupons …)
    ├── components/       # Header, Sidebar, PremiumBadge, CouponModal, TutorDrawer …
    ├── hooks/            # useMyAccess, useEnrollment, useLearnerProfile …
    └── pages/            # LearningPaths, Lesson, SkillLab, Patterns, Analytics,
                          # Dashboard, AdminCoupons …
```

**Backend pattern:** Fastify ESM TypeScript. DDD aggregates with domain events; CQRS read models in Supabase (`ruflo_demo` schema, RLS, service-role writes, publishable-key reads). EventBus wires projectors at boot.

**Frontend pattern:** Vite + React + react-router + TanStack Query; Supabase JS auth; Tailwind CSS + Lucide icons.

**Knowledge graph:** `kg_node`/`kg_edge`/`lesson_concept` + pgvector (384-dim `Xenova/all-MiniLM-L6-v2`); `kg_search` RPC; 1-hop traversal for context grounding; optional LLM synthesis via `src/api/services/llmProvider.ts`.

---

## Supabase Migrations

All migrations are version-controlled under `migrations/` and have been applied to the `ruflo_demo` schema on Supabase project `ertsvhwtaeityanbmyzw`. **You do not need to run them manually.**

| File | Purpose | Applied |
|---|---|---|
| `001_create_saga_state.sql` | Saga state store | ✅ |
| `002_create_learning_curriculum.sql` | Learning path + lesson read models | ✅ |
| `003_seed_beginner_path.sql` | 12 Beginner lessons seeded | ✅ |
| `004_expose_ruflo_demo_schema.sql` | PostgREST schema exposure | ✅ |
| `005_create_knowledge_graph.sql` | `kg_node`, `kg_edge`, `lesson_concept`, pgvector | ✅ |
| `006_seed_intermediate_path.sql` | 14 Intermediate lessons seeded | ✅ |
| `007_seed_advanced_path.sql` | 12 Advanced lessons seeded | ✅ |
| `008_create_progress_read_models.sql` | Path enrolment, lesson completion, path progress | ✅ |
| `009_create_certification_community_read_models.sql` | Certification, badge, community read models + seed | ✅ |
| `010_badge_authenticated_read_policy.sql` | RLS policy for badge reads | ✅ |
| `011_create_feedback_table.sql` | Feedback submissions table | ✅ |
| `012_create_skill_lab_tables.sql` | Exercise catalogue + attempt read models (5 exercises seeded) | ✅ |
| `013_create_community_patterns_tables.sql` | Pattern + rating read models (6 patterns seeded) | ✅ |
| `014_create_metrics_tables.sql` | Learner metrics + cohort read models | ✅ |
| `015_create_coupon_system.sql` | `ruflo_demo_coupon` + `ruflo_demo_coupon_redemption`, RLS, indexes | ✅ |
| `ruflo_demo_schema.sql` | Base schema setup reference | ✅ |

---

## Run locally

```bash
npm install

# Create .env (gitignored):
# SUPABASE_URL=https://ertsvhwtaeityanbmyzw.supabase.co
# SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # client-safe, can be committed only if non-secret
# DATABASE_SCHEMA=ruflo_demo
# SUPABASE_SECRET_KEY=sb_secret_...             # server-only writes (progress, coupons); NEVER commit
# Optional tutor LLM (or use in-browser BYOK):
# ANTHROPIC_API_KEY=...  | OPENAI_API_KEY=...  | LLM_PROVIDER=anthropic

npm run build            # Vite frontend build → dist/
npm run build:server     # esbuild server bundle → dist/server/server.mjs
npx tsx src/api/server.ts   # dev: backend + serves SPA on :3000
npm run dev              # Vite dev server (frontend hot reload on :5173)
npm test                 # vitest — 471 tests, 459 passing
```

## Deploy (Cloud Run — auto via GitHub Actions)

Pushing to `ruflo-demonstration` triggers `.github/workflows/deploy.yml` automatically:
1. Authenticates to GCP with `GCLOUD_SERVICE_KEY` repository secret
2. Builds and pushes Docker image to Artifact Registry (`europe-west2`)
3. Deploys to Cloud Run service `learn-ruflo` with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_SCHEMA=ruflo_demo`

To deploy manually:

```bash
gcloud run deploy learn-ruflo --source . \
  --project=vibe-cast-492722 --region=europe-west2 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=…,SUPABASE_PUBLISHABLE_KEY=sb_publishable_…,DATABASE_SCHEMA=ruflo_demo,NODE_ENV=production"
```

> The runtime image is **`node:20-slim` (glibc/Debian)** — required because `@xenova/transformers` → `onnxruntime-node` ships glibc-only native binaries (Alpine/musl will not start).

---

## Admin setup (Freemium coupons)

To issue coupons, your Supabase user account needs admin role:

1. Go to **Supabase Dashboard → Authentication → Users**
2. Find your user → **Edit** → set `app_metadata`: `{ "role": "admin" }`
3. Log out and back in to refresh the JWT
4. Visit **`/admin/coupons`** in the app — you'll see the coupon management panel
5. Create a coupon (default: 7 days, INTERMEDIATE + ADVANCED access) → copy the `RUFLO-XXXX-XXXX` code
6. Share the code with selected users; they enter it on any locked path card

To **renew** a coupon: click Renew on the admin page, enter new duration in days. All holders with non-lapsed access are extended automatically.

---

## Security

- `.env` is gitignored; `SUPABASE_SECRET_KEY` and LLM keys are never committed or logged.
- Tutor BYOK keys are used transiently per-request and never stored server-side.
- Coupon admin endpoints require `app_metadata.role === 'admin'` on the JWT — verified server-side on every request.
- All Supabase queries use parameterised methods (`.eq()`, `.filter()`) — no raw SQL interpolation.
- Curriculum content is verified against the real Ruflo source — no invented commands or APIs.

---

## ADRs

| ADR | Decision |
|---|---|
| [ADR-009](./docs/adr/) | EventBus architecture |
| [ADR-011](./docs/adr/) | CQRS read models |
| [ADR-012](./docs/adr/) | Kubernetes / Cloud Run |
| [ADR-013](./docs/adr/ADR-013-Learning-Domain-Curriculum.md) | Learning Domain curriculum |
| [ADR-014](./docs/adr/) | Knowledge Graph + AI Tutor |
| [ADR-015](./docs/adr/ADR-015-Skill-Lab-Domain.md) | Skill Lab domain |
| [ADR-016](./docs/adr/ADR-016-Community-Domain.md) | Community Patterns domain |
| [ADR-017](./docs/adr/ADR-017-Metrics-Domain.md) | Metrics analytics domain |
| [ADR-018](./docs/adr/ADR-018-Freemium-Coupon-Access-Control.md) | Freemium coupon access control |

---

> Part of the **vibe-cast** repository — see the full multi-branch catalogue in **[MASTER-README.md](./MASTER-README.md)**. Licensed under [MIT](./LICENSE).
