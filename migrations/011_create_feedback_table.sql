-- Migration: Feedback & contact submissions
-- Date: 2026-06-08
-- Purpose: Store learner feedback from the in-app "Feedback & contact" form
--          (comments, feature suggestions, and content-error reports — the last
--          ties to the accuracy-first principle: anyone can flag a command,
--          lesson, tutor answer, or knowledge-graph node that looks wrong).
-- Privacy: anonymous submission is allowed (INSERT for anon/authenticated), but
--          rows are NOT publicly readable — only service_role can read them, so
--          submitted names/emails/messages stay private. The `allow_public`
--          flag records consent for a future, moderated public feedback wall.
-- Idempotent-ish: IF NOT EXISTS + drop-if-exists policies so re-runs are safe.

CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_feedback (
  feedback_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     VARCHAR(32) NOT NULL
                 CHECK (category IN ('comment', 'suggestion', 'content_error')),
  subject      TEXT NOT NULL DEFAULT '',
  message      TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  page_context TEXT NOT NULL DEFAULT '',   -- optional: where the form was opened (path/lesson)
  user_id      UUID,                        -- set when a signed-in learner submits
  allow_public BOOLEAN NOT NULL DEFAULT false,
  status       VARCHAR(16) NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'reviewed', 'published', 'archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON ruflo_demo.ruflo_demo_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON ruflo_demo.ruflo_demo_feedback(category);

ALTER TABLE ruflo_demo.ruflo_demo_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may submit feedback...
DROP POLICY IF EXISTS feedback_public_insert ON ruflo_demo.ruflo_demo_feedback;
CREATE POLICY feedback_public_insert ON ruflo_demo.ruflo_demo_feedback
  FOR INSERT WITH CHECK (true);

-- ...but only the service role may read/manage it (submissions stay private).
DROP POLICY IF EXISTS feedback_service_all ON ruflo_demo.ruflo_demo_feedback;
CREATE POLICY feedback_service_all ON ruflo_demo.ruflo_demo_feedback
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant INSERT (not SELECT) to anon/authenticated; full access to service_role.
GRANT INSERT ON ruflo_demo.ruflo_demo_feedback TO anon, authenticated;
GRANT ALL ON ruflo_demo.ruflo_demo_feedback TO service_role;
