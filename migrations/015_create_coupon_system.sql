-- Migration 015: Freemium Coupon Access Control (ADR-018)
-- Date: 2026-06-09
-- Purpose: Coupon-based access gate for premium (INTERMEDIATE / ADVANCED) paths.
--          Beginner stays free. Coupons are admin-minted, time-bound tokens; a
--          redemption is a per-learner grant whose expiry is snapshotted at
--          redeem time so renewals never accidentally resurrect lapsed access.
-- Spec: ADR-018. Relates to ADR-013 (Learning Domain), ADR-011 (CQRS naming).
-- Schema: ruflo_demo (doubled-prefix table naming, consistent with 001/002/008/013).
-- Idempotent: CREATE ... IF NOT EXISTS + guarded policies, safe to re-run.

SET search_path TO ruflo_demo, public;

-- ============================================================
-- 1. Coupon (the issuable, admin-minted access token)
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_coupon (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(32)  UNIQUE NOT NULL,                                   -- e.g. RUFLO-AB12-CD34
  tier_access  TEXT[]       NOT NULL DEFAULT ARRAY['INTERMEDIATE','ADVANCED'], -- tiers unlocked; 'ALL' = wildcard
  expires_at   TIMESTAMPTZ  NOT NULL,                                          -- coupon expiry (renew extends this)
  max_uses     INTEGER      NOT NULL DEFAULT 1,                                -- distinct learners that may redeem
  use_count    INTEGER      NOT NULL DEFAULT 0,                                -- incremented on each new redemption
  issued_by    UUID,                                                          -- admin user id; null for system-issued
  notes        TEXT,                                                          -- admin notes
  is_active    BOOLEAN      NOT NULL DEFAULT true,                            -- soft-deactivate flag
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_code
  ON ruflo_demo.ruflo_demo_coupon (code);
CREATE INDEX IF NOT EXISTS idx_coupon_active
  ON ruflo_demo.ruflo_demo_coupon (is_active, expires_at);

-- ============================================================
-- 2. Coupon Redemption (per-learner grant; one row per learner+coupon)
--    access_expires_at is a SNAPSHOT of coupon.expires_at at redeem time so
--    that renewing a coupon does not silently re-grant lapsed access (ADR-018).
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_coupon_redemption (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id          UUID        NOT NULL REFERENCES ruflo_demo.ruflo_demo_coupon(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL,                       -- the learner (auth.uid())
  redeemed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_expires_at  TIMESTAMPTZ NOT NULL,                       -- snapshot of coupon.expires_at at redeem time
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_redemption_user
  ON ruflo_demo.ruflo_demo_coupon_redemption (user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_user_active
  ON ruflo_demo.ruflo_demo_coupon_redemption (user_id, access_expires_at);

-- ============================================================
-- 3. RLS — coupon
--    service_role: full access. authenticated: read active + non-expired
--    (pre-validate a code before redeeming). anon: no access.
-- ============================================================
ALTER TABLE ruflo_demo.ruflo_demo_coupon ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY coupon_service_all
    ON ruflo_demo.ruflo_demo_coupon
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY coupon_auth_read_active
    ON ruflo_demo.ruflo_demo_coupon
    FOR SELECT
    TO authenticated
    USING (is_active = true AND expires_at > NOW());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 4. RLS — coupon_redemption
--    service_role: full access. authenticated: read + insert OWN rows only.
-- ============================================================
ALTER TABLE ruflo_demo.ruflo_demo_coupon_redemption ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY redemption_service_all
    ON ruflo_demo.ruflo_demo_coupon_redemption
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY redemption_own_read
    ON ruflo_demo.ruflo_demo_coupon_redemption
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY redemption_own_insert
    ON ruflo_demo.ruflo_demo_coupon_redemption
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 5. Grants (consistent with 001/002/008/013)
-- ============================================================
GRANT SELECT ON ruflo_demo.ruflo_demo_coupon TO authenticated;
GRANT SELECT, INSERT ON ruflo_demo.ruflo_demo_coupon_redemption TO authenticated;
GRANT ALL ON ruflo_demo.ruflo_demo_coupon TO service_role;
GRANT ALL ON ruflo_demo.ruflo_demo_coupon_redemption TO service_role;
