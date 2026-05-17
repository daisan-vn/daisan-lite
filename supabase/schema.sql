-- ========================================================================
-- DaisanAI Lite — Schema database (v0.4 — Multi-page support)
-- ========================================================================
-- DUNG CHO: cai dat MOI hoan toan
-- NEU dang co v0.3 → dung migration_v0.4.sql thay vi file nay
-- ========================================================================


-- ─── Bang projects ───────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  prompt      text not null,
  html        text,                                    -- legacy (v0.3 single-page)
  pages       jsonb not null default '{}'::jsonb,      -- v0.4: {"index.html": "<html>...", "about.html": "..."}
  navigation  jsonb not null default '[]'::jsonb,      -- v0.4: [{"name": "Trang chu", "path": "index.html"}]
  site_name   text,                                    -- v0.4: ten website ngan
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ─── Indexes ─────────────────────────────────────────────────────────────
create index if not exists projects_user_id_idx
  on public.projects (user_id, updated_at desc);
create index if not exists projects_pages_idx
  on public.projects using gin (pages);


-- ─── Trigger updated_at ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();


-- ─── Row Level Security ──────────────────────────────────────────────────
alter table public.projects enable row level security;

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects"
  on public.projects for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own projects" on public.projects;
create policy "Users can insert their own projects"
  on public.projects for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete to authenticated
  using (user_id = auth.uid());
