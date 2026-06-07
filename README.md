# Ruflo Agent Orchestration Learning Platform

> Branch: **`ruflo-demonstration`** · part of the [vibe-cast](./MASTER-README.md) build-in-public lab by **[Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty)**.

A full-stack learning platform that teaches **real [Ruflo](https://github.com/ruvnet/ruflo) agent orchestration** — learning paths, source-grounded lessons, progress tracking, and an in-app GraphRAG AI tutor. Built with DDD + CQRS + TDD against `PRD_RUFLO_LEARNING_PLATFORM.md`.

**🌐 Live:** https://vibe-cast-xijtfcuhyq-nw.a.run.app  ·  **Stack:** Fastify + tsx (Node 20) · Vite + React + react-query · Supabase (Auth/Postgres/RLS, `ruflo_demo` schema) · pgvector · Cloud Run (`europe-west2`)

---

## 📋 Project Status — as of close of day, Sunday 7 June 2026

**Headline:** the product spine is **live in production and demonstrable end-to-end** — a learner can sign in, browse 3 paths / 38 accurate lessons, track progress, and use the AI tutor. Against the *full* PRD (5 bounded contexts), roughly **45–55%** is built; three domains remain greenfield but now each has an ADR.

### ✅ Completed & live
| Area | PRD | State |
|---|---|---|
| **Learning Domain** | §4 | **~95%** — full **38-lesson curriculum** (Beginner 12 · Intermediate 14 · Advanced 12), all authored & verified against the real Ruflo source (0 hallucinated APIs); paths, lessons, progress dashboard, prerequisite chain Beginner→Intermediate→Advanced. |
| **Knowledge Graph + AI Tutor** | ADR-014 | 166-node graph + embeddings; GraphRAG tutor with citations; **multi-provider BYOK** (Anthropic / OpenAI / Requesty / Gemini — env var or in-browser key). |
| **Certification (read side)** | §6 | Frontend↔backend contract gaps closed: certifications list/detail, learner badges, leaderboard + current-user rank, member search, single enrollment. |
| **Platform / quality** | — | Supabase JWT auth bridge + CORS; deployed to Cloud Run; tsc clean (0 errors); 22/22 Learning-domain tests pass; ADRs 013–017 written. |

### 🟡 Partially done
- **Learning Domain — write actions.** Read/browse is fully live. **Mark-lesson-complete / enroll** and owner-scoped reads (your badges, a single enrollment) are coded but need the **Supabase secret key** set in Cloud Run Secret Manager + a redeploy.
- **Certification.** Read endpoints + exam/badge models exist; the full exam-taking and capstone-review flow is not built.
- **Test suite.** 91 pre-existing failures remain — genuine API-drift bugs in the *original* scaffolding (EventBus constructor/`subscribe` signature, empty stub specs), not introduced by recent work.

### ⬜ Not started (each now has an ADR so it can be built without drift)
| Domain | PRD | ADR |
|---|---|---|
| **Skill Lab** — agent simulator + guided exercises | §5 | [ADR-015](./docs/adr/ADR-015-Skill-Lab-Domain.md) |
| **Community** — pattern repository + peer code review | §7 | [ADR-016](./docs/adr/ADR-016-Community-Domain.md) |
| **Metrics** — learner/cohort analytics dashboard | §8 | [ADR-017](./docs/adr/ADR-017-Metrics-Domain.md) |
| **KG-5** (optional) — regenerate lessons v2 from the graph | ADR-014 | — |

### ⏭️ Immediate next steps
1. **Wire the Supabase secret key** (Secret Manager) → unlocks lesson-complete/enroll writes (~10 min).
2. **Clear the 91 legacy test failures** (isolated source-contract fixes).
3. **Build the deferred domains** (Skill Lab / Community / Metrics / full Certification flow) per their ADRs.

---

## Architecture

- **Backend** (`src/api`, `src/learning`, `src/shared`): Fastify run via `tsx` (ESM). DDD aggregates (`LearningPath`, `Lesson`, `PathProgress`) with domain events; CQRS read models in Supabase (`ruflo_demo` schema, RLS, `projection_version`/`last_synced_event_id`).
- **Frontend** (`src/web`): Vite + React + react-router + @tanstack/react-query; Supabase JS auth; lessons render `ContentBlock[]` (objectives/prose/code/callout/capstone/quiz).
- **Knowledge graph + tutor**: `kg_node`/`kg_edge`/`lesson_concept` + pgvector; Transformers.js (`Xenova/all-MiniLM-L6-v2`, 384-dim) embeddings; `kg_search` RPC; provider-agnostic synthesis (`src/api/services/llmProvider.ts`).
- **Migrations**: `migrations/001`–`010` (curriculum, KG, progress, certification/community read models).
- **Decisions**: see [`docs/adr/`](./docs/adr/) — ADR-009 EventBus, ADR-011 CQRS, ADR-012 K8s, ADR-013 Learning Domain, ADR-014 KG/Tutor, ADR-015 Skill Lab, ADR-016 Community, ADR-017 Metrics.

## Run locally

```bash
npm install
# .env (gitignored) needs: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DATABASE_SCHEMA=ruflo_demo
#   (optional) SUPABASE_SECRET_KEY for writes; LLM_PROVIDER + a provider key for the tutor
npm run build            # vite build (frontend)
npx tsx src/api/server.ts   # backend + serves the SPA on :3000
npm run dev              # frontend dev server (Vite), if developing the UI
npm test                 # vitest
```

## Deploy (Cloud Run)

```bash
gcloud run deploy vibe-cast --source . --project=vibe-cast-492722 --region=europe-west2 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=…,SUPABASE_PUBLISHABLE_KEY=sb_publishable_…,DATABASE_SCHEMA=ruflo_demo,NODE_ENV=production"
```

> The runtime image is **`node:20-slim` (glibc)** — required because the tutor's `@xenova/transformers` → `onnxruntime-node` ships glibc-only native binaries (Alpine/musl fails to start). Client-safe Vite vars are embedded at build via `.env.production`; **never** put the Supabase secret key or any LLM key in the repo or env-vars — use Secret Manager.

## Security notes
- `.env` is gitignored; only client-safe publishable keys ship in the frontend bundle.
- Tutor BYOK keys are used transiently per request and never logged or persisted.
- Curriculum content is verified against the real Ruflo source — no invented commands/tools/APIs.

---

> Part of the **vibe-cast** repository — see the full multi-branch catalogue in **[MASTER-README.md](./MASTER-README.md)**. Licensed under [MIT](./LICENSE).
