-- ============================================================
-- Migration 002: Chat analytics columns + helpers
-- Extends chat_sessions with geo, cost, and message count
-- Safe to run on existing schema (all ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- Extend chat_sessions with analytics columns
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS country       TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS region        TEXT,
  ADD COLUMN IF NOT EXISTS total_cost_usd FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- Index for geo analytics queries
CREATE INDEX IF NOT EXISTS idx_sessions_country ON chat_sessions (country);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions (updated_at DESC);

-- Index for topic queries on messages context JSONB
CREATE INDEX IF NOT EXISTS idx_messages_context ON chat_messages USING gin(context);

-- ── Helper view: per-session summary ─────────────────────────
CREATE OR REPLACE VIEW session_summary AS
SELECT
  s.id,
  s.session_key,
  s.persona,
  s.module_id,
  s.country,
  s.city,
  s.region,
  s.total_cost_usd,
  s.message_count,
  s.created_at,
  s.updated_at,
  COUNT(m.id) FILTER (WHERE m.role = 'user') AS user_messages,
  -- Most common topic across all messages in session
  (
    SELECT topic
    FROM (
      SELECT jsonb_array_elements_text(m2.context->'topics') AS topic
      FROM chat_messages m2
      WHERE m2.session_id = s.id
    ) t
    GROUP BY topic
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) AS top_topic
FROM chat_sessions s
LEFT JOIN chat_messages m ON m.session_id = s.id
GROUP BY s.id;

-- ── Helper view: topic frequency across all sessions ──────────
CREATE OR REPLACE VIEW topic_frequency AS
SELECT
  topic,
  COUNT(*) AS mention_count,
  COUNT(DISTINCT session_id) AS session_count
FROM (
  SELECT
    m.session_id,
    jsonb_array_elements_text(m.context->'topics') AS topic
  FROM chat_messages m
  WHERE m.role = 'user'
    AND m.context ? 'topics'
) t
GROUP BY topic
ORDER BY mention_count DESC;

-- ── Helper view: cost by country ─────────────────────────────
CREATE OR REPLACE VIEW cost_by_country AS
SELECT
  COALESCE(country, 'Unknown') AS country,
  COUNT(DISTINCT id)           AS sessions,
  SUM(message_count)           AS total_messages,
  SUM(total_cost_usd)          AS total_cost_usd,
  AVG(total_cost_usd)          AS avg_cost_per_session
FROM chat_sessions
GROUP BY country
ORDER BY total_cost_usd DESC;

-- ── Grant anon read on views (for potential dashboard) ───────
GRANT SELECT ON session_summary   TO anon;
GRANT SELECT ON topic_frequency   TO anon;
GRANT SELECT ON cost_by_country   TO anon;
