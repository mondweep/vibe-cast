---
name: interactive-course-builder
description: >
  Build a comprehensive, interactive, production-grade online course from a topic brief.
  Use this skill whenever the user wants to create a course, learning platform, training
  curriculum, educational app, or any structured learning experience — even if they do not
  use the word "course". Triggers on: build a course, create training material, make an
  interactive learning platform, I want to teach X online, create a curriculum, build an
  educational tool, I need to train people on X, or anything implying structured knowledge
  delivery with quizzes, labs, or progress tracking. Always use this skill before designing
  any educational platform architecture or starting any course content planning.
---

# Interactive Course Builder

A comprehensive skill for creating production-grade interactive learning platforms with AI-powered tutoring, visual cheatsheets, analytics, privacy compliance, and full deployment — from concept to live URL.

## What this skill produces

- **10–12 content modules** authored in MDX with GFM tables, code blocks, exam tips
- **Interactive labs** — simulators, decision exercises, visual builders
- **AI Tutor** — GraphRAG chat with full Supabase persistence (sessions, messages, cost, geo)
- **Visual cheatsheets** — author-generated PNGs (Google NotebookLM recommended), gallery with lightbox
- **Progress tracking** — persona-adaptive, localStorage-backed, per-module
- **Analytics** — chat session tracking, topic frequency, cost per session, geo data
- **Privacy & consent** — GDPR-compliant consent gate with optional learner profile capture
- **About + attribution** page — author LinkedIn + GitHub, never employer unless confirmed
- **Persistent footer** — name + LinkedIn + GitHub + Privacy Policy on every page including homepage
- Deployed to **Vercel** from a **GitHub** orphan branch

---

## Phase 0 — Scoping

Ask the user for:
- **Topic** — domain/subject
- **Audience** — student / practitioner / teacher (or specific roles)
- **Certification alignment** — exam to target? (ANS-C01, CKA, PMP etc.)
- **Module count** — typically 8–12
- **Estimated hours** — total learning time
- **GitHub repo** — URL + PAT with `repo` and `workflow` scopes
- **Vercel account** — personal access token
- **Cheatsheet tool** — user generates PNGs externally (Google NotebookLM, Canva)
- **Author identity** — name + LinkedIn URL + GitHub URL (never ask for employer)

Create Linear project with 5 milestones if Linear MCP is connected.

Produce PRD as interactive React artifact covering: personas, module map, DDD contexts, TDD strategy, ADRs, analytics strategy, privacy strategy, phase plan, risk register.

---

## Phase 1 — GitHub & Scaffold

### PAT authentication — always use x-access-token format
```bash
git remote set-url origin "https://x-access-token:PAT@github.com/ORG/REPO.git"
```
If credential helper still intercepts, use GitHub Contents API to push individual files.

### Orphan branch setup
```bash
git clone https://x-access-token:PAT@github.com/ORG/REPO.git
cd REPO
git checkout --orphan COURSE-NAME
git rm -rf .
git add README.md && git commit -m "chore: initialise COURSE-NAME orphan branch"
git push origin COURSE-NAME
```

### Key package.json rules
- `next-mdx-remote@6.0.0` exactly — v4/v5 blocked by Vercel vulnerability gate
- `tsconfig.json` must have `"exclude": ["node_modules", "scripts"]` — scripts/ contains ingestion CLI, causes build errors if included

### Directory structure
```
src/
  app/
    layout.tsx              ← root layout: wraps ALL children in ConsentGate
    page.tsx                ← homepage with persistent footer
    dashboard/ learn/ modules/[slug]/ labs/ cheatsheets/ about/
    privacy/page.tsx        ← accessible WITHOUT consent (user must read before accepting)
    api/
      chat/route.ts         ← GraphRAG + Claude + Supabase persistence
      profile/route.ts      ← optional learner profile save
  components/
    ui/                     ← Button, Badge, Progress (shadcn)
    course/
      ModuleViewer.tsx      ← MDXRemote with remarkGfm + rehypeSlug
      cheatsheet-gallery.tsx← lightbox, keyboard nav
      mdx/MdxComponents.tsx ← MUST include thead/tbody/tr
    chat/CourseChat.tsx     ← maximisable, sessionStorage key
    layout/
      CourseLayout.tsx      ← sidebar + persistent footer on all inner pages
      ConsentGate.tsx       ← wraps entire app in root layout
  lib/
    knowledge/ontology.ts   ← NODES[] + EDGES[] typed arrays
    rag/retrieval.ts        ← lazy Supabase init (NEVER module-level)
docs/
  adr/                      ← ADR-001 to ADR-007
  content/                  ← LinkedIn post + article
  skill/                    ← this SKILL.md
supabase/migrations/
  001_graphrag_schema.sql
  002_chat_analytics.sql
  003_learner_profiles.sql
scripts/ingest.ts           ← excluded from tsconfig
public/images/cheatsheets/M01/ through M10/
```

---

## Phase 2 — Design System & Layout

### Colour tokens
```css
--primary: 35 100% 50%      /* amber/orange */
--background: 213 35% 7%    /* dark navy */
--card: 213 30% 12%
```

### Sidebar order
Dashboard ⊞ → My Path ◈ → Labs ⬡ → Cheatsheets ◫ → About ◉

### Persistent footer — EVERY page including homepage
```
Created by [Author Name → LinkedIn] | LinkedIn icon | GitHub icon | Privacy Policy
```
**Both** the homepage (`page.tsx`) and CourseLayout footer must have the Privacy Policy link.

### MdxComponents — critical table rule
Without `thead`, `tbody`, `tr` components, GFM tables render as raw pipe text:
```tsx
table: (p) => <div className="overflow-x-auto ..."><table {...p} /></div>,
thead: (p) => <thead className="bg-muted/60" {...p} />,
tbody: (p) => <tbody className="divide-y divide-border" {...p} />,
tr:    (p) => <tr className="hover:bg-muted/20" {...p} />,
th:    (p) => <th className="px-4 py-2.5 font-semibold ..." {...p} />,
td:    (p) => <td className="px-4 py-2.5 ..." {...p} />,
```
And in ModuleViewer pass options to MDXRemote:
```tsx
const MDX_OPTIONS = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  },
};
```

### Chat component (CourseChat.tsx)
```
Maximise toggle: ⊞ / ⊡ in header
Normal:    fixed bottom-6 right-6 w-[440px] h-[620px]
Maximised: fixed inset-4 (fills viewport with 16px margin)

Dark theme:
  Panel:    bg-[#111827]
  User msg: bg-primary text-[#0D1117]
  AI msg:   bg-[#1e2d3d] border-[#2a3f55] text-slate-100

react-markdown + remark-gfm inside chat bubbles — required for table rendering
Error SSE events must render visibly, never silently swallowed
sessionKey from sessionStorage passed in every fetch body
```

---

## Phase 3 — Content Authoring

### MDX frontmatter
```yaml
---
id: "01"
slug: "module-slug"
title: "Module Title"
domain: design | operations | security | automation | exam-prep
estimatedHours: 6
prerequisites: []
objectives:
  - id: o1
    description: "..."
    bloomsLevel: create | evaluate | analyse | apply | understand | remember
personas: ["student", "teacher", "practitioner"]
---
```

### Content rules
- Section headings: `## N. Title` pattern — drives ingestion chunking
- GFM comparison tables for all "X vs Y" topics
- Exam tip: `> **Exam tip (CERT):** text`
- Decision matrix: "when to use X vs Y"

### Cheatsheets
Generate with **Google NotebookLM** — upload module MDX as source, export as PNG.
Claude does not generate cheatsheet images.
Upload to `public/images/cheatsheets/M0X/M0X-title-cheatsheet.png`.

---

## Phase 4 — Interactive Labs

Three types minimum:

1. **Visual Builder** — user designs/configures, validate against rules, show output
2. **Algorithm Simulator** — user adjusts inputs, sees which step determined winner
3. **Scenario Exercise** — MCQ with explanations for ALL options (correct + incorrect)

---

## Phase 5 — AI Tutor (GraphRAG)

### Supabase migrations (run in SQL Editor in order)

**001_graphrag_schema.sql:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- Tables: kg_nodes, kg_edges, content_chunks (vector(1024)), chat_sessions, chat_messages

-- Critical: recursive CTE weight must be explicitly cast
1.0::double precision AS weight
(e.weight * gt.weight)::double precision

-- Critical: IVFFlat has no IF NOT EXISTS — use DO block
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chunks_embedding') THEN
    CREATE INDEX idx_chunks_embedding ON content_chunks
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
  END IF;
END $$;

-- Critical: always DROP POLICY IF EXISTS before CREATE POLICY
DO $$ BEGIN DROP POLICY IF EXISTS "..." ON t; END $$;
CREATE POLICY "..." ON t FOR SELECT USING (true);
```

**002_chat_analytics.sql:**
```sql
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS total_cost_usd FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create views: session_summary, topic_frequency, cost_by_country
-- Views show UNRESTRICTED in Supabase dashboard — this is NORMAL
-- Views inherit RLS from underlying tables; no action needed
```

**003_learner_profiles.sql:**
```sql
CREATE TABLE IF NOT EXISTS learner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE, name TEXT, linkedin_url TEXT,
  wants_updates BOOLEAN DEFAULT false,
  country TEXT, source TEXT DEFAULT 'consent_gate',
  consented_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: service_role full access, anon insert-only
-- View: outreach_list WHERE wants_updates = true
```

### Ontology (ontology.ts)
Node types: `AWSService | Concept | Protocol | Pattern | ExamTopic | Module | Lesson`
Edge relations: `USES | REQUIRES | ENABLES | COMPARED_TO | PART_OF | PREREQUISITE_OF | APPEARS_IN | CONFIGURES | SECURES | MONITORS`

### Lazy init — ALWAYS
```typescript
let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient(url, key);
  return _supabase;
}
// NEVER at module level — Next.js static analysis runs modules at build without env vars
```

### Chat API route — CRITICAL architecture

**Save BEFORE streaming, not after:**
```typescript
// WRONG — Vercel terminates function once response sent; post-stream code never runs:
for await (const chunk of stream) { ... }
controller.close()
await saveToSupabase()    // ← NEVER EXECUTES

// CORRECT — non-streaming API, save first, then replay as SSE:
const response = await client.messages.create({ ... })   // non-streaming
await saveMessages(response)                              // save FIRST
// Then stream response.content text to client in chunks
```

**Required route exports:**
```typescript
export const dynamic    = "force-dynamic";
export const runtime    = "nodejs";
export const maxDuration = 60;   // NOT 30 — allow retrieval + LLM + Supabase save

// Response headers:
"X-Accel-Buffering": "no"   // prevents Vercel proxy buffering SSE
```

**What to save:**
```typescript
// chat_sessions (upsert on session_key):
{ session_key, persona, module_id, country, city, region, updated_at }
// Geo: req.headers.get("x-vercel-ip-country/city/region")  — free on all Vercel plans

// chat_messages (insert × 2 — user + assistant):
// context JSONB includes: topics[], chunk_count, graph_nodes, input_tokens, output_tokens, cost_usd

// Cost (Haiku 4.5):
const cost = (input_tokens / 1_000_000) + (output_tokens * 5 / 1_000_000)
```

### Session key (client side)
```typescript
const [sessionKey] = useState(() => {
  const stored = sessionStorage.getItem("chat-session-key");
  if (stored) return stored;
  const key = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem("chat-session-key", key);
  return key;
});
// Pass sessionKey in every fetch body → stable per-browser-session Supabase row
```

### Embedding model
`voyage-3` = 1024 dimensions ✓
`voyage-3-lite` = 512 dimensions — will fail with `vector(1024)` column

### Ingestion
- Run locally only — Voyage AI DNS blocked in most sandbox environments
- Clear tables before first run (functional unique index blocks naive upsert)
- Rate limit: 22s delay between Voyage API calls on free tier (3 RPM)

### Analytics queries
```sql
SELECT * FROM topic_frequency LIMIT 20;     -- most asked concepts
SELECT * FROM cost_by_country;              -- spend by geo
SELECT * FROM session_summary ORDER BY created_at DESC;
SELECT * FROM outreach_list;                -- opted-in learners
```

---

## Phase 6 — Cheatsheets

Structure: `public/images/cheatsheets/M01/` through `M10/` with `.gitkeep` placeholders.
Gallery: lightbox, ← → keyboard nav, Esc to close, full-size download link.
Sidebar: `Cheatsheets ◫` after Labs.

---

## Phase 7 — Privacy, Consent & Learner Capture

### ConsentGate
Wraps entire app in `root layout.tsx` (not CourseLayout — must cover homepage too).
localStorage key: `"aws-course-privacy-consent-v1"`

Modal shows:
- Data collection summary (what + why)
- Collapsible "Stay in the loop" section — **hidden by default** for low friction
- Optional fields: Name, Email, LinkedIn URL
- Marketing checkbox: "Yes, notify me about new modules"
- Profile save is non-blocking — consent proceeds even if /api/profile fails

Re-test: clear `aws-course-privacy-consent-v1` from localStorage → modal reappears.

### Privacy policy page (/privacy)
Must be accessible WITHOUT consent.
Cover: data collected, legal basis, third-party processors (Anthropic/Voyage AI/Supabase), 12-month retention, user rights (access/rectification/erasure/portability/objection), no tracking cookies, 16+ platform.
Link to Privacy Policy from ALL footers.

### Learner profile API (/api/profile)
Upserts on email to prevent duplicates on re-consent.
All fields nullable — non-blocking if Supabase unavailable.

### Spend control — inform user
Budget limits are **workspace-level**, not API key-level.
**Anthropic Console → Workspaces → [workspace] → Limits tab → Change Limit**
Recommend: $10–$25/month cap + 80% email notification.

---

## Phase 8 — About & Attribution

Sections: Hero → How to use → Features (max 6) → Course scope → Built with → Author credit
Author card: name + LinkedIn + GitHub + community context.
**NEVER include employer** unless user explicitly confirms it is appropriate.

---

## Phase 9 — Deployment

### Vercel env vars
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      ← NEVER prefix with NEXT_PUBLIC_
ANTHROPIC_API_KEY
VOYAGE_API_KEY                 ← NOT "VONAGE" — verify spelling every time
```

### Deployment commands
```bash
# Deploy to production
curl -X POST "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"course-name","project":"PID","gitSource":{"type":"github","repo":"r","org":"o","ref":"branch"},"target":"production"}'

# Poll (15s intervals)
curl "https://api.vercel.com/v13/deployments/DEPLOY_ID" -H "Authorization: Bearer $VERCEL_TOKEN"

# Force production alias if needed
curl -X POST "https://api.vercel.com/v2/deployments/DEPLOY_ID/aliases?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -d '{"alias":"name.vercel.app"}'
```

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| MDX tables render as pipe text | remark-gfm not in MDXRemote options | Add `remarkPlugins: [remarkGfm]` to `options.mdxOptions` |
| Chat tables render as pipe text | react-markdown missing remark-gfm | `<ReactMarkdown remarkPlugins={[remarkGfm]}>` |
| Chat shows chunks/nodes but empty response | Invalid Anthropic model name | Use `claude-haiku-4-5-20251001` |
| SSE empty in browser | Proxy buffering | Add `"X-Accel-Buffering": "no"` header |
| Supabase build error | Module-level createClient | Lazy init function pattern |
| `voyage-3-lite` dim mismatch | 512 dims vs vector(1024) | Switch to `voyage-3` |
| Postgres CTE type error | `1.0` inferred as numeric | Cast: `1.0::double precision` on both CTE weight columns |
| **Supabase tables always empty** | **Vercel kills function after response sent** | **Save to Supabase BEFORE streaming, not after controller.close()** |
| Unique constraint on upsert | Functional index not usable as onConflict | Clear tables first OR use `ignoreDuplicates: true` |
| Build fails ESLint | Unused variables / catch(err) unused | Fix all `no-unused-vars`; `catch (err)` → `catch {` when err unused |
| `workflow` scope 401 | PAT missing scope | Regenerate with `repo` + `workflow` scopes |
| Git push blocked | Credential helper intercepts | `git remote set-url origin "https://x-access-token:PAT@github.com/..."` |
| UNRESTRICTED in Supabase | Views don't have RLS policies | Normal — views inherit security from underlying tables |
| next-mdx-remote version error | v4/v5 blocked by Vercel | Use `next-mdx-remote@6.0.0` |
| Consent gate always shows | localStorage key mismatch | Verify key is `"aws-course-privacy-consent-v1"` |
| Profile not saving | Table doesn't exist yet | Run migration 003 in Supabase SQL Editor |
| Spend limit not found | Looking in wrong place | Workspace level not API key level: Console → Workspaces → Limits |

---

## Launch checklist

### Supabase
- [ ] Migration 001 run (knowledge graph + vector store)
- [ ] Migration 002 run (chat analytics columns + views)
- [ ] Migration 003 run (learner profiles)
- [ ] `npm run ingest` run locally to populate content_chunks
- [ ] Verify: `SELECT COUNT(*) FROM kg_nodes` ~60-70, `SELECT COUNT(*) FROM content_chunks` ~60+

### Vercel
- [ ] All 5 env vars set (check VOYAGE not VONAGE)
- [ ] SUPABASE_SERVICE_ROLE_KEY not prefixed NEXT_PUBLIC_
- [ ] Workspace spend limit set in Anthropic Console
- [ ] Spend notification at 80%

### GitHub
- [ ] `docs/skill/` contains SKILL.md
- [ ] `docs/content/` contains LinkedIn post + article
- [ ] `public/images/cheatsheets/M01–M10/` populated with PNGs

### Privacy
- [ ] `/privacy` accessible without consent
- [ ] Privacy Policy link in homepage footer
- [ ] Privacy Policy link in CourseLayout footer
- [ ] ConsentGate in root layout (not CourseLayout)
- [ ] Re-test consent gate by clearing localStorage key

### Content (per module)
- [ ] Frontmatter complete (id, slug, title, domain, hours, objectives, personas)
- [ ] Comparison table for every X vs Y topic
- [ ] Exam tip blockquote on high-frequency topics
- [ ] Decision matrix with clear criteria
- [ ] Section headings follow `## N. Title` pattern

---

## Reference

### Module domain tags
| Domain | Use for |
|---|---|
| `design` | Architecture, connectivity, topology |
| `operations` | DNS, monitoring, observability |
| `security` | Firewalls, WAF, IAM, threat protection |
| `automation` | IaC, CDK, CloudFormation, CI/CD |
| `exam-prep` | Certification strategy, algorithm deep-dives, capstone |

### Analytics views
| View | Shows |
|---|---|
| `session_summary` | Per-session: persona, module, geo, cost, top topic |
| `topic_frequency` | Ranked: most asked-about concepts across all sessions |
| `cost_by_country` | Spend + session count by learner country |
| `outreach_list` | Learners who opted into updates (name, email, LinkedIn) |

### Cost reference (Claude Haiku 4.5)
| | |
|---|---|
| Input | $1.00 / million tokens |
| Output | $5.00 / million tokens |
| Typical question | ~$0.004 (2,050 input + 400 output tokens) |
| 300 questions/month | ~$1.23 |
| 2,000 questions/month | ~$8.20 |
