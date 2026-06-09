-- Migration 016: Add email assignment to coupons (ADR-018 extension)
-- Date: 2026-06-09
-- Purpose: Optional 1:1 assignee tracking on a coupon. When an admin mints a
--          coupon they may record the intended learner's email + name. At
--          redemption time these can be cross-referenced against the redeeming
--          user. Path-specificity (Intermediate vs Advanced) continues to use
--          the existing tier_access TEXT[] column — no schema change needed.
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS, safe to re-run.

SET search_path TO ruflo_demo, public;

ALTER TABLE ruflo_demo.ruflo_demo_coupon
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_name  TEXT;

CREATE INDEX IF NOT EXISTS idx_coupon_assigned_email
  ON ruflo_demo.ruflo_demo_coupon (assigned_to_email)
  WHERE assigned_to_email IS NOT NULL;
