-- Learner profiles table for storing progress and preferences
create table if not exists public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  data jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for user lookups
create index if not exists learner_profiles_user_id_idx on public.learner_profiles(user_id);

-- Enable RLS
alter table public.learner_profiles enable row level security;

-- Policy: Users can only read/write their own profile
create policy "Users can read their own profile" on public.learner_profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile" on public.learner_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert their own profile" on public.learner_profiles
  for insert
  with check (auth.uid() = user_id);
