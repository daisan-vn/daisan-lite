-- ========================================================================
-- DaisanAI Lite — Migration v0.9 → v0.10
-- ========================================================================
-- Them client invite system: cho chu tiem edit web cua ho ma KHONG can owner
-- ========================================================================


-- ─── 1. Them cot vao projects ───────────────────────────────────────────
alter table public.projects
  add column if not exists client_email             text,
  add column if not exists client_user_id           uuid references auth.users(id) on delete set null,
  add column if not exists client_invite_token      text unique,
  add column if not exists client_invite_expires_at timestamptz,
  add column if not exists client_invited_at        timestamptz,
  add column if not exists client_accepted_at       timestamptz;


-- ─── 2. Indexes ──────────────────────────────────────────────────────────
create index if not exists projects_client_user_id_idx
  on public.projects (client_user_id) where client_user_id is not null;

create index if not exists projects_client_invite_token_idx
  on public.projects (client_invite_token) where client_invite_token is not null;


-- ─── 3. RLS Update — client cung doc duoc project cua minh ──────────────
drop policy if exists "Users can view their own projects" on public.projects;

create policy "Users can view own or client projects"
  on public.projects for select to authenticated
  using (
    user_id = auth.uid()
    or client_user_id = auth.uid()
  );

-- Owner update policy (giu nguyen)
drop policy if exists "Users can update their own projects" on public.projects;
create policy "Owners can update own projects"
  on public.projects for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Client KHONG co policy update direct → moi update phai qua server endpoint
-- Server dung service_role de bypass RLS sau khi check role


-- ========================================================================
-- Sau khi chay xong:
--   Database → Tables → projects → them 6 cot moi:
--   client_email, client_user_id, client_invite_token,
--   client_invite_expires_at, client_invited_at, client_accepted_at
-- ========================================================================
