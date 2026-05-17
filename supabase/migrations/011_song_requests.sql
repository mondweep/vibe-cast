-- Migration 011: song_requests queue
--
-- Lets visitors submit a YouTube URL they'd like added to the verified library.
-- The curator processes these from /queue and either takes them through the
-- normal verify flow or rejects with a reason.
--
-- Trust model:
--   - Anyone (anon or signed-in) can INSERT a request.
--   - Only the curator can SELECT/UPDATE (RLS based on the same allowlist
--     used by verifySong: mondweep@gmail.com and mondweep@dxsure.uk).
--   - A unique partial index on (video_id) WHERE status='pending' prevents
--     duplicate pending requests for the same video at the DB layer.
--
-- See: api/routes/songRequests.ts for the server-side flow (including
-- Telegram notification on insert).

create table if not exists song_requests (
  id                    uuid primary key default gen_random_uuid(),
  video_id              text not null,
  youtube_url           text not null,
  title                 text,
  notes                 text,
  requested_by_user_id  uuid references auth.users (id) on delete set null,
  requested_by_email    text,
  visitor_id            text,
  status                text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'duplicate')),
  rejection_reason      text,
  created_at            timestamptz not null default now(),
  processed_at          timestamptz,
  processed_by          uuid references auth.users (id) on delete set null
);

-- Dedup at the DB layer: at most one pending request per video.
-- Accepted/rejected rows are kept for audit (so a new pending can replace them).
create unique index if not exists song_requests_pending_unique_video_idx
  on song_requests (video_id)
  where status = 'pending';

-- Common queries: list pending, list by visitor for rate limiting.
create index if not exists song_requests_status_created_idx
  on song_requests (status, created_at desc);

create index if not exists song_requests_visitor_created_idx
  on song_requests (visitor_id, created_at desc)
  where visitor_id is not null;

alter table song_requests enable row level security;

-- INSERT: open to everyone (anon + auth). The server endpoint enforces
-- rate-limit + dedup + title enrichment before letting a row land here, but
-- the table policy itself is permissive so the public form just works.
drop policy if exists "Anyone can submit a song request" on song_requests;
create policy "Anyone can submit a song request"
  on song_requests
  for insert
  to anon, authenticated
  with check (true);

-- SELECT/UPDATE: curator-only. Same allowlist the verifySong route enforces.
-- Anonymous visitors and non-curator authenticated users cannot read the queue.
drop policy if exists "Curator can read song requests" on song_requests;
create policy "Curator can read song requests"
  on song_requests
  for select
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

drop policy if exists "Curator can update song requests" on song_requests;
create policy "Curator can update song requests"
  on song_requests
  for update
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

-- Service role bypasses RLS by default but be explicit so the server-side
-- Telegram notify + bulk operations always work.
drop policy if exists "Service role manages song requests" on song_requests;
create policy "Service role manages song requests"
  on song_requests
  for all
  to service_role
  using (true)
  with check (true);

-- Reload PostgREST so the new table + columns are visible immediately.
notify pgrst, 'reload schema';
