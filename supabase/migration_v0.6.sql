-- ========================================================================
-- DaisanAI Lite — Migration v0.5 → v0.6
-- ========================================================================
-- Them thu vien template (global, ai cung doc duoc)
-- ========================================================================


-- ─── 1. Tao bang templates ──────────────────────────────────────────────
create table if not exists public.templates (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text,
  category        text not null,
  industry_label  text not null,
  emoji           text default '✨',
  color_from      text default '#3b5cf5',
  color_to        text default '#2a40e6',
  pages           jsonb not null default '{}'::jsonb,
  navigation      jsonb not null default '[]'::jsonb,
  site_name       text,
  default_prompt  text,
  uses_count      integer not null default 0,
  is_featured     boolean not null default false,
  display_order   integer not null default 100,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


-- ─── 2. Indexes ──────────────────────────────────────────────────────────
create index if not exists templates_category_idx
  on public.templates (category, display_order);

create index if not exists templates_featured_idx
  on public.templates (is_featured, display_order) where is_featured = true;


-- ─── 3. Them cot template_id vao projects ───────────────────────────────
alter table public.projects
  add column if not exists template_id uuid references public.templates(id) on delete set null;


-- ─── 4. Trigger updated_at cho templates ────────────────────────────────
drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();


-- ─── 5. RLS ─────────────────────────────────────────────────────────────
alter table public.templates enable row level security;

drop policy if exists "Anyone authenticated can read templates" on public.templates;
create policy "Anyone authenticated can read templates"
  on public.templates for select to authenticated using (true);


-- ─── 6. Function increment uses ─────────────────────────────────────────
create or replace function public.increment_template_uses(template_id uuid)
returns void as $$
begin
  update public.templates set uses_count = uses_count + 1 where id = template_id;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_template_uses(uuid) to authenticated;


-- ========================================================================
-- Sau khi chay xong:
--   1) Bang "templates" se trong → CHAY SEED SCRIPT de co noi dung:
--      Trong terminal: npm run seed-templates
--   2) Script se goi Claude API 6 lan de tao 6 template
--      Thoi gian: ~2-3 phut, chi phi: ~$1
-- ========================================================================
