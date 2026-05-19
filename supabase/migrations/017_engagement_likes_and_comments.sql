-- Migration 017: engagement tables (likes + comments)
--
-- Phase 1 of the user-engagement feature (KANBAN: ENG-001). Authenticated
-- users can like songs (one row per (song, user)) and post plain song-level
-- comments below the lyrics panel on /play. Pagination is cursor-based on
-- `created_at` so newly arriving comments don't shift page boundaries.
--
-- Trust model:
--   - Likes: any authenticated user may insert/delete their own (song,user)
--     row. Counts are publicly readable.
--   - Comments: any authenticated user may insert; only the author may
--     update/delete their own row; curators may update any row (used for
--     hide/flag in phase 1 — full moderation tooling comes in MOD-001).
--   - Both tables enable RLS; anonymous visitors get read access to
--     visible comments and aggregate like counts only.
--
-- See: api/routes/engagement.ts for the server-side flow.

-- ---------------------------------------------------------------------------
-- song_likes
-- ---------------------------------------------------------------------------
create table if not exists song_likes (
  song_id    uuid not null references songs (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (song_id, user_id)
);

-- Index for "how many likes does this song have" — primary key already
-- covers (song_id, user_id) so a count(*) over song_id uses it.
create index if not exists song_likes_song_idx on song_likes (song_id);
create index if not exists song_likes_user_idx on song_likes (user_id);

alter table song_likes enable row level security;

-- SELECT: anyone can read; we expose aggregate counts on /play and Library.
drop policy if exists "Anyone reads song likes" on song_likes;
create policy "Anyone reads song likes"
  on song_likes
  for select
  to anon, authenticated
  using (true);

-- INSERT: authenticated users may insert their own like.
drop policy if exists "Authed users like songs" on song_likes;
create policy "Authed users like songs"
  on song_likes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- DELETE: authenticated users may delete their own like (unlike).
drop policy if exists "Authed users unlike songs" on song_likes;
create policy "Authed users unlike songs"
  on song_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- song_comments
-- ---------------------------------------------------------------------------
create table if not exists song_comments (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references songs (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  -- Denormalised author display name. Kept on the row so deleted users
  -- still display readable attribution ("[former user] said…"), and so we
  -- don't have to join into auth.users (which is locked-down) at read time.
  author_name text,
  body        text not null check (length(trim(body)) between 1 and 4000),
  -- status drives visibility. 'visible' is public; 'hidden' is curator-acted
  -- (kept for audit; not returned to anonymous readers); 'flagged' is
  -- user-reported pending review. Phase-1 just supports visible/hidden.
  status      text not null default 'visible'
    check (status in ('visible', 'hidden', 'flagged')),
  hidden_reason text,
  hidden_at   timestamptz,
  hidden_by   uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);

-- Pagination index: most recent first per song.
create index if not exists song_comments_song_created_idx
  on song_comments (song_id, created_at desc);

-- User's own comments (for "edit/delete my comment" RLS check, and any future
-- per-user view of comment history).
create index if not exists song_comments_user_idx
  on song_comments (user_id);

alter table song_comments enable row level security;

-- SELECT: anyone reads visible comments. Curators additionally see hidden
-- ones (for the moderation queue) — implemented as a second policy.
drop policy if exists "Anyone reads visible comments" on song_comments;
create policy "Anyone reads visible comments"
  on song_comments
  for select
  to anon, authenticated
  using (status = 'visible');

drop policy if exists "Curator reads all comments" on song_comments;
create policy "Curator reads all comments"
  on song_comments
  for select
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      (select lower(email) from curator_allowlist)
  );

-- INSERT: authenticated users may insert as themselves.
drop policy if exists "Authed users post comments" on song_comments;
create policy "Authed users post comments"
  on song_comments
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: author may edit body + edited_at; curator may update any row
-- (used for status/hidden_reason changes in moderation).
drop policy if exists "Author edits own comment" on song_comments;
create policy "Author edits own comment"
  on song_comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Curator moderates comments" on song_comments;
create policy "Curator moderates comments"
  on song_comments
  for update
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      (select lower(email) from curator_allowlist)
  );

-- DELETE: author may delete their own; curator may delete any (matches
-- the moderation pattern used elsewhere in the schema).
drop policy if exists "Author deletes own comment" on song_comments;
create policy "Author deletes own comment"
  on song_comments
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Curator deletes any comment" on song_comments;
create policy "Curator deletes any comment"
  on song_comments
  for delete
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      (select lower(email) from curator_allowlist)
  );

-- Service role bypasses RLS by default; be explicit so the server-side
-- digest job + moderation tooling always work.
drop policy if exists "Service role manages likes" on song_likes;
create policy "Service role manages likes"
  on song_likes
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages comments" on song_comments;
create policy "Service role manages comments"
  on song_comments
  for all
  to service_role
  using (true)
  with check (true);

-- Reload PostgREST so the new tables are visible immediately.
notify pgrst, 'reload schema';
