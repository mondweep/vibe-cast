# NE India Pulse — Phased Delivery Plan

Engineering process: **Domain-Driven Design** (PRD & model) → **ADRs** (decisions)
→ **TDD London School** (outside-in, mock-driven build) → **CI/CD** (GitHub
Actions) → **Deploy** (GCP Cloud Run). Each phase is driven by the RuFlo swarm
with models matched to task complexity (see [`SWARM-STRATEGY.md`](SWARM-STRATEGY.md)).

Legend: ✅ done · 🟡 in progress · ⬜ not started

---

## Phase 0 — Discovery & PRD  🟡 (current)

**Goal:** Understand what's possible with GDELT for NE India and lock scope.

- ✅ Initialise RuFlo swarm (`npx ruflo init`) — 17 agents, hierarchical-mesh
- ✅ Scaffold project (`docs/`, `src/`, `tests/`) + swarm/model strategy
- 🟡 Deep research: GDELT capabilities (Opus agent) → `docs/research/`
- 🟡 Deep research: NE India demographics & open data (Sonnet agent) → `docs/research/`
- ⬜ **PRD (DDD)** → `docs/prd/PRD.md`: vision, personas, ubiquitous language,
  bounded contexts, domain model, use cases, NFRs, success metrics, risks
- ⬜ ADR-0003: GDELT data-access strategy (DOC 2.0 API vs BigQuery vs raw files)

**Exit criteria:** PRD reviewed; bounded contexts + first slice agreed.

## Phase 1 — Architecture & Design  ⬜

**Goal:** Turn the domain model into a buildable design.

- ⬜ Context map + aggregates + domain events → `docs/design/`
- ⬜ API contracts (OpenAPI) for the read model the UI consumes
- ⬜ ADRs: runtime stack/language, persistence (cache vs store), ingestion
  cadence/scheduler, frontend approach, observability
- ⬜ Threat model + GDELT ToS compliance review (security-architect, Opus)

**Exit criteria:** ADRs accepted; contracts stubbed; test strategy defined.

## Phase 2 — Walking Skeleton (TDD London School)  ⬜

**Goal:** Thinnest end-to-end slice: one query → one rendered insight.

- ⬜ Outside-in: failing acceptance test for "show today's top themes for Assam"
- ⬜ Drive down with mocks: `GdeltClient` (contract), aggregation, read API, UI
- ⬜ Real `GdeltClient` against DOC 2.0 API behind the mocked contract
- ⬜ Dockerfile + local run; GitHub Actions CI (lint, typecheck, unit tests)

**Exit criteria:** Green CI; skeleton deployable locally; one insight live.

## Phase 3 — Core Features  ⬜

- ⬜ All 8 states; themes, tone/sentiment, trending entities, volume timeline
- ⬜ Scheduled refresh (15-min-aware) + caching to respect rate limits
- ⬜ Dashboard: per-state + regional roll-up, "today" view
- ⬜ Continued London-School TDD per feature; contract tests for GDELT

## Phase 4 — Hardening & Deploy to Cloud Run  ⬜

- ⬜ GitHub Actions CD → build image → push to Artifact Registry → deploy Cloud Run
- ⬜ Workload Identity Federation (keyless) GitHub→GCP auth; least-privilege SA
- ⬜ Observability (logs/metrics/uptime), error budgets, cost guardrails
- ⬜ Security review, dependency + secret scanning (reuses repo gitleaks setup)

**Exit criteria:** App live on Cloud Run; CI/CD green; runbook written.

---

## Cross-cutting / open items

- **GCP auth (blocker for Phase 4 from this environment):** deploy needs an
  authenticated GCP project. Interactive `gcloud auth login` device flow is **not
  possible inside this ephemeral CI container** (`gcloud` isn't installed and
  there's no browser). Resolution path documented in ADR-0002 — CI deploys use
  **Workload Identity Federation** (no exported keys); a one-time human setup of
  the GCP project + WIF pool is required out-of-band by the owner
  (`mondweep@gmail.com`).
- **Cost:** prefer free GDELT DOC 2.0 API + caching; treat BigQuery as opt-in
  (billed) for heavy historical analysis only.
- **Vernacular coverage:** validate how much NE-Indian-language news GDELT
  actually captures (research item) — affects "what NE India thinks" fidelity.
