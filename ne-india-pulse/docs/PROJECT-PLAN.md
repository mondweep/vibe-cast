# NE India Pulse — Phased Delivery Plan

Engineering process: **Domain-Driven Design** (PRD & model) → **ADRs** (decisions)
→ **TDD London School** (outside-in, mock-driven build) → **CI/CD** (GitHub
Actions) → **Deploy** (GCP Cloud Run). Each phase is driven by the RuFlo swarm
with models matched to task complexity (see [`SWARM-STRATEGY.md`](SWARM-STRATEGY.md)).

Legend: ✅ done · 🟡 in progress · ⬜ not started

---

## Phase 0 — Discovery & PRD  ✅

**Goal:** Understand what's possible with GDELT for NE India and lock scope.

- ✅ Initialise RuFlo swarm (`npx ruflo init`) — 17 agents, hierarchical-mesh
- ✅ Scaffold project (`docs/`, `src/`, `tests/`) + swarm/model strategy
- ✅ Deep research: GDELT capabilities (Opus agent) → `docs/research/01`
- ✅ Deep research: NE India demographics & open data (Sonnet agent) → `docs/research/02`
- ✅ Live proof-of-concept snapshot (real GDELT pull) → `docs/research/03`
- ✅ **PRD (DDD)** → `docs/prd/PRD.md`
- ✅ ADR-0003: GDELT data-access strategy (raw GKG files primary)

**Exit criteria:** ✅ PRD authored; bounded contexts + first slice agreed.

## Phase 1 — Architecture & Design  ✅

**Goal:** Turn the domain model into a buildable design.

- ✅ Bounded contexts as packages (ingestion/analytics/reference/api); ports &
  adapters (`GkgGateway`)
- ✅ ADR-0004 runtime stack (Python + FastAPI), ADR-0005 persistence (in-memory
  TTL cache), ADR-0006 ingestion scheduling (lazy refresh → Cloud Scheduler)
- ⬜ OpenAPI export + formal threat model (carried into Phase 3)

**Exit criteria:** ✅ ADRs accepted; test strategy defined (London School).

## Phase 2 — Walking Skeleton (TDD London School)  ✅

**Goal:** Thinnest end-to-end slice: one query → one rendered insight.

- ✅ Outside-in acceptance test: "today's top themes + tone for Assam" (mocked gateway)
- ✅ Driven down with mocks: `GkgGateway` port, aggregator, `PulseService`, read API, UI
- ✅ Real `GdeltRawFileGateway` (raw GKG files) behind the mocked contract; contract-tested
- ✅ FastAPI dashboard + JSON API; Dockerfile; GitHub Actions CI (ruff + pytest + docker smoke)
- ✅ Verified live: Assam/region snapshots render real themes, tone, entities

**Exit criteria:** ✅ 21 tests green; app runs locally & in Docker; insights live.

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
