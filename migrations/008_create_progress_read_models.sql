-- Migration: Progress Dashboard read models (CQRS — ADR-011)
-- Date: 2026-06-07
-- Purpose: Read models materialized from the Learning Domain events
--          (LearnerEnrolledInPath, LessonCompleted, PathCompleted — ADR-013) to
--          power the Progress Dashboard (PRD §4.3):
--            1. enrollment per learner+path
--            2. per-lesson completion
--            3. computed path-progress %  (re-affirms the table seeded in 002)
-- Spec: PRD §4.3, ADR-011 (projection_version + last_synced_event_id), ADR-013.
-- Schema: ruflo_demo (doubled-prefix table naming, consistent with 001/002/005).
-- Idempotent: CREATE ... IF NOT EXISTS + guarded policies, safe to re-run and to
--             layer on top of migration 002 (which already created the
--             path_progress read model). This migration only ADDS the missing
--             enrollment + per-lesson tables and ensures the progress table has
--             the ADR-011 projection_version column.

-- ============================================================
-- 1. Path Enrollment Read Model (one row per learner+path)
--    Materialized from LearnerEnrolledInPath; the durable record that a learner
--    started a path (distinct from the certification enrollment — ADR-013 §6).
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_path_enrollment_read_model (
  enrollment_id UUID PRIMARY KEY,
  learner_id UUID NOT NULL,
  path_id UUID NOT NULL,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | COMPLETED
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (learner_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_path_enrollment_learner
  ON ruflo_demo.ruflo_demo_path_enrollment_read_model(learner_id);

ALTER TABLE ruflo_demo.ruflo_demo_path_enrollment_read_model ENABLE ROW LEVEL SECURITY;

-- Owner reads own enrollments; service role manages (mirrors path_progress RLS).
DO $$ BEGIN
  CREATE POLICY path_enrollment_own_read
    ON ruflo_demo.ruflo_demo_path_enrollment_read_model FOR SELECT
    USING (auth.uid()::uuid = learner_id OR auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY path_enrollment_service_update
    ON ruflo_demo.ruflo_demo_path_enrollment_read_model FOR UPDATE
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY path_enrollment_service_insert
    ON ruflo_demo.ruflo_demo_path_enrollment_read_model FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. Lesson Completion Read Model (one row per learner+lesson)
--    Materialized from LessonCompleted; the audit/list of completed lessons that
--    the dashboard renders and that drives "continue where you left off".
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_lesson_completion_read_model (
  completion_id UUID PRIMARY KEY,
  learner_id UUID NOT NULL,
  path_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0,   -- path progress at time of completion
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (learner_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completion_learner
  ON ruflo_demo.ruflo_demo_lesson_completion_read_model(learner_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completion_learner_path
  ON ruflo_demo.ruflo_demo_lesson_completion_read_model(learner_id, path_id);

ALTER TABLE ruflo_demo.ruflo_demo_lesson_completion_read_model ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY lesson_completion_own_read
    ON ruflo_demo.ruflo_demo_lesson_completion_read_model FOR SELECT
    USING (auth.uid()::uuid = learner_id OR auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY lesson_completion_service_update
    ON ruflo_demo.ruflo_demo_lesson_completion_read_model FOR UPDATE
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY lesson_completion_service_insert
    ON ruflo_demo.ruflo_demo_lesson_completion_read_model FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. Path Progress Read Model (computed % per learner+path)
--    Created in migration 002. Re-affirm here (idempotent) and ensure the
--    ADR-011 projection_version column is present even if 002 predates it.
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_path_progress_read_model (
  progress_id UUID PRIMARY KEY,
  learner_id UUID NOT NULL,
  path_id UUID NOT NULL,
  completed_lesson_ids UUID[] NOT NULL DEFAULT '{}',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | COMPLETED
  current_lesson_id UUID,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (learner_id, path_id)
);

ALTER TABLE ruflo_demo.ruflo_demo_path_progress_read_model
  ADD COLUMN IF NOT EXISTS projection_version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_path_progress_learner
  ON ruflo_demo.ruflo_demo_path_progress_read_model(learner_id);

ALTER TABLE ruflo_demo.ruflo_demo_path_progress_read_model ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY path_progress_own_read
    ON ruflo_demo.ruflo_demo_path_progress_read_model FOR SELECT
    USING (auth.uid()::uuid = learner_id OR auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY path_progress_service_update
    ON ruflo_demo.ruflo_demo_path_progress_read_model FOR UPDATE
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY path_progress_service_insert
    ON ruflo_demo.ruflo_demo_path_progress_read_model FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Grants (consistent with 001/002)
-- ============================================================
GRANT SELECT ON ALL TABLES IN SCHEMA ruflo_demo TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ruflo_demo TO service_role;
