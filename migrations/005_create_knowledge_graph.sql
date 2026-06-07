-- Migration: Ruflo Knowledge Graph (nodes, edges, lesson↔concept links)
-- Date: 2026-06-07
-- Spec: ADR-014. Stored in ruflo_demo; pgvector for GraphRAG retrieval.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- Nodes (public read; service write) — embedding backfilled later
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_kg_node (
  node_id UUID PRIMARY KEY,
  kind VARCHAR(32) NOT NULL,          -- concept|command|mcp_tool|agent_type|topology|pattern|capability|term
  name VARCHAR(255) NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  source_refs JSONB NOT NULL DEFAULT '[]',   -- [{file, lines, quote}]
  embedding vector(384),                     -- MiniLM-L6-v2; nullable until backfill
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (kind, name)
);
CREATE INDEX IF NOT EXISTS idx_kg_node_kind ON ruflo_demo.ruflo_demo_kg_node(kind);
CREATE INDEX IF NOT EXISTS idx_kg_node_name_trgm ON ruflo_demo.ruflo_demo_kg_node USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kg_node_embedding ON ruflo_demo.ruflo_demo_kg_node USING hnsw (embedding vector_cosine_ops);

ALTER TABLE ruflo_demo.ruflo_demo_kg_node ENABLE ROW LEVEL SECURITY;
CREATE POLICY kg_node_public_read ON ruflo_demo.ruflo_demo_kg_node FOR SELECT USING (true);
CREATE POLICY kg_node_service_write ON ruflo_demo.ruflo_demo_kg_node FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Edges (typed relations between nodes)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_kg_edge (
  edge_id UUID PRIMARY KEY,
  from_node UUID NOT NULL,
  to_node UUID NOT NULL,
  relation VARCHAR(32) NOT NULL,      -- prerequisite_of|part_of|used_by|example_of|related_to|alternative_to|teaches|depends_on
  weight REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (from_node, to_node, relation)
);
CREATE INDEX IF NOT EXISTS idx_kg_edge_from ON ruflo_demo.ruflo_demo_kg_edge(from_node);
CREATE INDEX IF NOT EXISTS idx_kg_edge_to ON ruflo_demo.ruflo_demo_kg_edge(to_node);

ALTER TABLE ruflo_demo.ruflo_demo_kg_edge ENABLE ROW LEVEL SECURITY;
CREATE POLICY kg_edge_public_read ON ruflo_demo.ruflo_demo_kg_edge FOR SELECT USING (true);
CREATE POLICY kg_edge_service_write ON ruflo_demo.ruflo_demo_kg_edge FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Lesson ↔ Concept links (which concepts a lesson teaches)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_lesson_concept (
  lesson_id UUID NOT NULL,
  node_id UUID NOT NULL,
  PRIMARY KEY (lesson_id, node_id)
);
ALTER TABLE ruflo_demo.ruflo_demo_lesson_concept ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_concept_public_read ON ruflo_demo.ruflo_demo_lesson_concept FOR SELECT USING (true);
CREATE POLICY lesson_concept_service_write ON ruflo_demo.ruflo_demo_lesson_concept FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON ALL TABLES IN SCHEMA ruflo_demo TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ruflo_demo TO service_role;
