# How I Built a Production-Grade AWS Networking Course Platform — With an AI Tutor, Interactive Labs, and GraphRAG

*By Mondweep Chakravorty*

---

## The starting point

I wanted to create something better than a slide deck or a PDF guide for AWS Advanced Networking. Not a video course you passively watch. Not a static documentation site you skim and forget. Something that genuinely adapts to who you are — whether you're a student preparing for the ANS-C01 exam, a practitioner who needs a quick reference, or a teacher looking for a structured curriculum to deliver.

What I ended up building is a fully deployed, open-source interactive learning platform with 10 deep-dive modules, three interactive labs, twelve visual cheatsheets, progress tracking, and an AI tutor that answers questions using the actual course content — not just general knowledge about AWS.

This article is the story of how it came together: the decisions, the architecture, the tools, and the things that surprised me along the way.

---

## Designing for three personas simultaneously

The first architectural decision was also the most important one. AWS networking content is simultaneously:
- Too detailed for beginners if you include everything
- Too shallow for practitioners if you simplify too much
- Too exam-focused for professionals if you over-optimise for ANS-C01

The solution was a **persona-adaptive system**. On entry, learners select a role: Student, Teacher, or Practitioner. The dashboard, module ordering, and content emphasis adapt accordingly. The underlying content is the same — ten modules, 61 hours of material — but the experience of navigating it changes.

Students follow a structured prerequisite-ordered path starting from VPC fundamentals. Practitioners can jump directly to any module. Teachers get the same depth plus callouts that surface teaching angles and discussion prompts.

This wasn't just a UX decision. It shaped the entire domain model.

---

## Engineering the right way: DDD, TDD, and ADRs

I used **Domain-Driven Design** to structure the codebase into four bounded contexts:

- **Course** — Module and Lesson entities, the repository for reading MDX content
- **Learner** — Persona selection, profile, and learning path generation
- **Progress** — Idempotent completion tracking (marking a lesson complete twice is safe)
- **Assessment** — Quiz attempts, scoring, and score history

Each context owns its own entities, events, and service layer. There's no coupling between them at the domain level — they communicate through application-layer services.

I followed the **London School of TDD** (outside-in, starting from acceptance tests): Playwright E2E tests defined the behaviour first, then Jest unit tests validated each domain service in isolation. The CI pipeline enforces an 80% coverage gate before any deployment.

Seven **Architecture Decision Records** (ADR-001 through ADR-007) document every significant choice: why Next.js App Router over Pages, why MDX over a headless CMS, why Supabase over a managed vector database, why Vercel over Netlify. These records exist so that future maintainers — including future me — understand the reasoning, not just the outcome.

---

## The content: 10 modules, 61 hours, ANS-C01 aligned

Each module is a **MDX file** — Markdown with embedded React components. This was a deliberate choice over a headless CMS like Contentful or Sanity. MDX lives in the Git repository alongside the code. It versions together with the codebase. It can be reviewed in pull requests. It doesn't require a separate subscription or API call to render.

The ten modules cover:

1. **VPC Deep Dive** — CIDR planning, subnet design, route tables, peering vs Transit Gateway
2. **Hybrid Connectivity** — Direct Connect, BGP, Site-to-Site VPN, redundancy models
3. **Transit Gateway & PrivateLink** — Hub-spoke architecture, centralised egress, GWLB inspection
4. **DNS & Route 53** — All seven routing policies, health checks, private hosted zones, DNSSEC
5. **Load Balancing & CDN** — ALB vs NLB vs GWLB, CloudFront, Global Accelerator
6. **Network Security** — Security Groups vs NACLs, Network Firewall, WAF, Shield, defence-in-depth
7. **Monitoring & Troubleshooting** — VPC Flow Logs, Reachability Analyzer, CloudWatch networking
8. **Network Automation** — CloudFormation, CDK, event-driven remediation, Config rules
9. **Multi-Account Architecture** — AWS Organizations, RAM, TGW at scale, VPC Sharing, IPv6
10. **BGP & Exam Mastery** — Full 9-step BGP path selection algorithm, communities, MED, exam strategy

Each module follows a consistent structure: a set of learning objectives mapped to Bloom's Taxonomy, numbered sections with comparison tables and CLI examples, exam tip callouts in distinctive amber blockquotes, and a decision matrix. The decision matrix — "when to use X vs Y" — is the section practitioners find most useful and students remember longest in exams.

---

## The cheatsheets: Google NotebookLM as a design tool

One of the most time-efficient parts of the whole project was generating the visual cheatsheets — and it came from an unexpected direction.

I used **Google NotebookLM** to synthesise each module's key concepts into a dense visual one-pager, then exported them as PNG files. NotebookLM's ability to distil a large body of source material into structured summaries made it ideal for cheatsheet generation: I provided the module content as source material and prompted it to produce a reference card covering services, decision criteria, comparison tables, and exam traps.

The resulting PNGs live in a structured folder in the GitHub repository (`public/images/cheatsheets/M01/` through `M10/`) and are served directly by Vercel's static hosting — no CDN configuration, no image processing pipeline. Just files in a folder, available at a predictable URL. The cheatsheets page in the app provides a full-screen lightbox with keyboard navigation and a direct download link.

---

## The interactive labs

Static content teaches concepts. Labs build intuition.

Three labs ship with the platform:

**VPC Builder** — A drag-and-drop subnet design tool where learners allocate subnets across availability zones, assign route tables, and validate their architecture against a set of constraints. It previews the resulting route table entries and flags common mistakes like missing return routes.

**BGP Path Simulator** — A full implementation of the nine-step BGP path selection algorithm. Learners adjust attributes (Weight, Local Preference, AS_PATH length, MED) and the simulator shows which route wins and which step in the algorithm was decisive. This is the single highest-value exercise for ANS-C01 preparation.

**Scenario Exercises** — Multi-step architecture decision scenarios with four-option multiple choice. Explanations appear for both correct and incorrect answers, so learners understand not just what the right answer is, but why the alternatives are wrong.

---

## The AI Tutor: GraphRAG in practice

This is the part that genuinely surprised me in terms of what became possible.

The AI Tutor uses a **GraphRAG** (Graph-augmented Retrieval-Augmented Generation) pipeline. When a learner asks a question, two things happen simultaneously:

**Vector search:** The question is embedded using Voyage AI's `voyage-3` model (1024 dimensions) and compared against all content chunks from the ten modules stored in Supabase with pgvector. The top matching chunks are retrieved by cosine similarity.

**Graph traversal:** The question is scanned for entity mentions — AWS services, networking concepts, exam topics. Matched entities seed a two-hop neighbourhood traversal across a knowledge graph of 67 nodes and 69 typed edges. This surfaces related concepts the vector search might miss — for example, asking about Direct Connect retrieves BGP path selection even if those words don't appear in the question.

Both results are fused into a context block and passed to **Claude Haiku 4.5** along with the system prompt. The model generates a streaming response that appears word-by-word in the chat panel.

The knowledge graph was hand-crafted as a TypeScript ontology file (`ontology.ts`) with typed nodes (AWSService, Concept, Protocol, Pattern, ExamTopic, Module) and typed edges (USES, REQUIRES, ENABLES, COMPARED_TO, PART_OF, PREREQUISITE_OF, CONFIGURES, SECURES, MONITORS). This explicit semantic structure is what separates GraphRAG from naive RAG — the model understands that Direct Connect USES BGP, that Transit Gateway ENABLES Hub-Spoke architecture, that Network Firewall PART_OF Defence-in-Depth.

Every AI response shows the learner how many content chunks and graph nodes contributed to the answer. This transparency matters: learners know the AI is grounded in course content, not hallucinating from general AWS knowledge.

The chat panel is maximisable — a single click expands it to fill the screen for longer, more complex responses.

---

## The deployment stack

**Supabase** handles the vector store and knowledge graph. The schema is fully idempotent — every `CREATE TABLE`, index, and RLS policy is safe to re-run from scratch. Row Level Security ensures the anon key (used in the browser) can only read course content, while the service role key (used only server-side) has write access for ingestion.

**Vercel** handles deployment from the GitHub repository's orphan branch. The course lives on `aws-advanced-networking.vercel.app` and deploys automatically on every push to the branch. Environment variables — Supabase credentials, Anthropic API key, Voyage AI key — are set in the Vercel dashboard.

**Next.js 14 App Router** runs server components for module rendering (MDX compilation happens server-side), client components for progress tracking and chat, and API routes for the streaming chat endpoint.

One build-time constraint worth noting: **all external client initialisations must be lazy**. If you initialise a Supabase client or Anthropic instance at module level in a Next.js App Router project, the static analysis phase during build will attempt to execute that code without environment variables present and fail. Every external client in this codebase is initialised inside a function, on first call.

---

## What I'd do differently

**Content ingestion should run locally from day one.** The Voyage AI embedding API is blocked from cloud sandbox environments, so the content chunk ingestion that populates Supabase with searchable module content has to be run locally. The script is ready — `npm run ingest` — but it requires local setup. Future iterations should include a GitHub Actions workflow that runs ingestion automatically after content changes.

**Prompt caching** would significantly reduce the cost of the AI tutor. The system prompt and retrieved context could be cached at the Anthropic API level, cutting input token costs by up to 90% for returning users who ask follow-up questions.

**A password gate on the chat** would give the author visibility and cost control. The retrieval pipeline is free, but every AI response consumes Anthropic API tokens. A simple shared password — one environment variable, one header check — would ensure only intended learners can use the tutor.

---

## The numbers

| Component | Scale |
|---|---|
| Modules | 10 |
| Total content | 61 hours |
| Cheatsheets | 12 (10 module + 2 overview) |
| Knowledge graph nodes | 67 |
| Knowledge graph edges | 69 |
| Interactive labs | 3 |
| Bloom's Taxonomy levels covered | 6 |
| Deployment target | ANS-C01 (AWS Advanced Networking Specialty) |
| Cost per AI tutor question | ~$0.004 (half a US cent) |

---

## Try it

The platform is live and open source.

🌐 **Live platform:** https://aws-advanced-networking.vercel.app

📦 **Source code:** https://github.com/mondweep/vibe-cast/tree/aws-advanced-networking

The AI tutor is available on every page. The cheatsheets are downloadable. The labs are interactive. If you're studying for ANS-C01, preparing to teach AWS networking, or just exploring what a GraphRAG-powered learning platform looks like in practice — go explore.

And if you want to build something similar, the architecture is fully documented in the ADRs. Everything described in this article is in the codebase.

---

*Mondweep Chakravorty is a cloud practitioner and co-lead of the Agentics Foundation London Chapter, focused on agentic AI and automation.*

*Connect: [linkedin.com/in/mondweepchakravorty](https://www.linkedin.com/in/mondweepchakravorty/)*
