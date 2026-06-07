-- Migration: authenticated_read policy for the badge read model
-- Date: 2026-06-07
-- Purpose: Mirror the existing certification_progress / learner_profile read
--          models, which expose an authenticated_read policy alongside the
--          strict owner_read. Without it, GET /certification/learners/:id/badges
--          returns empty even for authenticated callers.
-- Spec: ADR-011 (CQRS read-model RLS conventions).
-- Idempotent-ish: drop-if-exists then create so re-runs are safe.

DROP POLICY IF EXISTS badge_authenticated_read
  ON ruflo_demo.ruflo_demo_badge_read_model;

CREATE POLICY badge_authenticated_read
  ON ruflo_demo.ruflo_demo_badge_read_model FOR SELECT
  USING (auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]));
