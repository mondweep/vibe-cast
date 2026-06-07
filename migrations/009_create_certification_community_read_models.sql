-- Migration: Certification catalog + badge read models, plus community/enrollment seed
-- Date: 2026-06-07
-- Purpose: Close frontend<->backend contract gaps (read side). The SPA calls
--          list/detail certifications, learner badges, leaderboard, member search
--          and single-enrollment reads, but no backing read models existed.
-- Spec: ADR-011 (CQRS read-model strategy), ADR-013 Phase 3 (read endpoints).
-- Schema: ruflo_demo (doubled-prefix table naming, RLS, anon/authenticated SELECT).
-- Idempotent: CREATE ... IF NOT EXISTS; seed uses ON CONFLICT DO NOTHING.

-- ============================================================
-- 1. Certification Catalog Read Model (public)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_certification_read_model (
  certification_id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  domain VARCHAR(20) NOT NULL DEFAULT 'tech',          -- tech | business | creative
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner',  -- beginner | intermediate | advanced
  duration_hours INTEGER NOT NULL DEFAULT 0,
  exam_count INTEGER NOT NULL DEFAULT 0,
  badge_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_certification_difficulty
  ON ruflo_demo.ruflo_demo_certification_read_model(difficulty);
CREATE INDEX IF NOT EXISTS idx_certification_domain
  ON ruflo_demo.ruflo_demo_certification_read_model(domain);

ALTER TABLE ruflo_demo.ruflo_demo_certification_read_model ENABLE ROW LEVEL SECURITY;

CREATE POLICY certification_public_read
  ON ruflo_demo.ruflo_demo_certification_read_model FOR SELECT
  USING (status = 'PUBLISHED' OR auth.role() = 'service_role');
CREATE POLICY certification_service_update
  ON ruflo_demo.ruflo_demo_certification_read_model FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY certification_service_insert
  ON ruflo_demo.ruflo_demo_certification_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. Badge Read Model (per-learner earned badges — owner read)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_badge_read_model (
  badge_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  certification_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner',
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  projection_version INTEGER NOT NULL DEFAULT 1,
  last_synced_event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (badge_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_badge_learner
  ON ruflo_demo.ruflo_demo_badge_read_model(learner_id);

ALTER TABLE ruflo_demo.ruflo_demo_badge_read_model ENABLE ROW LEVEL SECURITY;

-- Learners read their own badges; service role manages projection.
CREATE POLICY badge_own_read
  ON ruflo_demo.ruflo_demo_badge_read_model FOR SELECT
  USING (auth.uid()::uuid = learner_id OR auth.role() = 'service_role');
CREATE POLICY badge_service_update
  ON ruflo_demo.ruflo_demo_badge_read_model FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY badge_service_insert
  ON ruflo_demo.ruflo_demo_badge_read_model FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. Grants (consistent with 001/002)
-- ============================================================
GRANT SELECT ON ALL TABLES IN SCHEMA ruflo_demo TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ruflo_demo TO service_role;

-- ============================================================
-- 4. Seed certifications (representative; badge_id links to badge catalog).
--    Beginner cert maps to the seeded Beginner Path concept (PRD §4.4).
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_certification_read_model
  (certification_id, name, description, domain, difficulty, duration_hours, exam_count, badge_id, status)
VALUES
  ('c0000000-0000-4000-8000-000000000001',
   'Agent Orchestration Fundamentals',
   'Foundational certification covering agent systems, message passing, and your first deployed swarm.',
   'tech', 'beginner', 40, 2, 'a0000000-0000-4000-8000-000000000001', 'PUBLISHED'),
  ('c0000000-0000-4000-8000-000000000002',
   'Multi-Agent Systems Engineering',
   'Design, scale, and operate resilient multi-agent orchestrations in production.',
   'tech', 'intermediate', 60, 3, 'a0000000-0000-4000-8000-000000000002', 'PUBLISHED'),
  ('c0000000-0000-4000-8000-000000000003',
   'Distributed Agent Architecture',
   'Expert-level certification on distributed coordination, consensus, and fault tolerance.',
   'tech', 'advanced', 80, 4, 'a0000000-0000-4000-8000-000000000003', 'PUBLISHED'),
  ('c0000000-0000-4000-8000-000000000004',
   'AI Product Strategy',
   'Translate agentic capabilities into product roadmaps and business outcomes.',
   'business', 'intermediate', 30, 2, 'a0000000-0000-4000-8000-000000000004', 'PUBLISHED')
ON CONFLICT (certification_id) DO NOTHING;

-- ============================================================
-- 5. Seed community profiles (so leaderboard + member search render).
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_community_profile_read_model
  (learner_id, display_name, badge_count, skill_count, reputation_score, badges, skills)
VALUES
  ('d0000000-0000-4000-8000-000000000001', 'Ada Lovelace',   3, 5, 980, '[]', '[]'),
  ('d0000000-0000-4000-8000-000000000002', 'Alan Turing',    2, 4, 870, '[]', '[]'),
  ('d0000000-0000-4000-8000-000000000003', 'Grace Hopper',   2, 3, 760, '[]', '[]'),
  ('d0000000-0000-4000-8000-000000000004', 'Katherine Johnson', 1, 2, 540, '[]', '[]'),
  ('d0000000-0000-4000-8000-000000000005', 'Margaret Hamilton', 1, 2, 430, '[]', '[]')
ON CONFLICT (learner_id) DO NOTHING;

-- ============================================================
-- 6. Seed a demo learner's enrollments + earned badges (Ada).
--    Lets getEnrollment / getLearnerBadges return representative data.
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_certification_progress_read_model
  (enrollment_id, learner_id, certification_id, enrollment_status, current_grade, badge_status, issued_badge_id)
VALUES
  ('e0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001',
   'COMPLETED', 92, 'ISSUED', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000002',
   'd0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000002',
   'IN_PROGRESS', NULL, 'NONE', NULL)
ON CONFLICT (enrollment_id) DO NOTHING;

INSERT INTO ruflo_demo.ruflo_demo_badge_read_model
  (badge_id, learner_id, certification_id, name, description, image_url, difficulty)
VALUES
  ('a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001',
   'Agent Orchestration Fundamentals',
   'Awarded for completing the Agent Orchestration Fundamentals certification.',
   '', 'beginner')
ON CONFLICT (badge_id, learner_id) DO NOTHING;
