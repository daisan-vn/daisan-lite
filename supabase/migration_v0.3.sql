-- ========================================================================
-- DaisanAI Lite — Migration v0.2 → v0.3
-- ========================================================================
-- Them user_id va RLS de moi user chi xem duoc project cua minh
--
-- Cach chay:
--   1) Mo Supabase Dashboard → SQL Editor → New query
--   2) COPY toan bo file nay, PASTE vao, click "Run"
--
-- LUU Y: Cac project tao tu v0.2 (user_id = NULL) se bi an di
--        (vi RLS yeu cau user_id = auth.uid()). Day la du lieu test nen OK.
--        Neu muon xoa hoan toan: chay `DELETE FROM projects WHERE user_id IS NULL;`
-- ========================================================================


-- ─── 1. Them cot user_id (link den auth.users) ──────────────────────────
alter table public.projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Index de query theo user nhanh hon
create index if not exists projects_user_id_idx
  on public.projects (user_id, updated_at desc);


-- ─── 2. Cap nhat RLS policies ────────────────────────────────────────────
-- Xoa policies cu (cua v0.1/v0.2 — cho phep anon doc tat ca)
drop policy if exists "anyone_can_read_projects" on public.projects;
drop policy if exists "Users can view their own projects" on public.projects;
drop policy if exists "Users can insert their own projects" on public.projects;
drop policy if exists "Users can update their own projects" on public.projects;
drop policy if exists "Users can delete their own projects" on public.projects;


-- Policy: User chi SELECT project cua minh
create policy "Users can view their own projects"
  on public.projects for select
  to authenticated
  using (user_id = auth.uid());

-- Policy: User chi INSERT project cua chinh minh
create policy "Users can insert their own projects"
  on public.projects for insert
  to authenticated
  with check (user_id = auth.uid());

-- Policy: User chi UPDATE project cua minh
create policy "Users can update their own projects"
  on public.projects for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policy: User chi DELETE project cua minh
create policy "Users can delete their own projects"
  on public.projects for delete
  to authenticated
  using (user_id = auth.uid());


-- ─── 3. (Tuy chon) Xoa du lieu cu khong co user_id ──────────────────────
-- Uncomment dong duoi neu muon xoa sach project test tu v0.2:
-- delete from public.projects where user_id is null;


-- ========================================================================
-- Sau khi chay xong, check:
--   1) Database → Tables → projects → thay cot "user_id" moi
--   2) Database → Policies → projects → thay 4 policy (select/insert/update/delete)
-- ========================================================================
