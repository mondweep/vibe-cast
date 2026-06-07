# ADR-014: Ruflo Knowledge Graph & In-App AI Tutor

**Status:** PROPOSED (2026-06-07)
**Context:** Builds on ADR-013 (Learning Domain). Lesson content v1 exists; this makes accuracy *structural* and adds a tutor.
**Deciders:** (pending) Product owner, Architecture team
**Methodology:** SPARC + DDD + TDD; tiered models (Opus graph / Sonnet prose / Haiku glue)

---

## Problem

ADR-013 Phase 5 authored 12 lesson bodies by having 12 agents each re-derive Ruflo accuracy from source, with a reviewer as the safety net. That works but is **redundant** (12× the judgment, 12× the drift risk), and the knowledge is **locked inside prose** — it can't be queried, reused, or kept consistent as Ruflo evolves.

We want to:
1. Make Ruflo accuracy a **property of a shared, cited knowledge graph** rather than per-agent luck (the "Opus thinks → builds a knowledge representation → cheaper models build from it" pattern).
2. **Regenerate / upgrade** lessons cheaply and consistently from that graph.
3. Power an **in-app AI tutor** that answers learner questions grounded in the graph (GraphRAG), with citations and prerequisite awareness — no hallucinated APIs.

---

## Decision

Build a **Ruflo Knowledge Graph (KG)** in Supabase (the app DB), use **pgvector 0.8.0** (confirmed installed) for semantic retrieval, author it with **Opus**, and consume it for (a) lesson regeneration via **Sonnet** workers and (b) a **GraphRAG tutor**.

### 1. Graph schema (property graph in `ruflo_demo`)

Migration `005_create_knowledge_graph.sql` adds:

```
ruflo_demo_kg_node
 ├─ node_id UUID PK
 ├─ kind        TEXT   -- concept | command | mcp_tool | agent_type | topology
 │                     -- | pattern | example | term | capability
 ├─ name        TEXT   -- canonical name (e.g. "swarm init", "mesh topology")
 ├─ aliases     TEXT[] -- synonyms for retrieval
 ├─ summary     TEXT   -- 1-2 sentence definition (used in tutor context)
 ├─ body        TEXT   -- detailed explanation (markdown)
 ├─ source_refs JSONB  -- [{file, lines, quote}] citations into ruvnet/ruflo
 ├─ embedding   vector(384)  -- MiniLM-L6-v2 (ruvector/AgentDB, local ONNX)
 └─ created_at/updated_at

ruflo_demo_kg_edge
 ├─ edge_id UUID PK
 ├─ from_node UUID, to_node UUID
 ├─ relation  TEXT  -- prerequisite_of | part_of | used_by | example_of
 │                  -- | related_to | alternative_to | teaches | depends_on
 ├─ weight    REAL  -- optional ranking
 └─ UNIQUE(from_node, to_node, relation)

ruflo_demo_lesson_concept   -- which concepts a lesson teaches (Lesson↔Node)
 ├─ lesson_id UUID, node_id UUID, UNIQUE(lesson_id, node_id)
```

- **Embeddings**: 384-dim MiniLM via the ecosystem's `ruvector`/AgentDB (local ONNX, no API key), so both indexing and query-time embedding are consistent. IVFFlat/HNSW index on `embedding` for cosine search; `pg_trgm` (enable) for hybrid keyword match.
- RLS: KG is **public read** (it's reference data, like the catalog); writes are `service_role` only — same pattern as the lesson catalog.

### 2. Build pipeline (Opus authors the graph) — Phase KG-2

A multi-agent workflow over the clone at `/tmp/ruflo-src`:
- **Extract nodes** (Opus): partitioned by kind (commands, MCP tools, agents, topologies, concepts, patterns), each node cited to source. Reuse the ADR-013 indexers' output as a seed.
- **Extract edges** (Opus): relations between nodes (prerequisite/part-of/used-by/example-of), validated so no edge points at a missing node.
- **Embed** (Haiku/glue): generate `vector(384)` for each node's `name + summary`.
- **Validate**: citations resolve to real files; no orphan edges; dedupe by name+kind.
- Persisted to `kg_node`/`kg_edge` via `service_role` (a proper key in env, or MCP).

### 3. Lesson regeneration from the KG — Phase KG-5

Lessons become **views assembled from verified nodes**. Each lesson links to its concept nodes (`lesson_concept` via `teaches` edges). **Sonnet** workers author prose by querying the lesson's subgraph — they cite node IDs and **cannot invent APIs** because every claim must map to a node. This replaces the v1 "re-derive from source" approach; upgrades = re-run after the graph updates.

### 4. AI Tutor (GraphRAG) — Phase KG-3 / KG-4

- **Backend** `POST /api/v1/tutor/ask` `{ question, context?: { lessonId|pathId } }` (authenticated via the Supabase JWT bridge from the auth fix):
  1. Embed the question (ruvector, 384-dim).
  2. Vector search `kg_node` (top-k) + optional `pg_trgm` keyword blend (hybrid).
  3. Traverse `kg_edge` 1–2 hops to gather the neighborhood subgraph.
  4. Assemble grounded context (node summaries/bodies + `source_refs` + linked lessons).
  5. **Sonnet** answers strictly from that context, with citations; **refuses/flags** if the answer isn't in the graph (anti-hallucination guardrail). Opus reserved for hard multi-hop questions.
  6. Returns `{ answer, citations: [{node, source_refs, lessonLinks}], suggestedNext }`.
- **Frontend**: a context-aware tutor chat drawer on lesson/path pages (knows the current lesson), rendering answers + citation chips that deep-link to lessons and source.

### 5. Model routing (per your decision)

| Work | Model | Why |
|---|---|---|
| Graph node/edge authoring | **Opus** | correctness-critical, judgment-heavy, done once |
| Lesson prose / default tutor answers | **Sonnet** | strong writing from pre-verified nodes |
| Embedding orchestration, formatting, validation glue | **Haiku** | mechanical |
| Hard multi-hop tutor reasoning | **Opus** (selective) | escalation only |

---

## Phased plan

| Phase | Deliverable |
|---|---|
| **KG-1** | This ADR + schema (no code) |
| **KG-2** | Migration `005` + Opus build workflow → populated `kg_node`/`kg_edge` + embeddings |
| **KG-3** | Backend KG query API + `POST /tutor/ask` (GraphRAG, guardrailed) |
| **KG-4** | Frontend tutor drawer (context-aware, citations) |
| **KG-5** | Regenerate lessons from the KG with Sonnet (upgrade v1 → v2) |

---

## Consequences

### Positive
✅ Accuracy becomes structural (cite-or-refuse), not per-agent luck.
✅ One reusable asset powers lessons *and* the tutor *and* "what to learn next" navigation.
✅ Everything stays in Supabase + pgvector — no new infra; reuses the repaired backend + auth bridge.
✅ Cheaper/faster lesson upgrades (Sonnet assembles from nodes).

### Tradeoffs / risks
⚠️ **Graph staleness**: Ruflo evolves; needs a refresh job (re-run KG-2 against a fresh clone) — track as a maintenance worker.
⚠️ **Embedding consistency**: index-time and query-time must use the *same* model (384-dim MiniLM) or retrieval degrades.
⚠️ **Tutor guardrails**: must hard-refuse out-of-graph answers; verify with adversarial prompts.
⚠️ **service_role for writes**: KG build needs a real secret key in env (or MCP) — the brief temp-grant hack used for lessons is not appropriate for repeated graph builds.

---

## Alternatives considered

1. **Keep per-agent re-derivation (ADR-013 style), no graph** — Rejected: no reuse, no tutor, accuracy stays probabilistic.
2. **External graph DB (Neo4j) / external vector DB** — Rejected: adds infra; pgvector + edge tables cover our scale (hundreds of nodes).
3. **Pure vector RAG (no graph edges)** — Rejected: loses prerequisite/part-of structure that powers navigation and multi-hop tutor answers; GraphRAG > flat RAG here.
4. **AgentDB/ruvector as the system of record** — Use ruvector for *embedding generation*, but keep the graph in Supabase so the app's API/RLS/SQL apply uniformly.

---

## Implementation checklist (KG-2 entry)
- [ ] Approve ADR + schema
- [ ] Migration `005`: `kg_node` (+`vector(384)` + index), `kg_edge`, `lesson_concept`; enable `pg_trgm`; RLS public-read/service-write
- [ ] Obtain a `service_role` key in env (replaces temp-grant) for graph writes
- [ ] Opus build workflow: extract nodes (by kind, cited) → edges → embed → validate
- [ ] Backend: KG query repo + `POST /tutor/ask` GraphRAG (hybrid retrieve → traverse → grounded answer → citations) with refuse-if-not-in-graph
- [ ] Frontend: tutor drawer (context-aware) + citation deep-links
- [ ] Regenerate lessons from KG (Sonnet), diff against v1
- [ ] Maintenance: KG refresh worker on Ruflo updates

---

## Related decisions
- **ADR-013:** Learning Domain (lessons the KG will regenerate)
- **ADR-011:** CQRS read models (schema conventions reused)
- **Source:** ruvnet/ruflo (graph ground truth)
- **Tooling:** ruflo-knowledge-graph (kg-extract/kg-traverse), ruflo-rag-memory, AgentDB/HNSW, ruvector

**Review date:** after KG-2 (graph populated) — validate node accuracy + retrieval quality before building the tutor UI.
