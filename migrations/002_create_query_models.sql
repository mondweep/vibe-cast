-- Migration: Create Query Model Read Tables
-- Date: 2026-06-03
-- Purpose: CQRS read models for fast queries without joins

-- 1. Learner Profile Read Model
CREATE TABLE IF NOT EXISTS learner_profile_read_model (
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
  ON learner_profile_read_model(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_learner_profile_updated
  ON learner_profile_read_model(updated_at DESC);

-- 2. Certification Progress Read Model
CREATE TABLE IF NOT EXISTS certification_progress_read_model (
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
  ON certification_progress_read_model(learner_id);
CREATE INDEX IF NOT EXISTS idx_cert_progress_status
  ON certification_progress_read_model(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_cert_progress_certification
  ON certification_progress_read_model(certification_id);

-- 3. Community Profile Read Model
CREATE TABLE IF NOT EXISTS community_profile_read_model (
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
  ON community_profile_read_model(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_community_profile_badge_count
  ON community_profile_read_model(badge_count DESC);

-- 4. Metrics Read Model
CREATE TABLE IF NOT EXISTS metrics_read_model (
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
  ON metrics_read_model(period, date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_date
  ON metrics_read_model(date DESC);
