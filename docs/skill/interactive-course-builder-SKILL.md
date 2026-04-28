---
name: interactive-course-builder
description: Build a comprehensive, interactive, production-grade online course from a topic brief. Use this skill whenever the user wants to create a course, learning platform, training curriculum, educational app, or any structured learning experience — even if they don't use the word "course". Triggers on: "build a course", "create training material", "make an interactive learning platform", "I want to teach X online", "create a curriculum", "build an educational tool", "I need to train people on X", or anything implying structured knowledge delivery with quizzes, labs, or progress tracking. Always use this skill before designing any educational platform architecture or starting any course content planning.
---

# Interactive Course Builder

A comprehensive skill for creating production-grade interactive learning platforms with AI-powered tutoring, visual cheatsheets, and full deployment — from concept to live URL.

## What this skill produces

A fully deployed web application with:
- **10–12 content modules** authored in MDX with tables, code blocks, exam tips
- **Interactive labs** — simulators, decision exercises, visual builders
- **AI Tutor** — GraphRAG chat (vector search + knowledge graph) answering from course content
- **Visual cheatsheets** — uploaded by the author, served as downloadable PNGs
- **Progress tracking** — persona-adaptive, localStorage-backed, per-module
- **About + attribution** page with author LinkedIn and GitHub
- **Persistent footer** credit on every page
- Deployed to **Vercel** (free tier) from a **GitHub** orphan branch

---

## Phase 0 — Scoping (do this before anything else)

### 1. Gather the brief

Ask the user for (or extract from context):
- **Topic** — what domain/subject? (e.g. "AWS Advanced Networking", "Python for Data Science")
- **Audience** — who are the learners? (students / practitioners / teachers, or specific roles)
- **Certification alignment** — is there an exam to target? (e.g. ANS-C01, CKA, PMP)
- **Module count** — typically 8–12; confirm with user
- **Estimated hours** — total learning time (e.g. 60h)
- **GitHub repo** — existing or new? Get URL + PAT with `repo` and `workflow` scopes
- **Vercel account** — get personal access token for deployment
- **Cheatsheet tool** — user typically generates PNGs from Google NotebookLM, Canva, or similar

### 2. Create Linear project (if Linear MCP is connected)

Create a Linear project with 5 milestones:
- Phase 0: PRD & Architecture (2 weeks)
- Phase 1: Platform Foundation (4 weeks)
- Phase 2: Content Authoring (6 weeks)
- Phase 3: Interactive Labs (6 weeks)
- Phase 4: QA & Launch (4 weeks)

Create issues for: PRD, ADRs, DDD model, GitHub scaffold, each phase.

### 3. Create the PRD

Produce a PRD covering:
- Executive summary (problem, solution, metrics)
- Learner personas with distinct paths (Student / Teacher / Practitioner is the default pattern)
- Module map (id, title, domain, hours, prerequisites)
- Tech stack decisions
- DDD bounded contexts
- TDD strategy (London School)
- ADR list (framework, content format, styling, testing, deployment, state, DDD)
- Phase plan with dates
- Risk register

Output as an interactive React artifact with sidebar navigation between sections.

---

## Phase 1 — GitHub & Scaffold

### Orphan branch setup
```bash
git clone https://PAT@github.com/ORG/REPO.git
cd REPO
git checkout --orphan COURSE-NAME   # e.g. aws-advanced-networking
git rm -rf .
# Create README with course overview
git add README.md
git commit -m "chore: initialise COURSE-NAME orphan branch"
git push origin COURSE-NAME
```

### Next.js scaffold (manual — create-next-app often blocked)
Create these files directly:
- `package.json` with deps: next@14, react, tailwindcss, shadcn/ui primitives, next-mdx-remote@6, gray-matter, zustand, remark-gfm, rehype-slug, react-markdown, ai, @anthropic-ai/sdk, @supabase/supabase-js
- `tsconfig.json` — exclude `scripts/` directory
- `tailwind.config.ts` — include custom AWS/brand colour tokens
- `next.config.mjs` — pageExtensions includes mdx
- `postcss.config.mjs`
- `.eslintrc.json`
- `jest.config.ts` — testMatch points to `tests/unit/**`
- `playwright.config.ts`
- `components.json` (shadcn)
- `.gitignore`

### Directory structure
```
src/
  app/                    ← Next.js App Router pages
  components/
    ui/                   ← shadcn primitives (Button, Badge, Progress)
    course/               ← ModuleCard, ModuleViewer, ModuleProgress, LearnerPersonaSelector
    course/mdx/           ← MdxComponents.tsx (tables, code, callouts)
    labs/                 ← VpcBuilder, BgpSimulator, ScenarioExercise etc.
    chat/                 ← CourseChat.tsx (maximisable, streaming)
    layout/               ← CourseLayout.tsx (sidebar + persistent footer)
  contexts/               ← ProgressContext.tsx
  domains/
    course/               ← Module, Lesson entities + repo + service
    learner/              ← Learner entity + events
    progress/             ← ProgressTracker entity (idempotent completion)
    assessment/           ← Assessment, Attempt, scoreAttempt
  lib/
    modules.ts            ← getModuleBySlug, getAllModules (reads MDX)
    knowledge/            ← ontology.ts (nodes + edges)
    rag/                  ← retrieval.ts (lazy Supabase init)
    supabase.ts           ← lazy browser client
  types/                  ← PersonaType, ModuleDomain, Outcome<T>
content/modules/          ← M01-slug/ through M10-slug/ each with index.mdx
docs/adr/                 ← ADR-001 through ADR-007
supabase/migrations/      ← 001_graphrag_schema.sql
scripts/                  ← ingest.ts (excluded from tsconfig)
public/images/cheatsheets/← M01/ through M10/ + overview PNGs
tests/unit/               ← Jest domain tests
tests/e2e/                ← Playwright acceptance tests
.github/workflows/        ← ci.yml + deploy-preview.yml
```

### GitHub Actions CI pipeline (ci.yml)
```yaml
on: [push, pull_request] to main course branch
jobs: typecheck → lint → unit-tests (with 80% coverage gate) → build → e2e
```

**Critical:** PAT needs `workflow` scope to push `.github/workflows/`. If 401, use GitHub Contents API.

---

## Phase 2 — Design System & Layout

### Colour tokens (globals.css CSS variables)
```css
--primary: 35 100% 50%       ← amber/orange (course accent)
--background: 213 35% 7%     ← dark navy
--card: 213 30% 12%
--muted-foreground: 215 20% 55%
```

### shadcn components to create
- `Button` — default + outline + ghost variants
- `Badge` — variants: aws, design, operations, security, automation, exam-prep
- `Progress` — radix primitive

### CourseLayout (sidebar)
Sidebar items in order:
1. Dashboard ⊞
2. My Path ◈
3. Labs ⬡
4. Cheatsheets ◫
5. About ◉

**Persistent footer** on every inner page:
```
Created by [Author Name] (LinkedIn link) · LinkedIn icon · GitHub icon
```

### MdxComponents — critical rules
- **Always include** `thead`, `tbody`, `tr` in table components — without them GFM tables render as raw pipe text
- Use `remarkGfm` in `MDXRemote` options: `{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }`
- The `pre` component must wrap `code` blocks — split inline vs block code by `className.includes('language-')`
- `Callout` component: types `info | tip | warning | exam` with distinct border colours

### Chat component (CourseChat.tsx)
- **Maximise toggle** ⊞/⊡ in header — `isMaximised` state switches between `w-[440px] h-[620px]` and `inset-4`
- **Dark theme**: panel `bg-[#111827]`, user messages `bg-primary text-[#0D1117]`, assistant `bg-[#1e2d3d] text-slate-100`
- **react-markdown + remark-gfm** inside chat bubbles — critical for table rendering in AI responses
- Error events must surface visibly in the bubble, not be swallowed
- `X-Accel-Buffering: no` header on SSE response prevents proxy buffering

---

## Phase 3 — Content Authoring

### MDX frontmatter structure
```yaml
---
id: "01"
slug: "module-slug"
title: "Module Title"
domain: design | operations | security | automation | exam-prep
difficulty: specialty
estimatedHours: 6
prerequisites: []        # array of module ids
topics: []               # array of topic strings
objectives:
  - id: o1
    description: "..."
    bloomsLevel: create | evaluate | analyse | apply | understand | remember
personas: ["student", "teacher", "practitioner"]
---
```

### Content structure per module
1. Introduction paragraph (why this matters)
2. Numbered sections (## 1. Title pattern)
3. Comparison tables (GFM pipe syntax — will render if remark-gfm is enabled)
4. Code blocks with shell commands
5. Exam tip blockquotes: `> **Exam tip (CERT-CODE):** text`
6. Decision matrix (when to use X vs Y)

### Exam tip pattern
```mdx
> **Exam tip (ANS-C01):** Key fact that appears in exams. Keep to 2 sentences.
```

---

## Phase 4 — Interactive Labs

Build at least 3 lab types:

### 1. Visual Builder Lab
User adds/removes/configures components on a canvas. Validate the design against rules. Show a "route table preview" or equivalent configuration output.

Pattern:
```tsx
const [items, setItems] = useState(DEFAULT_ITEMS)
function addItem() { ... }
function validate() { return messages[] }
```

### 2. Simulator / Algorithm Lab
User adjusts numerical attributes and sees the algorithm output.

Pattern:
```tsx
function runAlgorithm(inputs): { winner: Item; reason: string }
```

Show the decision step that was decisive. Allow resetting to defaults.

### 3. Scenario Exercise
Multi-step scenario with 4-option MCQ. Show explanation for both correct and incorrect answers. Track score across multiple scenarios.

Pattern:
```tsx
interface Step { question; context; choices: { isCorrect; explanation }[] }
```

### Labs page
- Tab selector across all labs
- Each tab renders its lab component
- Accessible via `/labs` with `CourseLayout`

---

## Phase 5 — AI Tutor (GraphRAG)

### Supabase schema (001_graphrag_schema.sql)
Tables (all idempotent with `IF NOT EXISTS`):
- `kg_nodes` (id, label, type, description, module_ids, properties)
- `kg_edges` (from_node_id, to_node_id, relation, weight) — unique on (from, to, relation)
- `content_chunks` (module_id, slug, title, section, content, embedding vector(1024))
- `chat_sessions`, `chat_messages`

**Critical SQL fixes:**
```sql
-- Recursive CTE weight type mismatch — always cast explicitly:
1.0::double precision AS weight
(e.weight * gt.weight)::double precision

-- IVFFlat index — no IF NOT EXISTS syntax, use DO block:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chunks_embedding') THEN
    CREATE INDEX idx_chunks_embedding ON content_chunks
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
  END IF;
END $$;

-- Policies — always DROP IF EXISTS before CREATE (idempotency):
DO $$ BEGIN
  DROP POLICY IF EXISTS "..." ON table_name;
END $$;
CREATE POLICY "..." ON table_name FOR SELECT USING (true);
```

### Ontology (ontology.ts)
Define `NODES[]` and `EDGES[]` arrays covering:
- AWSService nodes for each key service
- Concept nodes (BGP, CIDR, DNS, etc.)
- Pattern nodes (Hub-Spoke, Defence-in-Depth, etc.)
- ExamTopic nodes
- Module nodes (one per module)
- Edges: USES, REQUIRES, ENABLES, COMPARED_TO, PART_OF, PREREQUISITE_OF, APPEARS_IN, CONFIGURES, SECURES, MONITORS

### retrieval.ts — lazy Supabase init
```typescript
let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient(url, key);
  return _supabase;
}
```
**Never initialise at module level** — Next.js static analysis runs modules at build time without env vars.

### Chat API route (route.ts)
```typescript
export const dynamic = "force-dynamic";   // prevents static analysis
// Lazy import Anthropic to avoid module-level init:
const Anthropic = (await import("@anthropic-ai/sdk")).default;
```

Response headers:
```typescript
"X-Accel-Buffering": "no"   // prevents Vercel proxy buffering SSE
```

### Embedding model
Use `voyage-3` (1024 dimensions) — matches `vector(1024)` in schema.
`voyage-3-lite` outputs 512 dimensions — do NOT use with a 1024-dim column.

### Ingestion script (scripts/ingest.ts)
- Excluded from `tsconfig.json` (`"exclude": ["node_modules", "scripts"]`)
- Chunks MDX by h2 heading, max ~1400 chars per chunk
- Batch 5–8 chunks per Voyage AI call
- Free tier: 3 RPM → 22s delay between calls
- Upsert with `ignoreDuplicates: true` OR clear tables first (functional unique index on `lower(label)` cannot be used with `onConflict` column name)

---

## Phase 6 — Cheatsheets

### Folder structure
```
public/images/cheatsheets/
├── README.md
├── M01/  .gitkeep → user uploads PNG here
├── M02/  ...
└── M10/
```

Files in `public/` are served directly by Next.js/Vercel at `/images/cheatsheets/M01/filename.png`.

### Cheatsheets page (/cheatsheets)
- Use `CheatsheetGallery` component (lightbox, keyboard ← → navigation, Esc to close)
- Each card: thumbnail, module badge, "Open" lightbox, "View module →" link
- Sidebar link: `Cheatsheets ◫`

**Cheatsheet generation note:** Authors typically generate cheatsheets using Google NotebookLM (export as PNG), Canva, or similar visual tools — Claude does not generate these.

---

## Phase 7 — About & Attribution

### About page sections (in order)
1. Hero — what the course is about, who it's for
2. How to use — numbered steps matching the UX journey
3. Features — card grid (6 features max)
4. Course scope — module list with domain badges, each linked
5. Built with — tech stack tags + engineering approach (DDD/TDD/ADRs)
6. About the author — name, LinkedIn, GitHub, Linear; NO employer unless explicitly requested
7. Footer line — MIT licence + GitHub repo URL

**Never include employer/company** unless user explicitly confirms it's appropriate.

---

## Phase 8 — Deployment

### Vercel deployment
```bash
VERCEL_TOKEN="vcp_..."
TEAM_ID="team_..."   # from /v2/user if on team, else omit
PROJECT_ID="prj_..."

# Create project (once)
curl -X POST "https://api.vercel.com/v1/projects?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"course-name","framework":"nextjs","gitRepository":{"type":"github","repo":"org/repo"}}'

# Trigger production deployment
curl -X POST "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"course-name","project":"PROJECT_ID","gitSource":{"type":"github","repo":"repo","org":"org","ref":"branch"},"target":"production"}'

# Poll until READY
curl "https://api.vercel.com/v13/deployments/DEPLOY_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

**Production alias** — if deployment lands as `preview`, explicitly assign:
```bash
curl -X POST "https://api.vercel.com/v2/deployments/DEPLOY_ID/aliases?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"alias":"course-name.vercel.app"}'
```

### GitHub push authentication
Use `x-access-token` format:
```bash
git remote set-url origin "https://x-access-token:PAT@github.com/ORG/REPO.git"
git push origin BRANCH
```
If credential helper intercepts, use GitHub Contents API directly for individual file pushes.

### Vercel env vars required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
VOYAGE_API_KEY              ← NOT Vonage (telecom) — double check spelling
```

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| MDX tables render as pipe text | remark-gfm not in MDXRemote options | Add `remarkPlugins: [remarkGfm]` to `options.mdxOptions` |
| Chat shows chunks/nodes but no text | Invalid model name | Use `claude-haiku-4-5-20251001` or `claude-sonnet-4-5-20251022` |
| SSE stream empty in browser | Proxy buffering | Add `X-Accel-Buffering: no` response header |
| Supabase build error | Module-level createClient | Use lazy init function pattern |
| `voyage-3-lite` 512 dim mismatch | Wrong model | Use `voyage-3` (1024 dims) |
| CTE type error in Postgres | `1.0` inferred as numeric | Cast: `1.0::double precision` |
| Vercel build fails ESLint | Unused variables | Fix all `no-unused-vars` before pushing |
| `workflow` scope 401 on push | PAT missing workflow scope | Regenerate PAT with repo + workflow scopes |
| GitHub credentials prompt blocks push | Credential helper | Use `x-access-token:PAT@github.com` URL format |

---

## Content quality checklist (per module)

- [ ] Frontmatter complete (id, slug, title, domain, hours, objectives, personas)
- [ ] All learning objectives at correct Bloom's level
- [ ] Comparison table present for any "X vs Y" topic
- [ ] Exam tip blockquote on each high-frequency exam topic
- [ ] Decision matrix: "when to use X vs Y" with clear criteria
- [ ] Code block for at least one CLI/config example
- [ ] Section headings follow `## N. Title` pattern (triggers GFM chunking in ingestion)

---

## Reference: module domain tags

| Domain | Use for |
|---|---|
| `design` | Architecture, connectivity, topology modules |
| `operations` | DNS, monitoring, observability modules |
| `security` | Firewalls, WAF, IAM, threat protection modules |
| `automation` | IaC, CDK, CloudFormation, CI/CD modules |
| `exam-prep` | Certification strategy, BGP deep-dive, capstone modules |
