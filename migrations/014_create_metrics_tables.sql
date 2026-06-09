-- Migration 014: Metrics read models (ADR-017)
-- Learner analytics dashboard — P1 cohort + learner read models.

-- ----------------------------------------------------------------
-- Learner metrics read model
-- One row per learner, upserted by projector on learning events.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_learner_metrics_read_model (
  metrics_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id              UUID        NOT NULL UNIQUE,
  path_progress_percent   NUMERIC(5,2) DEFAULT 0,
  lessons_completed       INT          DEFAULT 0,
  lessons_total           INT          DEFAULT 0,
  exercises_completed     INT          DEFAULT 0,
  exercises_total         INT          DEFAULT 0,
  time_invested_hours     NUMERIC(8,2) DEFAULT 0,
  last_activity_at        TIMESTAMPTZ,
  days_inactive           INT          DEFAULT 0,
  engagement_trend        VARCHAR(8)   DEFAULT 'neutral', -- 'up','neutral','down'
  est_cert_date           DATE,
  updated_at              TIMESTAMPTZ  DEFAULT now()
);

-- ----------------------------------------------------------------
-- Cohort read model
-- Created by instructors; seeded with a default demo cohort.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_cohort_read_model (
  cohort_id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                       TEXT        NOT NULL,
  instructor_id              UUID,
  learner_ids                UUID[]      DEFAULT '{}',
  active_this_week_pct       NUMERIC(5,2) DEFAULT 0,
  avg_path_progress          NUMERIC(5,2) DEFAULT 0,
  completion_rate            NUMERIC(5,2) DEFAULT 0,
  avg_time_per_lesson_hours  NUMERIC(6,2) DEFAULT 0,
  churn_risk_learner_ids     UUID[]       DEFAULT '{}',
  updated_at                 TIMESTAMPTZ  DEFAULT now()
);

-- ----------------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------------

ALTER TABLE ruflo_demo.ruflo_demo_learner_metrics_read_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo.ruflo_demo_cohort_read_model          ENABLE ROW LEVEL SECURITY;

-- Learner can SELECT their own metrics row
CREATE POLICY "learner_metrics_self_read"
  ON ruflo_demo.ruflo_demo_learner_metrics_read_model
  FOR SELECT
  USING (auth.uid() = learner_id);

-- Service role can do everything on learner metrics
CREATE POLICY "learner_metrics_service_all"
  ON ruflo_demo.ruflo_demo_learner_metrics_read_model
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read cohorts they belong to or instruct
CREATE POLICY "cohort_member_or_instructor_read"
  ON ruflo_demo.ruflo_demo_cohort_read_model
  FOR SELECT
  USING (
    auth.uid() = instructor_id
    OR auth.uid() = ANY(learner_ids)
  );

-- Service role can do everything on cohorts
CREATE POLICY "cohort_service_all"
  ON ruflo_demo.ruflo_demo_cohort_read_model
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------

GRANT SELECT ON ruflo_demo.ruflo_demo_learner_metrics_read_model TO authenticated;
GRANT ALL    ON ruflo_demo.ruflo_demo_learner_metrics_read_model TO service_role;

GRANT SELECT ON ruflo_demo.ruflo_demo_cohort_read_model TO authenticated;
GRANT ALL    ON ruflo_demo.ruflo_demo_cohort_read_model TO service_role;

-- ----------------------------------------------------------------
-- Seed: default demo cohort
-- ----------------------------------------------------------------
INSERT INTO ruflo_demo.ruflo_demo_cohort_read_model
  (name, instructor_id, learner_ids, updated_at)
VALUES
  ('Demo Cohort', NULL, '{}', now())
ON CONFLICT DO NOTHING;
