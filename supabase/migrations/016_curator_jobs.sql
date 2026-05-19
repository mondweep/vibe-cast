-- Migration 016: curator-job infrastructure
--
-- Adds the scaffolding the nightly + ad-hoc curator job prompts depend on:
--
--   1. private.secrets — a service-role-only keystore for the credentials
--      the job prompts need at run time (Telegram bot token, YouTube Data
--      API key, curator UUID). RLS-locked with no policies, so nothing
--      can read it through PostgREST. The Supabase MCP runs as service
--      role, which bypasses RLS, and that's how the job prompts pick the
--      values up — see docs/curator/.
--
--   2. pending_candidates.video_id UNIQUE constraint — both job prompts
--      use ON CONFLICT (video_id) DO NOTHING when inserting candidates.
--      Without a unique constraint, that clause errors at parse time.
--
-- The migration deliberately does NOT seed real secret values. After
-- applying, populate the table from the Supabase SQL editor (see the
-- INSERT template at the bottom of this file).

------------------------------------------------------------
-- 1. private schema + secrets table
------------------------------------------------------------
create schema if not exists private;

create table if not exists private.secrets (
  key         text        primary key,
  value       text        not null,
  description text,
  updated_at  timestamptz not null default now()
);

alter table private.secrets enable row level security;
-- No policies. anon + authenticated roles have no read/write access.
-- Service role (used by the Supabase MCP) bypasses RLS and reads the
-- table from inside the job prompts.

comment on table private.secrets is
  'Service-role-only keystore for nightly + ad-hoc curator jobs. '
  'Never expose through PostgREST — the private schema is not in the '
  'exposed-schemas list by default.';

------------------------------------------------------------
-- 2. pending_candidates.video_id unique constraint
------------------------------------------------------------
-- ON CONFLICT needs this. Wrapped in a do-block so re-running the
-- migration on a database that already has the constraint is a no-op
-- rather than a hard error.
do $$
begin
  alter table public.pending_candidates
    add constraint pending_candidates_video_id_key unique (video_id);
exception
  when duplicate_object then null;        -- already exists, fine
  when duplicate_table  then null;        -- index already exists, fine
end $$;

------------------------------------------------------------
-- 3. PostgREST schema reload
------------------------------------------------------------
notify pgrst, 'reload schema';

------------------------------------------------------------
-- POST-MIGRATION: populate secrets from the SQL editor
------------------------------------------------------------
-- Do NOT commit real values to this file. After applying the migration,
-- run the following in the Supabase SQL editor (it's idempotent):
--
--   insert into private.secrets (key, value, description) values
--     ('TELEGRAM_BOT_TOKEN',
--      '<paste freshly-rotated BotFather token>',
--      'BotFather token for SanskritSync curator alerts'),
--     ('YOUTUBE_API_KEY',
--      '<paste YouTube Data API v3 key>',
--      'YouTube Data API v3 key for nightly discovery'),
--     ('CURATOR_USER_ID',
--      '905129fb-921a-44c4-b80d-47316923d506',
--      'Curator profile.id (matches auth.users.id)')
--   on conflict (key) do update
--     set value = excluded.value,
--         updated_at = now();
--
-- Rotate the Telegram token if you've ever pasted the old one into a
-- chat, screenshot, or doc — it's effectively public the moment that
-- happens.
