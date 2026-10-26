-- ForgeFocus session history. Review against the live Supabase schema before applying
-- if the table was previously created manually.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  session_id text not null unique,
  status text not null check (status in ('Complete', 'Discard')),
  planned_duration_ms bigint not null check (planned_duration_ms > 0),
  total_focus_time_ms bigint not null check (total_focus_time_ms >= 0),
  overtime_ms bigint not null default 0 check (overtime_ms >= 0),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  notes text null check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_timestamps_order check (completed_at >= started_at),
  constraint sessions_overtime_within_focus check (overtime_ms <= total_focus_time_ms)
);

create index if not exists sessions_clerk_user_id_idx
  on public.sessions (clerk_user_id);
create index if not exists sessions_clerk_user_id_completed_at_idx
  on public.sessions (clerk_user_id, completed_at desc);

alter table public.sessions enable row level security;

-- The app currently accesses this table only through server route handlers
-- using the server-only service-role key and explicit Clerk ownership filters.
-- Do not expose the service-role key or use these policies as a substitute
-- for server-side authorization. Direct client access remains unavailable.
revoke all on public.sessions from anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();
