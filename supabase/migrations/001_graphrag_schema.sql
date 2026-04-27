-- ============================================================
-- AWS Advanced Networking Course — GraphRAG Schema v2
-- Fully idempotent: safe to run on a fresh DB or re-run.
-- ============================================================

-- 1. pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── TABLES ───────────────────────────────────────────────────

-- Knowledge Graph: Nodes
CREATE TABLE IF NOT EXISTS kg_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN (
                'AWSService','Concept','Protocol',
                'Pattern','ExamTopic','Module','Lesson'
              )),
  description TEXT,
  module_ids  TEXT[]      DEFAULT '{}',
  properties  JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_nodes_label_type
  ON kg_nodes (lower(label), type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type
  ON kg_nodes (type);

-- Knowledge Graph: Edges
CREATE TABLE IF NOT EXISTS kg_edges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  to_node_id   UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  relation     TEXT NOT NULL CHECK (relation IN (
                'USES','REQUIRES','ENABLES','COMPARED_TO',
                'PART_OF','PREREQUISITE_OF','APPEARS_IN',
                'ALTERNATIVE_TO','CONFIGURES','SECURES','MONITORS'
              )),
  weight       FLOAT       DEFAULT 1.0,
  properties   JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_node_id, to_node_id, relation)
);

CREATE INDEX IF NOT EXISTS idx_kg_edges_from ON kg_edges (from_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_to   ON kg_edges (to_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_rel  ON kg_edges (relation);

-- Vector Store: Content Chunks
CREATE TABLE IF NOT EXISTS content_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    TEXT    NOT NULL,
  module_slug  TEXT    NOT NULL,
  module_title TEXT    NOT NULL,
  section      TEXT,
  chunk_index  INTEGER NOT NULL,
  content      TEXT    NOT NULL,
  token_count  INTEGER,
  embedding    vector(1024),
  node_ids     UUID[]      DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_module ON content_chunks (module_id);

-- IVFFlat index guarded by a DO block (no IF NOT EXISTS syntax for this index type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'content_chunks'
      AND indexname  = 'idx_chunks_embedding'
  ) THEN
    CREATE INDEX idx_chunks_embedding
      ON content_chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 50);
  END IF;
END;
$$;

-- Chat: Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL UNIQUE,
  persona     TEXT,
  module_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat: Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  context    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session
  ON chat_messages (session_id, created_at);

-- ── FUNCTIONS ─────────────────────────────────────────────────

-- Vector similarity search
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
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM content_chunks c
  WHERE (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Graph neighbourhood traversal (recursive, up to N hops)
CREATE OR REPLACE FUNCTION get_node_neighbourhood(
  start_node_id UUID,
  max_hops      INT DEFAULT 2,
  max_nodes     INT DEFAULT 20
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

    -- Base case: start node
    SELECT
      n.id                  AS node_id,
      n.label,
      n.type,
      n.description,
      NULL::TEXT            AS relation,
      0                     AS hop,
      1.0::double precision AS weight
    FROM kg_nodes n
    WHERE n.id = start_node_id

    UNION ALL

    -- Recursive case: one hop further per iteration
    SELECT
      n.id,
      n.label,
      n.type,
      n.description,
      e.relation,
      gt.hop + 1,
      (e.weight * gt.weight)::double precision
    FROM graph_traversal gt
    JOIN kg_edges  e ON e.from_node_id = gt.node_id
    JOIN kg_nodes  n ON n.id           = e.to_node_id
    WHERE gt.hop < max_hops

  )
  SELECT DISTINCT ON (node_id)
    node_id, label, type, description, relation, hop, weight
  FROM graph_traversal
  ORDER BY node_id, hop, weight DESC
  LIMIT max_nodes;
$$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────

ALTER TABLE kg_nodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_edges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

-- Drop all policies first so re-runs are idempotent
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read kg_nodes"         ON kg_nodes;
  DROP POLICY IF EXISTS "Public read kg_edges"         ON kg_edges;
  DROP POLICY IF EXISTS "Public read content_chunks"   ON content_chunks;
  DROP POLICY IF EXISTS "Service write kg_nodes"       ON kg_nodes;
  DROP POLICY IF EXISTS "Service write kg_edges"       ON kg_edges;
  DROP POLICY IF EXISTS "Service write content_chunks" ON content_chunks;
  DROP POLICY IF EXISTS "Service write chat_sessions"  ON chat_sessions;
  DROP POLICY IF EXISTS "Service write chat_messages"  ON chat_messages;
  DROP POLICY IF EXISTS "Anon chat sessions"           ON chat_sessions;
  DROP POLICY IF EXISTS "Anon chat messages"           ON chat_messages;
END $$;

-- Public read: knowledge graph + chunks (course content is open)
CREATE POLICY "Public read kg_nodes"
  ON kg_nodes FOR SELECT USING (true);

CREATE POLICY "Public read kg_edges"
  ON kg_edges FOR SELECT USING (true);

CREATE POLICY "Public read content_chunks"
  ON content_chunks FOR SELECT USING (true);

-- Service role: full write access (used by ingestion script only)
CREATE POLICY "Service write kg_nodes"
  ON kg_nodes FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service write kg_edges"
  ON kg_edges FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service write content_chunks"
  ON content_chunks FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service write chat_sessions"
  ON chat_sessions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service write chat_messages"
  ON chat_messages FOR ALL USING (auth.role() = 'service_role');

-- Anon key: open chat access (no PII stored at this stage)
CREATE POLICY "Anon chat sessions"
  ON chat_sessions FOR ALL USING (true);

CREATE POLICY "Anon chat messages"
  ON chat_messages FOR ALL USING (true);
