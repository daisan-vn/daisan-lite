-- ========================================================================
-- DaisanAI Lite — Migration v0.13 → v0.14
-- ========================================================================
-- Them table leads: khach tiem nang submit form tu published site
-- → SME owner xem trong app de lien lac lai.
-- ========================================================================


-- ─── 1. Table leads ─────────────────────────────────────────────────────
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  data          jsonb not null default '{}'::jsonb,   -- toan bo form fields
  source_page   text,                                 -- vd 'lien-he.html'
  submitter_ip  text,
  user_agent    text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists leads_project_idx
  on public.leads (project_id, created_at desc);
create index if not exists leads_unread_idx
  on public.leads (project_id) where read_at is null;


-- ─── 2. RLS — owner va client cua project doc duoc leads ───────────────
-- Server dung service_role bypass RLS (de cho phep public POST), nhung
-- enable RLS de chong app/client abuse direct supabase client.
alter table public.leads enable row level security;

drop policy if exists "Owner and client view leads" on public.leads;
create policy "Owner and client view leads" on public.leads for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = leads.project_id
        and (p.user_id = auth.uid() or p.client_user_id = auth.uid())
    )
  );

-- Owner co the delete leads (vd dau xao, da xu ly xong)
drop policy if exists "Owner delete leads" on public.leads;
create policy "Owner delete leads" on public.leads for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = leads.project_id and p.user_id = auth.uid()
    )
  );

-- Owner va client co the mark read
drop policy if exists "Owner and client update leads" on public.leads;
create policy "Owner and client update leads" on public.leads for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = leads.project_id
        and (p.user_id = auth.uid() or p.client_user_id = auth.uid())
    )
  );


-- ========================================================================
-- LUU Y:
-- - Public POST se dung server endpoint /api/site/:slug/lead (su dung
--   service_role bypass RLS) → khong can policy INSERT cho anon/public
-- - data jsonb chua moi form fields → flexible, khong rang buoc schema
-- - submitter_ip dung de chong spam (rate limit) khong store PII lau
-- ========================================================================
