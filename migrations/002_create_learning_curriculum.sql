-- Migration: Learning Domain curriculum read models
-- Date: 2026-06-07
-- Purpose: CQRS read models for Learning Paths, Lessons, and per-learner progress
-- Spec: PRD §4 (Learning Domain), ADR-013
-- Schema: ruflo_demo (consistent with 001 / ruflo_demo_schema.sql)

-- ============================================================
-- 1. Learning Path Read Model (catalog — public)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_learning_path_read_model (
  path_id UUID PRIMARY KEY,
  level VARCHAR(20) NOT NULL,                 -- beginner | intermediate | advanced
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  estimated_hours INTEGER NOT NULL DEFAULT 0,
  lesson_count INTEGER NOT NULL DEFAULT 0,
  ordered_lesson_ids UUID[] NOT NULL DEFAULT '{}',
  prerequisite_path_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_path_level
  ON ruflo_demo.ruflo_demo_learning_path_read_model(level);

ALTER TABLE ruflo_demo.ruflo_demo_learning_path_read_model ENABLE ROW LEVEL SECURITY;

-- Catalog is public (anyone can browse paths)
CREATE POLICY learning_path_public_read
  ON ruflo_demo.ruflo_demo_learning_path_read_model FOR SELECT
  USING (true);
CREATE POLICY learning_path_service_update
  ON ruflo_demo.ruflo_demo_learning_path_read_model FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY learning_path_service_insert
  ON ruflo_demo.ruflo_demo_learning_path_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. Lesson Read Model (catalog + authored content — public when published)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_lesson_read_model (
  lesson_id UUID PRIMARY KEY,
  path_id UUID NOT NULL,
  lesson_order INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  topics JSONB NOT NULL DEFAULT '[]',
  estimated_hours INTEGER NOT NULL DEFAULT 0,
  capstone VARCHAR(50) NOT NULL,
  prerequisite_lesson_id UUID,
  content JSONB NOT NULL DEFAULT '[]',        -- authored ContentBlock[] (ADR-013 Phase 5)
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_path
  ON ruflo_demo.ruflo_demo_lesson_read_model(path_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_path_order
  ON ruflo_demo.ruflo_demo_lesson_read_model(path_id, lesson_order);

ALTER TABLE ruflo_demo.ruflo_demo_lesson_read_model ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_public_read
  ON ruflo_demo.ruflo_demo_lesson_read_model FOR SELECT
  USING (status = 'PUBLISHED' OR auth.role() = 'service_role');
CREATE POLICY lesson_service_update
  ON ruflo_demo.ruflo_demo_lesson_read_model FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY lesson_service_insert
  ON ruflo_demo.ruflo_demo_lesson_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. Path Progress Read Model (per-learner — owner read)
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
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (learner_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_path_progress_learner
  ON ruflo_demo.ruflo_demo_path_progress_read_model(learner_id);

ALTER TABLE ruflo_demo.ruflo_demo_path_progress_read_model ENABLE ROW LEVEL SECURITY;

-- Learners read their own progress; service role manages it (mirrors learner_profile)
CREATE POLICY path_progress_own_read
  ON ruflo_demo.ruflo_demo_path_progress_read_model FOR SELECT
  USING (auth.uid()::uuid = learner_id OR auth.role() = 'service_role');
CREATE POLICY path_progress_service_update
  ON ruflo_demo.ruflo_demo_path_progress_read_model FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY path_progress_service_insert
  ON ruflo_demo.ruflo_demo_path_progress_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Grants (consistent with 001)
-- ============================================================
GRANT SELECT ON ALL TABLES IN SCHEMA ruflo_demo TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ruflo_demo TO service_role;
