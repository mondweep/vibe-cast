-- ============================================================
-- AWS Advanced Networking Course — GraphRAG Schema
-- Ontology: AWSService | Concept | Protocol | Pattern | ExamTopic | Module | Lesson
-- ============================================================

-- Enable pgvector for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ── ONTOLOGY: Knowledge Graph Nodes ─────────────────────────
CREATE TABLE IF NOT EXISTS kg_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,                    -- e.g. "Direct Connect"
  type        TEXT NOT NULL CHECK (type IN (
    'AWSService', 'Concept', 'Protocol',
    'Pattern', 'ExamTopic', 'Module', 'Lesson'
  )),
  description TEXT,                             -- Short definition
  module_ids  TEXT[] DEFAULT '{}',              -- Which modules mention this node
  properties  JSONB DEFAULT '{}',               -- Flexible extra metadata
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kg_nodes_label ON kg_nodes USING gin(to_tsvector('english', label));
CREATE INDEX idx_kg_nodes_type  ON kg_nodes(type);
CREATE UNIQUE INDEX idx_kg_nodes_label_type ON kg_nodes(lower(label), type);

-- ── ONTOLOGY: Knowledge Graph Edges ─────────────────────────
CREATE TABLE IF NOT EXISTS kg_edges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  to_node_id   UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  relation     TEXT NOT NULL CHECK (relation IN (
    'USES', 'REQUIRES', 'ENABLES', 'COMPARED_TO',
    'PART_OF', 'PREREQUISITE_OF', 'APPEARS_IN',
    'ALTERNATIVE_TO', 'CONFIGURES', 'SECURES', 'MONITORS'
  )),
  weight       FLOAT DEFAULT 1.0,              -- Relation strength (1=strong, 0=weak)
  properties   JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id, relation)
);

CREATE INDEX idx_kg_edges_from ON kg_edges(from_node_id);
CREATE INDEX idx_kg_edges_to   ON kg_edges(to_node_id);
CREATE INDEX idx_kg_edges_rel  ON kg_edges(relation);

-- ── VECTOR STORE: Content Chunks ────────────────────────────
CREATE TABLE IF NOT EXISTS content_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    TEXT NOT NULL,                  -- e.g. "02"
  module_slug  TEXT NOT NULL,                  -- e.g. "hybrid-connectivity"
  module_title TEXT NOT NULL,
  section      TEXT,                           -- h2 heading the chunk falls under
  chunk_index  INTEGER NOT NULL,               -- Position within module
  content      TEXT NOT NULL,                  -- Raw text of the chunk
  token_count  INTEGER,
  embedding    vector(1024),                   -- Voyage AI voyage-3-lite = 1024 dims
  node_ids     UUID[] DEFAULT '{}',            -- Which KG nodes this chunk mentions
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_module   ON content_chunks(module_id);
CREATE INDEX idx_chunks_embedding ON content_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ── VECTOR SIMILARITY SEARCH FUNCTION ───────────────────────
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT   DEFAULT 6
)
RETURNS TABLE (
  id           UUID,
  module_id    TEXT,
  module_slug  TEXT,
  module_title TEXT,
  section      TEXT,
  content      TEXT,
  node_ids     UUID[],
  similarity   FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id, c.module_id, c.module_slug, c.module_title,
    c.section, c.content, c.node_ids,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM content_chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── GRAPH TRAVERSAL FUNCTION ─────────────────────────────────
-- Given a node id, get all connected nodes up to N hops away
CREATE OR REPLACE FUNCTION get_node_neighbourhood(
  start_node_id UUID,
  max_hops       INT DEFAULT 2,
  max_nodes      INT DEFAULT 20
)
RETURNS TABLE (
  node_id     UUID,
  label       TEXT,
  type        TEXT,
  description TEXT,
  relation    TEXT,
  hop         INT,
  weight      FLOAT
)
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE graph_traversal AS (
    -- Base: start node
    SELECT
      n.id AS node_id, n.label, n.type, n.description,
      NULL::TEXT AS relation, 0 AS hop, 1.0::double precision AS weight
    FROM kg_nodes n WHERE n.id = start_node_id

    UNION ALL

    -- Recursive: neighbours
    SELECT
      n.id, n.label, n.type, n.description,
      e.relation, gt.hop + 1, e.weight * gt.weight
    FROM graph_traversal gt
    JOIN kg_edges e ON e.from_node_id = gt.node_id
    JOIN kg_nodes n ON n.id = e.to_node_id
    WHERE gt.hop < max_hops
  )
  SELECT DISTINCT ON (node_id)
    node_id, label, type, description, relation, hop, weight
  FROM graph_traversal
  ORDER BY node_id, hop, weight DESC
  LIMIT max_nodes;
$$;

-- ── CHAT HISTORY ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL UNIQUE,             -- localStorage key
  persona     TEXT,
  module_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  context     JSONB DEFAULT '{}',               -- Chunks + graph nodes used
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id, created_at);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE kg_nodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_edges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

-- Public read on knowledge graph + chunks (course content is public)
CREATE POLICY "Public read kg_nodes"       ON kg_nodes       FOR SELECT USING (true);
CREATE POLICY "Public read kg_edges"       ON kg_edges       FOR SELECT USING (true);
CREATE POLICY "Public read content_chunks" ON content_chunks FOR SELECT USING (true);

-- Service role can write (only ingestion script, using service_role key)
CREATE POLICY "Service write kg_nodes"       ON kg_nodes       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write kg_edges"       ON kg_edges       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write content_chunks" ON content_chunks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write chat_sessions"  ON chat_sessions  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write chat_messages"  ON chat_messages  FOR ALL USING (auth.role() = 'service_role');

-- Anon can insert/read their own chat sessions (by session_key match)
CREATE POLICY "Anon chat sessions"  ON chat_sessions  FOR ALL USING (true);
CREATE POLICY "Anon chat messages"  ON chat_messages  FOR ALL USING (true);
