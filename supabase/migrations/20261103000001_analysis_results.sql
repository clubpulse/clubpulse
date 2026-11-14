-- analysis_results
-- Per-player storage of ball-tracking and pose-analysis history.
-- Each row is one completed analysis session, keyed by the authenticated user.

create table if not exists public.analysis_results (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now(),
  analysis_type       text        not null check (analysis_type in ('ball', 'pose')),
  result_json         jsonb       not null,
  coaching_paragraph  text
);

-- Index for fast per-player history queries
create index if not exists analysis_results_user_id_idx
  on public.analysis_results (user_id, created_at desc);

-- Row-level security: users can only read/write their own rows
alter table public.analysis_results enable row level security;

create policy "Users can insert their own analysis results"
  on public.analysis_results
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own analysis results"
  on public.analysis_results
  for select
  using (auth.uid() = user_id);

create policy "Users can delete their own analysis results"
  on public.analysis_results
  for delete
  using (auth.uid() = user_id);
