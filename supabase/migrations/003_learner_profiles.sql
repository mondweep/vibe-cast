-- ============================================================
-- Migration 003: Learner profiles for optional user capture
-- ============================================================

CREATE TABLE IF NOT EXISTS learner_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  name          TEXT,
  linkedin_url  TEXT,
  wants_updates BOOLEAN     DEFAULT false,
  country       TEXT,
  persona       TEXT,
  source        TEXT        DEFAULT 'consent_gate',
  consented_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email   ON learner_profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON learner_profiles (country);
CREATE INDEX IF NOT EXISTS idx_profiles_updates ON learner_profiles (wants_updates) WHERE wants_updates = true;

-- RLS
ALTER TABLE learner_profiles ENABLE ROW LEVEL SECURITY;

-- Drop before recreate (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Service write learner_profiles" ON learner_profiles;
  DROP POLICY IF EXISTS "Anon insert learner_profiles"   ON learner_profiles;
END $$;

-- Service role: full access (for analytics queries)
CREATE POLICY "Service write learner_profiles"
  ON learner_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Anon: insert only (users can submit their profile)
CREATE POLICY "Anon insert learner_profiles"
  ON learner_profiles FOR INSERT
  WITH CHECK (true);

-- Analytics view: profiles wanting updates (for outreach)
CREATE OR REPLACE VIEW outreach_list AS
SELECT
  name,
  email,
  linkedin_url,
  country,
  persona,
  consented_at
FROM learner_profiles
WHERE wants_updates = true
ORDER BY consented_at DESC;

GRANT SELECT ON outreach_list TO anon;
