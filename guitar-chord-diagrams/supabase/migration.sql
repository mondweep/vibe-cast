-- Supabase SQL migration for ChordLab session tracking
-- Run this in the Supabase SQL Editor to set up the schema

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sessions table
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  duration_ms integer,
  tuning text default 'Standard' not null,
  chord_count integer default 0 not null
);

alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

-- Session chords table
create table if not exists public.session_chords (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  chord_name text not null,
  root text not null,
  quality text not null,
  timestamp_ms integer not null,
  duration_ms integer default 0 not null,
  source text default 'search' not null check (source in ('audio', 'search')),
  confidence real
);

alter table public.session_chords enable row level security;

create policy "Users can view own session chords"
  on public.session_chords for select
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_chords.session_id
      and sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert own session chords"
  on public.session_chords for insert
  with check (
    exists (
      select 1 from public.sessions
      where sessions.id = session_chords.session_id
      and sessions.user_id = auth.uid()
    )
  );

-- Indexes for common queries
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_started_at on public.sessions(started_at desc);
create index if not exists idx_session_chords_session_id on public.session_chords(session_id);
