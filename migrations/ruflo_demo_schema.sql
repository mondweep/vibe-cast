-- Migration: Create ruflo_demo schema and read models
-- Date: 2026-06-03
-- Purpose: CQRS read models for vibe-cast learning platform
-- Schema: ruflo_demo (custom schema for multi-tenant support)

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS ruflo_demo;

-- Set default privileges for this schema
ALTER DEFAULT PRIVILEGES IN SCHEMA ruflo_demo GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ruflo_demo GRANT INSERT, UPDATE ON TABLES TO authenticated;

-- ============================================================
-- 1. Learner Profile Read Model
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.learner_profile_read_model (
  learner_id UUID PRIMARY KEY,
  enrollment_ids UUID[] NOT NULL DEFAULT '{}',
  completed_enrollment_count INTEGER NOT NULL DEFAULT 0,
  total_enrollments INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  badges_earned JSONB NOT NULL DEFAULT '[]',
  skills_achieved JSONB NOT NULL DEFAULT '[]',
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learner_profile_last_activity
  ON ruflo_demo.learner_profile_read_model(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_learner_profile_updated
  ON ruflo_demo.learner_profile_read_model(updated_at DESC);

-- Enable RLS on learner profile
ALTER TABLE ruflo_demo.learner_profile_read_model ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Learners can only view their own profile
CREATE POLICY learner_profile_own_read
  ON ruflo_demo.learner_profile_read_model FOR SELECT
  USING (auth.uid()::uuid = learner_id OR auth.role() = 'service_role');

-- RLS Policy: Authenticated users can read all profiles (public data)
CREATE POLICY learner_profile_authenticated_read
  ON ruflo_demo.learner_profile_read_model FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

-- RLS Policy: Service role can update (projectors)
CREATE POLICY learner_profile_service_update
  ON ruflo_demo.learner_profile_read_model FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Service role can insert
CREATE POLICY learner_profile_service_insert
  ON ruflo_demo.learner_profile_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. Certification Progress Read Model
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.certification_progress_read_model (
  enrollment_id UUID PRIMARY KEY,
  learner_id UUID NOT NULL,
  certification_id UUID NOT NULL,
  enrollment_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  exam_attempts JSONB NOT NULL DEFAULT '[]',
  current_grade DECIMAL(5,2),
  badge_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
  issued_badge_id UUID,
  next_renewal_date TIMESTAMP,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cert_progress_learner
  ON ruflo_demo.certification_progress_read_model(learner_id);
CREATE INDEX IF NOT EXISTS idx_cert_progress_status
  ON ruflo_demo.certification_progress_read_model(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_cert_progress_certification
  ON ruflo_demo.certification_progress_read_model(certification_id);

-- Enable RLS
ALTER TABLE ruflo_demo.certification_progress_read_model ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY cert_progress_own_read
  ON ruflo_demo.certification_progress_read_model FOR SELECT
  USING (auth.uid()::uuid = learner_id OR auth.role() = 'service_role');

CREATE POLICY cert_progress_authenticated_read
  ON ruflo_demo.certification_progress_read_model FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY cert_progress_service_update
  ON ruflo_demo.certification_progress_read_model FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY cert_progress_service_insert
  ON ruflo_demo.certification_progress_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. Community Profile Read Model
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.community_profile_read_model (
  learner_id UUID PRIMARY KEY,
  display_name VARCHAR(255),
  badge_count INTEGER NOT NULL DEFAULT 0,
  skill_count INTEGER NOT NULL DEFAULT 0,
  reputation_score INTEGER NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_profile_reputation
  ON ruflo_demo.community_profile_read_model(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_community_profile_badge_count
  ON ruflo_demo.community_profile_read_model(badge_count DESC);

-- Enable RLS
ALTER TABLE ruflo_demo.community_profile_read_model ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Community profiles are public read, service role can write
CREATE POLICY community_profile_public_read
  ON ruflo_demo.community_profile_read_model FOR SELECT
  USING (true); -- Public read for community visibility

CREATE POLICY community_profile_service_update
  ON ruflo_demo.community_profile_read_model FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY community_profile_service_insert
  ON ruflo_demo.community_profile_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. Metrics Read Model
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.metrics_read_model (
  metrics_id UUID PRIMARY KEY,
  period VARCHAR(50) NOT NULL,
  date TIMESTAMP NOT NULL,
  total_events_processed INTEGER NOT NULL DEFAULT 0,
  event_count_by_type JSONB NOT NULL DEFAULT '{}',
  total_learners_active INTEGER NOT NULL DEFAULT 0,
  total_badges_issued INTEGER NOT NULL DEFAULT 0,
  total_skills_achieved INTEGER NOT NULL DEFAULT 0,
  average_completion_time_ms INTEGER NOT NULL DEFAULT 0,
  latency_percentiles JSONB NOT NULL DEFAULT '{"p50":0,"p95":0,"p99":0}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metrics_period_date
  ON ruflo_demo.metrics_read_model(period, date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_date
  ON ruflo_demo.metrics_read_model(date DESC);

-- Enable RLS - Metrics are admin/analytics only
ALTER TABLE ruflo_demo.metrics_read_model ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY metrics_service_read
  ON ruflo_demo.metrics_read_model FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY metrics_service_update
  ON ruflo_demo.metrics_read_model FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY metrics_service_insert
  ON ruflo_demo.metrics_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Grant permissions
-- ============================================================
GRANT USAGE ON SCHEMA ruflo_demo TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA ruflo_demo TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ruflo_demo TO service_role;
