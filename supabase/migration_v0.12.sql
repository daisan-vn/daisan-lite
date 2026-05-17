-- ========================================================================
-- DaisanAI Lite — Migration v0.11 → v0.12
-- ========================================================================
-- Them admin role system: user_roles.is_admin de cho phep CRUD templates
-- ========================================================================


-- ─── 1. Table user_roles ────────────────────────────────────────────────
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists user_roles_admin_idx
  on public.user_roles (is_admin) where is_admin = true;


-- ─── 2. RLS — user chi xem duoc role cua chinh minh ─────────────────────
-- Server dung service_role (bypass RLS) de check khi can.
-- Frontend goi /api/admin/check de biet user co phai admin khong.
alter table public.user_roles enable row level security;

drop policy if exists "Users view own role" on public.user_roles;
create policy "Users view own role" on public.user_roles for select to authenticated
  using (user_id = auth.uid());


-- ─── 3. Trigger updated_at ──────────────────────────────────────────────
drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at before update on public.user_roles
  for each row execute function public.set_updated_at();


-- ========================================================================
-- CACH PROMOTE ADMIN DAU TIEN (chay trong Supabase SQL Editor):
-- ========================================================================
--
-- 1. Tim user_id trong Authentication → Users → click email → copy UID
-- 2. Chay:
--      INSERT INTO public.user_roles (user_id, is_admin)
--      VALUES ('<paste-uuid-here>', true)
--      ON CONFLICT (user_id) DO UPDATE SET is_admin = true;
--
-- 3. User do login lai (hoac reload) → thay nut "Admin" trong UserMenu
--    va co the truy cap /admin
--
-- DEMOTE admin: UPDATE public.user_roles SET is_admin = false WHERE user_id = '...';
-- ========================================================================
