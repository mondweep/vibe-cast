-- Migration 009: 24-hour curator-review window + pending_candidates queue.
--
-- Enables the nightly auto-curation flow:
--   - Auto-added songs land with pending_curator_review = true, visible
--     only to the curator for 24 hours, then promoted to public.
--   - Low-confidence candidates go into pending_candidates and the
--     scheduled Claude task pings Telegram for manual review.
--
-- Designed for the FREE-PATH architecture (Claude runs in a Cowork
-- scheduled task and writes directly via the Supabase MCP). No backend
-- endpoints depend on these tables — they're consumed only by the
-- nightly Claude prompt and (for songs) the existing /library + /play UI.

------------------------------------------------------------
-- 1. songs additions
------------------------------------------------------------
alter table public.songs
  add column if not exists pending_curator_review boolean not null default false,
  add column if not exists auto_added_at timestamptz;

create index if not exists idx_songs_pending_review
  on public.songs (pending_curator_review, auto_added_at)
  where pending_curator_review = true;

------------------------------------------------------------
-- 2. Update public-read RLS so pending songs are hidden until promoted
------------------------------------------------------------
drop policy if exists "Public can read verified songs" on public.songs;
create policy "Public can read verified songs" on public.songs
  for select
  using (verified = true and pending_curator_review = false);

-- Curator-can-manage policy from migration 007 already grants the
-- curator email full read/write, so review-pending songs remain
-- visible to them via direct /play?v=… links and Supabase queries.

------------------------------------------------------------
-- 3. pending_candidates queue
------------------------------------------------------------
create table if not exists public.pending_candidates (
  id                   uuid primary key default gen_random_uuid(),
  video_id             text unique not null,
  proposed_title       text,
  proposed_lyrics_json jsonb,
  confidence_score     float,
  telegram_message_id  text,
  status               text not null default 'pending'
                         check (status in ('pending','approved','rejected')),
  reason_for_review    text,
  created_at           timestamptz not null default now(),
  decided_at           timestamptz
);

create index if not exists idx_pending_status on public.pending_candidates (status);

alter table public.pending_candidates enable row level security;

drop policy if exists "Curator can manage pending" on public.pending_candidates;
create policy "Curator can manage pending" on public.pending_candidates
  for all
  using ((auth.jwt() ->> 'email') in ('mondweep@gmail.com','mondweep@dxsure.uk'))
  with check ((auth.jwt() ->> 'email') in ('mondweep@gmail.com','mondweep@dxsure.uk'));

drop policy if exists "Service role can manage pending" on public.pending_candidates;
create policy "Service role can manage pending" on public.pending_candidates
  for all
  using (auth.role() = 'service_role');

------------------------------------------------------------
-- 4. PostgREST cache refresh so new table is reachable via REST API
------------------------------------------------------------
notify pgrst, 'reload schema';
