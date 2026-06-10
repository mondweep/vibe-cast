-- Migration 017: Per-Lesson Likes + Comments (PRD: lesson engagement)
-- Date: 2026-06-10
-- Purpose: Toggle likes and comments per lesson. Cumulative like count rolls up
--          to learning-path cards via a view (ruflo_demo_path_total_likes), so
--          LearningPathsPage can show engagement without a denormalised column.
-- Schema: ruflo_demo (doubled-prefix naming, consistent with prior migrations).
-- Idempotent: CREATE ... IF NOT EXISTS + guarded policies, safe to re-run.

SET search_path TO ruflo_demo, public;

-- ============================================================
-- 1. Lesson reactions (one row per learner+lesson, toggleable)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_lesson_reaction (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  UUID        NOT NULL,
  learner_id UUID        NOT NULL,
  reacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_reaction_lesson
  ON ruflo_demo.ruflo_demo_lesson_reaction (lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_reaction_learner
  ON ruflo_demo.ruflo_demo_lesson_reaction (learner_id);

-- ============================================================
-- 2. Lesson comments
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_lesson_comment (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID        NOT NULL,
  learner_id  UUID        NOT NULL,
  body        TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_comment_lesson
  ON ruflo_demo.ruflo_demo_lesson_comment (lesson_id, created_at DESC);

-- ============================================================
-- 3. Path total likes view (aggregates reactions through lessons)
--    Powers the cumulative-likes count on learning-path cards.
-- ============================================================
CREATE OR REPLACE VIEW ruflo_demo.ruflo_demo_path_total_likes AS
  SELECT
    lrm.path_id,
    COUNT(lr.id)::INTEGER AS total_likes
  FROM ruflo_demo.ruflo_demo_lesson_read_model lrm
  LEFT JOIN ruflo_demo.ruflo_demo_lesson_reaction lr
    ON lr.lesson_id = lrm.lesson_id
  GROUP BY lrm.path_id;

-- ============================================================
-- 4. RLS — reactions
--    service_role: full access (the API writes via the service-role client,
--    enforcing learner identity at the application layer). authenticated: may
--    insert/delete own rows. public: read (for like counts).
-- ============================================================
ALTER TABLE ruflo_demo.ruflo_demo_lesson_reaction ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY reaction_service_all
    ON ruflo_demo.ruflo_demo_lesson_reaction
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY reaction_public_read
    ON ruflo_demo.ruflo_demo_lesson_reaction
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY reaction_own_insert
    ON ruflo_demo.ruflo_demo_lesson_reaction
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = learner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY reaction_own_delete
    ON ruflo_demo.ruflo_demo_lesson_reaction
    FOR DELETE TO authenticated
    USING (auth.uid() = learner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON ruflo_demo.ruflo_demo_lesson_reaction TO anon, authenticated;
GRANT INSERT, DELETE ON ruflo_demo.ruflo_demo_lesson_reaction TO authenticated;
GRANT ALL ON ruflo_demo.ruflo_demo_lesson_reaction TO service_role;

-- ============================================================
-- 5. RLS — comments
-- ============================================================
ALTER TABLE ruflo_demo.ruflo_demo_lesson_comment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY comment_service_all
    ON ruflo_demo.ruflo_demo_lesson_comment
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY comment_public_read
    ON ruflo_demo.ruflo_demo_lesson_comment
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY comment_own_insert
    ON ruflo_demo.ruflo_demo_lesson_comment
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = learner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON ruflo_demo.ruflo_demo_lesson_comment TO anon, authenticated;
GRANT INSERT ON ruflo_demo.ruflo_demo_lesson_comment TO authenticated;
GRANT ALL ON ruflo_demo.ruflo_demo_lesson_comment TO service_role;

GRANT SELECT ON ruflo_demo.ruflo_demo_path_total_likes TO anon, authenticated, service_role;
