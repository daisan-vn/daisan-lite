-- ========================================================================
-- DaisanAI Lite — Migration v0.4 → v0.5
-- ========================================================================
-- Them ho tro publish: slug duy nhat, trang thai published
-- ========================================================================


-- ─── 1. Them cot ─────────────────────────────────────────────────────────
alter table public.projects
  add column if not exists slug           text unique,
  add column if not exists is_published   boolean not null default false,
  add column if not exists published_at   timestamptz,
  add column if not exists view_count     integer not null default 0;


-- ─── 2. Index ────────────────────────────────────────────────────────────
create index if not exists projects_slug_idx
  on public.projects (slug) where slug is not null;

create index if not exists projects_published_idx
  on public.projects (is_published) where is_published = true;


-- ========================================================================
-- Sau khi chay xong:
--   Database → Tables → projects → thay 4 cot moi: slug, is_published, published_at, view_count
-- ========================================================================
