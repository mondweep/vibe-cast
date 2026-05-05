-- Chat analytics table for tracking tutor usage patterns
create table if not exists public.defi_learning_as_chat_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id text not null,
  question_topic text,
  response_quality_rating integer check (response_quality_rating >= 1 and response_quality_rating <= 5),
  timestamp timestamp with time zone default now()
);

-- Create indexes for analytics queries
create index if not exists defi_learning_as_chat_analytics_user_id_idx on public.defi_learning_as_chat_analytics(user_id);
create index if not exists defi_learning_as_chat_analytics_session_id_idx on public.defi_learning_as_chat_analytics(session_id);
create index if not exists defi_learning_as_chat_analytics_timestamp_idx on public.defi_learning_as_chat_analytics(timestamp);

-- Enable RLS
alter table public.defi_learning_as_chat_analytics enable row level security;

-- Policy: Users can only read analytics for their sessions
create policy "Users can read their analytics" on public.defi_learning_as_chat_analytics
  for select
  using (auth.uid() = user_id);

create policy "Users can insert analytics for their sessions" on public.defi_learning_as_chat_analytics
  for insert
  with check (auth.uid() = user_id);
