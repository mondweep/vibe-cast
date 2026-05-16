-- Consent + extended profile capture.
--
-- This migration adds:
--   1. Extended profile fields: linkedin_url, geo_country/region/city,
--      ip_address, consent_at, consent_version. Captured at signup +
--      first authenticated request; visible to the user (own row only)
--      and curator (all rows).
--   2. consent_log table: append-only record of every "I agree" click,
--      including anonymous visitors keyed by a browser-generated
--      visitor_id (UUID stored in localStorage). Used to demonstrate
--      consent capture for compliance.
--   3. handle_new_user() trigger: when a new auth.users row is created
--      (sign-up via email or OAuth), insert a corresponding profiles
--      row. Closes the "missing profiles row" issue flagged in the
--      README's remaining-issues list.

------------------------------------------------------------
-- 1. profiles additions
------------------------------------------------------------
alter table public.profiles
  add column if not exists linkedin_url     text,
  add column if not exists geo_country      text,
  add column if not exists geo_region       text,
  add column if not exists geo_city         text,
  add column if not exists ip_address       text,
  add column if not exists consent_at       timestamptz,
  add column if not exists consent_version  text;

create index if not exists idx_profiles_geo_country on public.profiles(geo_country);

------------------------------------------------------------
-- 2. consent_log
------------------------------------------------------------
create table if not exists public.consent_log (
  id              uuid primary key default gen_random_uuid(),
  visitor_id      text not null,                                   -- browser-generated UUID, stored in localStorage
  user_id         uuid references auth.users(id) on delete set null, -- set if the visitor was signed in
  consent_at      timestamptz not null default now(),
  consent_version text not null,
  ip_address      text,
  user_agent      text
);

create index if not exists idx_consent_visitor on public.consent_log(visitor_id);
create index if not exists idx_consent_user    on public.consent_log(user_id);

alter table public.consent_log enable row level security;

drop policy if exists "Anyone can write consent" on public.consent_log;
create policy "Anyone can write consent" on public.consent_log
  for insert
  with check (true);

drop policy if exists "Curator can read consent" on public.consent_log;
create policy "Curator can read consent" on public.consent_log
  for select
  using (
    (auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

drop policy if exists "Service role can manage consent" on public.consent_log;
create policy "Service role can manage consent" on public.consent_log
  for all
  using (auth.role() = 'service_role');

------------------------------------------------------------
-- 3. handle_new_user() trigger
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      new.email
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

------------------------------------------------------------
-- 4. PostgREST cache refresh
------------------------------------------------------------
notify pgrst, 'reload schema';
