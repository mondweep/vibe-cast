# Best Practices — the invariant layer

These are **literal and concrete**. They do NOT get genericised — only project
identifiers do. Apply every rule that fits the run. Derived from the vibe-cast build.

## §Security (run this checklist before declaring any run "done")

- [ ] **RLS enabled** on every new table: `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;`
- [ ] **Per-operation policies** — never combine. One policy each for SELECT / INSERT /
      UPDATE / DELETE (Postgres does not support `FOR INSERT, UPDATE` in one clause).
- [ ] **Service-role grants for writes**: server-side writers need explicit
      `GRANT INSERT/UPDATE ... TO service_role;` (a learner JWT must not bypass RLS).
- [ ] **Authenticated read policy** where learners read their own rows:
      `USING (auth.uid() = <owner_col>)`.
- [ ] **Key separation**: frontend uses the **publishable/anon** key only
      (`VITE_SUPABASE_ANON_KEY`); the **service-role** key (`SUPABASE_SECRET_KEY`) is
      server-side only and never inlined in client bundles.
- [ ] **No secrets in committed files** — assume gitleaks is active; use placeholders.
- [ ] **Optimistic locking** on any SAGA/state table: `version INTEGER DEFAULT 0`,
      check-and-increment on update.

### RLS pattern (copy, substitute table/owner only)
```sql
ALTER TABLE {{prefix}}{{table}} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{{table}}_select_own" ON {{prefix}}{{table}}
  FOR SELECT USING (auth.uid() = {{owner_col}});

CREATE POLICY "{{table}}_insert_own" ON {{prefix}}{{table}}
  FOR INSERT WITH CHECK (auth.uid() = {{owner_col}});

-- Server-side writers (projectors, admin flows) bypass via service_role:
GRANT SELECT, INSERT, UPDATE ON {{prefix}}{{table}} TO service_role;
GRANT SELECT ON {{prefix}}{{table}} TO authenticated;
```

## §Migrations

- Sequence strictly: read the latest `migrations/NNN_*.sql`, use `NNN+1`.
- **Index declarations go OUTSIDE `CREATE TABLE`** (inline indexes aren't supported).
- **Idempotent seeds**: `INSERT ... ON CONFLICT (<natural_key>) DO NOTHING;`.
- **Table prefix** is mandatory and consistent (`config.database.table_prefix`) — it
  identifies platform tables and avoids collision with Supabase system tables.
- Never apply migrations automatically — emit the file and tell the user to run it.

## §DDD heuristics

- Bounded contexts come from the **major nouns** in the PRD/syllabus, not from tech layers.
- Each domain: `domain/{models,events,value-objects}` + `infrastructure/repositories`.
- Aggregates enforce invariants; cross-domain talk happens via **domain events** through
  an Anti-Corruption Layer, never direct table reads across contexts.
- Repositories sit behind interfaces so Supabase can be swapped/mocked in tests.

## §Testing — TDD + Agentic QE (two loops)

**Inner loop (TDD / Vitest)** — correctness of each unit:
```
tests/unit/{domain}/   tests/contracts/   tests/integration/   tests/api/
```
Test pyramid: 60–70% unit, 20–30% integration, 5–10% E2E.

**Outer loop (Agentic QE fleet)** — cross-domain coverage governance:
1. After domains exist, initialize the AQE fleet over the repo (`aqe init` →
   `.agentic-qe/config.json`, kept gitignored).
2. Enumerate each domain's models, contract files, and **SAGA scenarios**
   (trigger → steps → verification).
3. Set coverage thresholds (statements 80 / branches 75 / functions 80 / lines 80).
4. AQE drives test *design* (contract + integration + SAGA failure paths); **Vitest
   executes**. Treat AQE as the coverage/contract authority, Vitest as the runner.
5. Don't call testing "done" until AQE's cross-domain + failure-path scenarios exist and
   thresholds are met.

**Caveat to preserve**: AQE is a fleet operating *on* the repo, not source shipped *in*
it. Do not scaffold `src/**/agentic-qe/` orchestrator code — that was an abandoned plan.

## §Deployment

- Single container serves SPA + API (multi-stage Dockerfile).
- Use `node:20-slim` (glibc) not alpine if any dep ships glibc-only native binaries
  (e.g. `@xenova/transformers`/onnxruntime).
- Regenerate the lockfile inside the Linux builder to dodge the npm optional-deps bug
  (`npm/cli#4828`) for platform-native binaries.
- Add `vercel.json` SPA rewrite on day one for Vercel; or prefer Cloud Run/Railway if you
  expect >100 deploys/day during development (Vercel free-tier cap).
- Bundle the backend (esbuild → single ESM) to avoid tsx ESM-resolver races at runtime.

## §Git workflow

- Develop on the configured development branch; protect `main`.
- Orphan branch only for clean demo history.
- Keep files < 500 lines; never write working files to repo root.
