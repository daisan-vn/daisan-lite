-- ========================================================================
-- DaisanAI Lite — Migration v0.7 → v0.8
-- ========================================================================
-- Them custom_domain cho projects (Pro+ feature)
-- ========================================================================


-- ─── 1. Them cot vao projects ───────────────────────────────────────────
alter table public.projects
  add column if not exists custom_domain              text unique,
  add column if not exists custom_domain_verified     boolean not null default false,
  add column if not exists custom_domain_token        text,
  add column if not exists custom_domain_added_at     timestamptz;


-- ─── 2. Index de Host header lookup nhanh ───────────────────────────────
create index if not exists projects_custom_domain_idx
  on public.projects (custom_domain) where custom_domain is not null;

create index if not exists projects_custom_domain_verified_idx
  on public.projects (custom_domain, is_published)
  where custom_domain_verified = true and is_published = true;


-- ========================================================================
-- Sau khi chay xong:
--   Database → Tables → projects → thay 4 cot moi:
--   custom_domain, custom_domain_verified, custom_domain_token, custom_domain_added_at
-- ========================================================================
