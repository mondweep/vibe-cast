# ADR-0013: Supabase backend for the archive, norms and plans

- **Status:** Accepted — decided by the product owner, 2026-08-06
- **Date:** 2026-08-06
- **Supersedes:** the *proposed* ADR-0013 ("no backend for the economic model"),
  which recommended against this. That recommendation was made, considered and
  overruled; the reasoning it rested on is preserved below under *Costs
  accepted*, because the costs are real and should be visible to whoever reads
  this next rather than quietly dropped.
- **Project:** `aws-advanced-networking` (`ertsvhwtaeityanbmyzw`), eu-west-1,
  Postgres 17. **Shared** with other applications.
- **Relates to:** ADR-0004 (client-side-only, zero egress), ADR-0007 (static
  Netlify deployment), ADR-0010 (bundled bulletin archive), ADR-0011 (cost norms)

## Context

A Supabase project is available and the decision is to use it: to store bulletin
information, cost norms and the outputs of the rehabilitation model.

The project is **shared with other applications**, which is a hard constraint
rather than a detail. Everything this application creates must be namespaced so
it cannot collide with, or be mistaken for, another application's data.

## Decision

**Use Supabase, under a dedicated `floodmonitoring_` namespace, additively.**

### 1. Everything is prefixed `floodmonitoring_`

A dedicated Postgres schema named `floodmonitoring` is the preferred form, with
every table inside it. Where a shared-project convention forces objects into
`public`, every table name carries the `floodmonitoring_` prefix instead. Either
way, no object this application creates is reachable without the prefix, and no
migration touches an object that lacks it.

This is enforced by review discipline **and** by never issuing a migration whose
statements name an unprefixed object.

### 2. The client stays the source of truth for parsing

pdf.js keeps running in the browser. A bulletin the user loads is parsed
locally, exactly as today; the backend stores the *result*, not the PDF, and
only for bulletins that are already public ASDMA output.

This preserves the part of ADR-0004 that carries real weight — a user's own file
is not uploaded as a side effect of opening it — while letting the archive live
server-side. A user's ad-hoc upload is sent only if they choose to publish it.

### 3. Read paths degrade to the bundle

The bundled archive (ADR-0010) stays. If Supabase is unreachable, unauthorised
or slow, the console still opens on sixteen real bulletins and every existing
guarantee holds. The backend makes the archive *fresher*; it is not what makes
the console work.

This keeps the ADR-0010 machinery earning its keep and means a backend outage is
a degradation, not an outage.

### 4. The CSP is relaxed narrowly and named

`connect-src 'self'` becomes `connect-src 'self' https://<project>.supabase.co`.
Nothing wildcard, nothing broader. The `netlify.toml` comment must state what the
extra origin is for, so the next reader can tell an intentional hole from an
accidental one.

### 5. The architecture fitness test changes shape, not intent

`architecture.test.ts` currently bans `fetch` anywhere in `src/`. That ban
becomes: banned everywhere **except** a named Supabase adapter under
`src/adapters/`, which is the only module permitted to make a network call. The
dependency rule is unchanged — the domain still cannot reach it.

The test must assert the exception is a single named file, so "no egress outside
one adapter" stays mechanically enforced rather than becoming a convention.

## Costs accepted

Recorded plainly, because they were the basis of the superseded recommendation
and they do not stop being true now that the decision has gone the other way:

- **Zero egress stops being a browser-enforced property.** Today a sceptical
  officer can verify from the network tab that nothing leaves. After this, they
  must instead trust a policy about *what* leaves. Mitigated by §2 — the user's
  own file still does not leave — but the guarantee is genuinely weaker, and the
  README's "the bulletin never leaves your machine" must be rewritten rather than
  left standing.
- **A shared project is a blast radius.** A migration error can affect other
  applications. Hence §1, and hence no unprefixed statement, ever.
- **Keys, auth and a data-protection surface** now exist where none did. Even
  with only public ASDMA data, an anon key in a static bundle is a thing to
  reason about, and row-level security has to be right rather than default.
- **Deployment is no longer just static files.** ADR-0007's "no backend, no
  database, no secrets" is no longer accurate and that record needs amending.

## Consequences

**The archive can outrun the last deploy.** This is the clearest win and it
retires a stated known limitation: the bundle ages, and until now only a rebuild
could refresh it. It does not solve the SDRF geo-block — that endpoint is
unreachable from outside India whatever the storage is — but once a bulletin
reaches the database by any route, every user sees it without a deploy.

**Norm schedules can be published centrally.** ADR-0011's requirement that every
rate carry a citation, an effective date and a version is unchanged; the schedule
now has somewhere to live where it can be updated without a release. Versioning
becomes a column rather than a git tag, and assessments must pin the version they
used, exactly as ADR-0011 already requires.

**Plans and funding scenarios become shareable.** The thing a backend is
genuinely best at, and the reason to have one for this feature.

**The economic model itself is unaffected.** It is arithmetic over data in
memory; it neither knows nor cares where that data was loaded from. Person-day
integrals and cumulative loss are computed identically. Nothing in this decision
blocks or changes the model's domain layer — which is why building it was able to
start before this ADR was settled.

## Schema sketch

Illustrative, not final — it needs a migration review before anything runs
against a shared project.

| Table | Holds |
|---|---|
| `floodmonitoring_bulletin` | one row per bulletin: content-hash id, report date, generated-at, source |
| `floodmonitoring_district_report` | per bulletin per District — the quantities |
| `floodmonitoring_statewide_total` | the Total rows as ASDMA printed them |
| `floodmonitoring_provenance` | per section: confidence, source pages |
| `floodmonitoring_norm_schedule` | id, name, basis, version, effective-from |
| `floodmonitoring_norm_rate` | per schedule: category, amount, currency, unit, citation |
| `floodmonitoring_plan` | a saved rehabilitation plan |
| `floodmonitoring_plan_line` | its line items, each tracing to an assessment line |

The content-hash bulletin id (PRD §5.6) is the natural primary key and makes
ingestion idempotent: re-uploading the same PDF is a no-op rather than a
duplicate day.

## Open, before any migration runs

1. **RLS policy.** Public read on bulletins and norms is probably right; write
   must not be. Needs deciding explicitly, not defaulting.
2. **Who writes.** The nightly sync currently commits to git. Does it now write
   to Supabase instead, as well, or not at all?
3. **Confirmation that `aws-advanced-networking` is the intended home**, given
   the name suggests it was created for something else entirely.
