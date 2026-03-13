-- Create profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at timestamptz default now() not null,
  total_words int default 0 not null,
  current_streak int default 0 not null,
  last_active_date date
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- Global Sanskrit word dictionary
create table if not exists public.words (
  id uuid default gen_random_uuid() primary key,
  devanagari text not null,
  iast text not null,
  root_dhatu text,
  meaning_short text not null,
  meaning_full text,
  category text,
  created_at timestamptz default now() not null,
  unique(devanagari, iast)
);

-- Anyone authenticated can read words
alter table public.words enable row level security;
create policy "Authenticated users can read words" on public.words
  for select using (auth.role() = 'authenticated');
-- Service role can insert/update words (done by backend)
create policy "Service role can manage words" on public.words
  for all using (auth.role() = 'service_role');

create index idx_words_devanagari on public.words(devanagari);
create index idx_words_iast on public.words(iast);
create table if not exists public.user_vocabulary (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  encounter_count int default 1 not null,
  first_seen_at timestamptz default now() not null,
  last_seen_at timestamptz default now() not null,
  familiarity float default 0.0 not null check (familiarity >= 0.0 and familiarity <= 1.0),
  marked_learned boolean default false not null,
  marked_revision boolean default false not null,
  srs_interval int default 1 not null,
  srs_ease_factor float default 2.5 not null,
  srs_next_review timestamptz default now() not null,
  unique(user_id, word_id)
);

alter table public.user_vocabulary enable row level security;
create policy "Users can manage own vocabulary" on public.user_vocabulary
  for all using (auth.uid() = user_id);

create index idx_user_vocab_user on public.user_vocabulary(user_id);
create index idx_user_vocab_familiarity on public.user_vocabulary(user_id, familiarity);
create index idx_user_vocab_srs on public.user_vocabulary(user_id, srs_next_review);
create table if not exists public.word_encounters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  song_id uuid not null,
  line_number int not null,
  encountered_at timestamptz default now() not null,
  looked_up boolean default false not null
);

alter table public.word_encounters enable row level security;
create policy "Users can manage own encounters" on public.word_encounters
  for all using (auth.uid() = user_id);

create index idx_encounters_user on public.word_encounters(user_id);
create index idx_encounters_song on public.word_encounters(song_id);
create index idx_encounters_word on public.word_encounters(word_id);
create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  youtube_url text unique not null,
  title text,
  lyrics_json jsonb,
  cached_at timestamptz default now() not null
);

alter table public.songs enable row level security;
create policy "Authenticated users can read songs" on public.songs
  for select using (auth.role() = 'authenticated');
create policy "Service role can manage songs" on public.songs
  for all using (auth.role() = 'service_role');

-- Also allow authenticated users to insert (for caching after translation)
create policy "Authenticated users can insert songs" on public.songs
  for insert with check (auth.role() = 'authenticated');

create index idx_songs_url on public.songs(youtube_url);
create table if not exists public.revision_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  mode text not null check (mode in ('flashcard', 'audio', 'matching', 'sentence')),
  words_reviewed int default 0 not null,
  words_correct int default 0 not null,
  words_incorrect int default 0 not null
);

alter table public.revision_sessions enable row level security;
create policy "Users can manage own sessions" on public.revision_sessions
  for all using (auth.uid() = user_id);

create index idx_revision_user on public.revision_sessions(user_id);
