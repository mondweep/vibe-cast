---
name: course-platform-init
description: >
  Bootstrap a new DDD/CQRS/event-sourced learning platform from scratch, OR add a
  new course (paths, lessons, exercises) to an existing one. Use when the user wants
  to spin up a vibe-cast-style platform for a new subject, or feed new course material
  and generate the seed migrations, domain entries, knowledge-graph nodes, and a
  project-specific initiation guide. Inputs come from a config.yaml (project metadata)
  and a course-material/ folder (raw content). Bakes in the security + architecture
  best practices proven on vibe-cast.
---

# Course Platform Init

A repeatable mechanism for standing up — or extending — an AI-assisted learning
platform. The *best practices* are fixed and concrete; only the *identifiers and
content* are supplied per-run.

## Two modes

| Mode | When | What it produces |
|------|------|------------------|
| **bootstrap** | Brand-new platform for a new subject | Full repo scaffold: CLAUDE.md, foundational ADRs, DDD domain map, Dockerfile, CI, env checklist, + the first course's seed |
| **add-course** | Existing platform, new subject matter | Only: seed migration(s), catalog/domain entries, knowledge-graph nodes, an ADR for the new curriculum. No new domains. |

Pick the mode from the user's intent. If ambiguous, ask.

## Input contract

The user supplies **two channels**. Never invent these — read them.

### 1. `config.yaml` (project metadata)
Copy `config.example.yaml`, fill it, place at repo root or pass its path.
Drives all *naming and structure*. See the example file for the full schema.

### 2. `course-material/` (the actual content)
A folder of raw files the skill *transforms* into platform artifacts:
```
course-material/
├── syllabus.md        # required: paths → modules → lessons hierarchy
├── lessons/*.md       # optional: per-lesson body content
└── exercises/*.md     # optional: skill-lab exercises with solutions
```
Drives all *content* (seed rows, KG nodes, exercise definitions).

## Process — bootstrap mode

1. **Validate inputs.** Confirm `config.yaml` parses and `course-material/syllabus.md`
   exists. If either is missing, stop and tell the user exactly what to provide.
2. **Restate the problem statement** from `config.project.problem_statement`. Every
   later artifact must trace back to it.
3. **Set up git.** Create the repo structure on `config.branches.development`
   (create the branch if absent). Use an orphan branch only if the user asks for a
   clean demo history.
4. **Render `CLAUDE.md`** from `templates/CLAUDE.md.tmpl` using config values.
5. **Derive bounded contexts.** Map the major nouns in the syllabus + config.domains
   to DDD bounded contexts. Default set: Learning, Certification, SkillLab, Community,
   Metrics. Only include domains the config requests.
6. **Write foundational ADRs** from `templates/ADR.md.tmpl` — one each for: EventBus,
   SAGA/consistency, CQRS read models, database choice, deployment target. Fill
   Context/Decision/Consequences from config; keep the *patterns* from
   `references/best-practices.md` verbatim.
7. **Generate the seed migration** for the first course (see add-course steps 2–4).
8. **Render deployment assets** — Dockerfile + CI from templates, env checklist from
   `references/best-practices.md §Security`.
9. **Render the project guide** from `templates/PROJECT_GUIDE.md.tmpl` — this is the
   vibe-cast guide with every identifier substituted. Write to `docs/`.
10. **Verify & report.** List every file created, mapped to its source input.

## Process — add-course mode

1. **Validate inputs.** `course-material/syllabus.md` is required. Read `config.yaml`
   for the table prefix (`config.database.table_prefix`) and existing domain names.
2. **Inspect existing schema.** Find the latest `migrations/NNN_*.sql` to get the next
   sequence number and to match existing table/column conventions. Never guess column
   names — read a prior seed migration and mirror it.
3. **Parse the syllabus** into the platform's hierarchy (path → module → lesson →
   exercise). Preserve ordering and difficulty/level metadata.
4. **Emit the seed migration** `migrations/NNN_seed_<course-slug>.sql` from
   `templates/migration.sql.tmpl`:
   - Use the existing `table_prefix`.
   - Apply **every** security rule from `references/best-practices.md §RLS` —
     `GRANT SELECT` to the right roles, RLS policies per-operation, service_role
     grants for writes.
   - Idempotent inserts (`ON CONFLICT DO NOTHING` keyed on a natural key).
5. **Generate knowledge-graph nodes/edges** if the platform has a KG (check for
   `migrations/*knowledge_graph*`). Map lessons→nodes, prerequisites→edges.
6. **Write an ADR** for the new curriculum using the ADR template.
7. **Verify & report.** Show the migration, confirm it references only existing tables,
   and remind the user to run it against Supabase (do not apply it yourself unless asked).

## Hard rules (carried over from the proven build)

- **Security is non-negotiable.** Every new table gets RLS enabled + per-operation
  policies. Frontend uses the publishable/anon key only; the service-role key is
  server-side only and never inlined in client code. Run the
  `references/best-practices.md §Security checklist` before declaring done.
- **Never commit secrets.** Assume gitleaks is active; use placeholders in any doc.
- **Stay in sync.** Before generating migrations, fetch latest and read the newest
  existing migration so numbering and conventions match.
- **Trace everything to the problem statement.** Reject scope that doesn't.
- **Files under 500 lines**; put generated artifacts in `migrations/`, `docs/`,
  `src/<domain>/`, never the repo root unless it's a root-level config file.

## Output manifest

Always end with a table: `file → source input → mode`. This is how the user verifies
the run did what they fed it.
