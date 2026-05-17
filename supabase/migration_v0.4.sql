-- ========================================================================
-- DaisanAI Lite — Migration v0.3 → v0.4
-- ========================================================================
-- Them ho tro multi-page: pages, navigation, site_name
-- Du lieu v0.3 (single html) duoc tu dong chuyen sang format multi-page
-- ========================================================================


-- ─── 1. Them cot moi ─────────────────────────────────────────────────────
alter table public.projects
  add column if not exists pages       jsonb not null default '{}'::jsonb,
  add column if not exists navigation  jsonb not null default '[]'::jsonb,
  add column if not exists site_name   text;


-- ─── 2. Migrate du lieu v0.3 (html → pages) ─────────────────────────────
update public.projects
set
  pages = jsonb_build_object('index.html', html),
  navigation = jsonb_build_array(
    jsonb_build_object('name', 'Trang chu', 'path', 'index.html')
  ),
  site_name = coalesce(site_name, name)
where html is not null
  and (pages = '{}'::jsonb or pages is null);


-- ─── 3. Index cho query JSON nhanh hon ──────────────────────────────────
create index if not exists projects_pages_idx
  on public.projects using gin (pages);


-- ========================================================================
-- Sau khi chay xong:
--   1) Database → Tables → projects → thay 3 cot moi: pages, navigation, site_name
--   2) Click 1 row de check: pages co {"index.html": "..."}, navigation co array
-- ========================================================================
