-- Migration 018: Add unique constraint for skill lab attempt upsert
-- Required for ON CONFLICT (learner_id, exercise_id) in SkillLabController.submitAttempt
-- Date: 2026-06-10

SET search_path TO ruflo_demo, public;

DO $$ BEGIN
  ALTER TABLE ruflo_demo.ruflo_demo_exercise_attempt_read_model
    ADD CONSTRAINT uq_attempt_learner_exercise UNIQUE (learner_id, exercise_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
