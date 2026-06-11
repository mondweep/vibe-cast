# Knowledge Graph + AI Tutor — the content engine

This is the most distinctive part of the proven build (vibe-cast, ADR-014). On
vibe-cast the **Knowledge Graph (KG) is the source of truth that lessons are
generated *from***, and it powers an in-app **GraphRAG tutor**. Treat the KG as
the *content engine*, not an optional decoration.

Core pattern: **Opus authors a verified, cited graph → cheaper models assemble
lessons and tutor answers *from* it → nothing can invent an API** because every
claim must map to a graph node. This makes accuracy *structural* (cite-or-refuse)
instead of per-agent luck.

Apply this whole file whenever `config.knowledge_graph.enabled: true` (and the
tutor parts whenever `config.ai_tutor.enabled: true`).

---

## 1. Graph schema (property graph in the platform DB)

Three tables, all `{{prefix}}`-prefixed, `pgvector` + `pg_trgm` enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Nodes: the verified, cited concepts (public read; service write)
CREATE TABLE IF NOT EXISTS {{prefix}}kg_node (
  node_id     UUID PRIMARY KEY,
  kind        VARCHAR(32) NOT NULL,   -- domain taxonomy: concept|term|... (define per subject)
  name        VARCHAR(255) NOT NULL,
  aliases     TEXT[]  NOT NULL DEFAULT '{}',   -- synonyms, improve retrieval recall
  summary     TEXT    NOT NULL DEFAULT '',     -- 1-2 sentences, used in tutor context
  body        TEXT    NOT NULL DEFAULT '',     -- detailed markdown explanation
  source_refs JSONB   NOT NULL DEFAULT '[]',   -- [{file, lines, quote}] citations into ground truth
  embedding   vector(384),                     -- MiniLM-L6-v2; nullable until backfill
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP DEFAULT now(),
  UNIQUE (kind, name)
);
CREATE INDEX IF NOT EXISTS idx_kg_node_kind ON {{prefix}}kg_node(kind);
CREATE INDEX IF NOT EXISTS idx_kg_node_name_trgm
  ON {{prefix}}kg_node USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kg_node_embedding
  ON {{prefix}}kg_node USING hnsw (embedding vector_cosine_ops);

-- Edges: typed relations between nodes
CREATE TABLE IF NOT EXISTS {{prefix}}kg_edge (
  edge_id   UUID PRIMARY KEY,
  from_node UUID NOT NULL,
  to_node   UUID NOT NULL,
  relation  VARCHAR(32) NOT NULL,  -- prerequisite_of|part_of|used_by|example_of|related_to|alternative_to|teaches|depends_on
  weight    REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (from_node, to_node, relation)
);
CREATE INDEX IF NOT EXISTS idx_kg_edge_from ON {{prefix}}kg_edge(from_node);
CREATE INDEX IF NOT EXISTS idx_kg_edge_to   ON {{prefix}}kg_edge(to_node);

-- Lesson <-> concept links (which concepts a lesson teaches)
CREATE TABLE IF NOT EXISTS {{prefix}}lesson_concept (
  lesson_id UUID NOT NULL,
  node_id   UUID NOT NULL,
  PRIMARY KEY (lesson_id, node_id)
);
```

**RLS (mandatory):** the KG is reference data — **public read, service-role write**,
exactly like the lesson catalog:
```sql
ALTER TABLE {{prefix}}kg_node ENABLE ROW LEVEL SECURITY;
CREATE POLICY kg_node_public_read   ON {{prefix}}kg_node FOR SELECT USING (true);
CREATE POLICY kg_node_service_write ON {{prefix}}kg_node FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
-- repeat the two policies for kg_edge and lesson_concept
```

- **`kind` and `relation` taxonomies are domain-specific.** vibe-cast taught an
  agent-orchestration tool, so `kind ∈ {concept, command, mcp_tool, agent_type,
  topology, pattern, capability, term}`. For a *different* subject, derive the
  taxonomy from the syllabus nouns (e.g. a math course: `axiom, theorem, proof,
  technique, definition, example`). The *table shape stays identical*.

## 2. Embeddings (index-time == query-time)

- Model: **`Xenova/all-MiniLM-L6-v2`, 384-dim**, run **locally via ONNX**
  (`@xenova/transformers`) — no API key, deterministic, free.
- **Index-time and query-time MUST use the same model/dims** or retrieval
  silently degrades. Keep dims in `config.knowledge_graph.embedding`.
- pgvector literal form for RPC params is `"[0.1,0.2,...]"` (see `toVectorLiteral`).
- This is the glibc dependency that forces `node:20-slim` over alpine in the
  Dockerfile (onnxruntime ships glibc-only binaries) — see `best-practices.md §Deployment`.

The retrieval RPC (create once; not a table migration — `service_role`):
```sql
CREATE OR REPLACE FUNCTION kg_search(query_embedding vector(384), match_count int)
RETURNS TABLE (node_id uuid, kind text, name text, summary text, score float)
LANGUAGE sql STABLE AS $$
  SELECT node_id, kind, name, summary,
         1 - (embedding <=> query_embedding) AS score   -- cosine similarity
  FROM {{prefix}}kg_node
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## 3. Build pipeline (Opus authors the graph)

A multi-agent workflow over the *ground-truth source* (clone the canonical repo /
ingest the authoritative material), tiered by model:

1. **Extract nodes (Opus)** — partition by `kind`; every node carries
   `source_refs` citing real files/lines. Judgment-heavy, done once.
2. **Extract edges (Opus)** — relations between nodes; validate no edge points at
   a missing node.
3. **Embed (Haiku/glue)** — `vector(384)` for each node's `name + summary`.
4. **Validate** — citations resolve to real sources; no orphan edges; dedupe by
   `(kind, name)`.
5. **Persist** via `service_role` (upsert `onConflict: kind,name` for nodes,
   `from_node,to_node,relation` for edges, `lesson_id,node_id` for links).
   See `scripts/persist-kg.mjs` in the reference build for the exact upsert shape.

## 4. Lessons are generated FROM the graph (KG-5)

This is the inversion the skill must preserve: **lessons are views assembled from
verified nodes**, not prose authored independently.

- Each lesson links to its concept nodes via `lesson_concept` (`teaches` edges).
- **Sonnet** workers author lesson prose by querying the lesson's subgraph; they
  cite node names and **cannot invent APIs** — every claim maps to a node.
- Upgrades = re-run after the graph changes. No 12×-re-derive-from-source drift.

When generating course content in this skill, **author/extend the KG first, then
generate lessons from it** — do not write lesson bodies that aren't backed by
nodes.

## 5. AI Tutor (GraphRAG) — `POST /api/v1/tutor/ask`

Request: `{ question, context?: {lessonId|pathId}, llm?: {provider, apiKey, model} }`
(authenticated via the Supabase JWT). Pipeline:

1. **Embed** the question (same 384-dim model).
2. **Retrieve**: `kg_search` top-k (e.g. 8) — hybrid blend with `pg_trgm` keyword
   match for exact names.
3. **Refuse guardrail**: drop hits below a score floor (vibe-cast used `0.3`). If
   nothing survives, **return `mode: 'refused'`** with a helpful "not in the
   knowledge base" message — *never* fall through to an ungrounded LLM answer.
4. **Traverse** `kg_edge` 1 hop (both directions) to gather the neighbourhood
   subgraph for richer context.
5. **Assemble** grounded context: node `summary`/`body` + `source_refs` + linked
   lessons (`lesson_concept` → lesson read model).
6. **Synthesize (optional)**: an LLM answers **strictly from that context**, citing
   node names, refusing anything not present. If no LLM key is available, degrade
   gracefully to a **retrieval-only** answer built from node summaries — the tutor
   still works with zero LLM config.
7. Return `{ mode, answer, citations:[{name,kind,summary,score,sourceRefs}],
   lessons, suggestedNext }`.

**System prompt rule (anti-hallucination):** "Answer ONLY using the provided
knowledge context. Cite node names. If the context does not contain the answer,
say you do not have that information yet — never invent commands, tools, or APIs."

Also expose a **read-only graph API** (`GET /api/v1/knowledge-graph`) returning
`{nodes, edges}` (endpoints as `source`/`target`) for a force-graph visualisation
page — the KG is public-read, so this is unauthenticated.

## 6. Model routing (tiered)

| Work | Model | Why |
|------|-------|-----|
| Graph node/edge authoring | **Opus** | correctness-critical, judgment-heavy, done once |
| Lesson prose / default tutor answers | **Sonnet** | strong writing from pre-verified nodes |
| Embedding orchestration, formatting, validation glue | **Haiku** | mechanical |
| Hard multi-hop tutor reasoning | **Opus** (selective) | escalation only |

## 7. Bring-your-own-key (BYOK) + multi-provider

The tutor LLM is pluggable (`llmProvider` abstraction): **Anthropic / OpenAI /
Requesty / Gemini**. The provider + key resolve from **either** the request
(user pastes a key in the browser — sent per-request, **never persisted or
logged**) **or** server env vars (`ANTHROPIC_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`,
…). Default model: `claude-sonnet-4-6`.

**Security rules (carry over verbatim):**
- A request-supplied key is used transiently for one outbound call, then dropped.
  **Never log the key** — log only `provider` + `model` + error message.
- The KG-build `service_role` key is server-side only (never the browser).
- Retrieval + citations are always grounded in the graph even when synthesis is
  off; the LLM never sees anything but the assembled, cited context.

## 8. Staleness / maintenance

The graph drifts as the underlying subject evolves. Schedule a **refresh worker**:
re-run the build pipeline (§3) against fresh ground truth, re-embed, re-validate.
Index-time and query-time embedding models must stay identical across refreshes.
