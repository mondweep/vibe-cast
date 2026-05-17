-- Migration 012: feedback CRM
--
-- Lets visitors submit comments, product suggestions, and applications to
-- become a curator of the verified library. The curator processes these
-- from /queue (Feedback tab) alongside song requests.
--
-- Three kinds:
--   - 'comment'              — free-form feedback, can be public
--   - 'suggestion'           — product/feature suggestions, can be public
--   - 'curator_application'  — requires name + email even from anonymous
--                              visitors; never public until accepted
--
-- Trust model mirrors song_requests:
--   - Anyone (anon or signed-in) can INSERT.
--   - Only the curator can SELECT/UPDATE (RLS based on the same allowlist).
--
-- See: api/routes/feedback.ts for the server-side flow + Telegram notify.

create table if not exists feedback (
  id                    uuid primary key default gen_random_uuid(),
  kind                  text not null
    check (kind in ('comment', 'suggestion', 'curator_application')),

  -- Submission body
  subject               text,
  body                  text not null,

  -- Curator-application-only fields (null for other kinds; the server enforces
  -- the conditional requirements before insert).
  applicant_name        text,
  sanskrit_background   text,
  traditions_familiar   text,
  weekly_hours          int,
  motivation            text,

  -- Identity & contact (best we can capture from each submission tier)
  requested_by_user_id  uuid references auth.users (id) on delete set null,
  requested_by_email    text,
  visitor_id            text,
  display_name          text,

  -- Curator workflow
  status                text not null default 'new'
    check (status in ('new', 'in_progress', 'responded', 'closed', 'accepted', 'rejected')),
  internal_notes        text,
  response_summary      text,

  -- D3: visitor opt-in for public display. The form has a "make this public"
  -- checkbox; the curator can also flip this from /queue if needed. Public
  -- display surfaces (a "recent feedback" wall) will read this flag.
  is_public             boolean not null default false,

  created_at            timestamptz not null default now(),
  processed_at          timestamptz,
  processed_by          uuid references auth.users (id) on delete set null
);

-- Common queries: list by status, list public for the public wall, per-visitor
-- rate limiting.
create index if not exists feedback_status_created_idx
  on feedback (status, created_at desc);

create index if not exists feedback_kind_status_idx
  on feedback (kind, status, created_at desc);

create index if not exists feedback_public_created_idx
  on feedback (created_at desc)
  where is_public = true;

create index if not exists feedback_visitor_created_idx
  on feedback (visitor_id, created_at desc)
  where visitor_id is not null;

alter table feedback enable row level security;

-- INSERT: open to everyone. Server enforces rate-limit + kind-specific
-- required-field validation before letting a row land here.
drop policy if exists "Anyone can submit feedback" on feedback;
create policy "Anyone can submit feedback"
  on feedback
  for insert
  to anon, authenticated
  with check (true);

-- SELECT/UPDATE: curator-only.
drop policy if exists "Curator can read feedback" on feedback;
create policy "Curator can read feedback"
  on feedback
  for select
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

drop policy if exists "Curator can update feedback" on feedback;
create policy "Curator can update feedback"
  on feedback
  for update
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

-- Service role bypass (for the server-side Telegram notify path + future
-- bulk operations).
drop policy if exists "Service role manages feedback" on feedback;
create policy "Service role manages feedback"
  on feedback
  for all
  to service_role
  using (true)
  with check (true);

-- Public can read publicly-marked feedback that the curator has approved
-- (status = 'responded' OR 'accepted'). Comments and suggestions only; never
-- curator applications, even when marked public. This policy is the
-- groundwork for a future "recent feedback" page; the table is queryable
-- via the anon key right now via this policy if a public view is built.
drop policy if exists "Public can read approved public feedback" on feedback;
create policy "Public can read approved public feedback"
  on feedback
  for select
  to anon, authenticated
  using (
    is_public = true
    and kind in ('comment', 'suggestion')
    and status in ('responded', 'accepted', 'closed')
  );

-- Reload PostgREST so the new table + columns are visible immediately.
notify pgrst, 'reload schema';
