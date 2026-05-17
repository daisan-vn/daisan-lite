-- ========================================================================
-- DaisanAI Lite — Schema database (v0.7 — Billing)
-- ========================================================================
-- DUNG CHO: cai dat MOI hoan toan
-- NEU dang co phien ban cu → dung migration_v0.7.sql
-- ========================================================================


-- ─── templates ──────────────────────────────────────────────────────────
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
create index if not exists templates_category_idx on public.templates (category, display_order);
create index if not exists templates_featured_idx on public.templates (is_featured, display_order) where is_featured = true;


-- ─── projects ───────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  name                        text not null,
  prompt                      text not null,
  html                        text,
  pages                       jsonb not null default '{}'::jsonb,
  navigation                  jsonb not null default '[]'::jsonb,
  site_name                   text,
  slug                        text unique,
  is_published                boolean not null default false,
  published_at                timestamptz,
  view_count                  integer not null default 0,
  template_id                 uuid references public.templates(id) on delete set null,
  custom_domain               text unique,                              -- v0.8
  custom_domain_verified      boolean not null default false,           -- v0.8
  custom_domain_token         text,                                     -- v0.8
  custom_domain_added_at      timestamptz,                              -- v0.8
  status                      text not null default 'pending',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists projects_user_id_idx     on public.projects (user_id, updated_at desc);
create index if not exists projects_pages_idx       on public.projects using gin (pages);
create index if not exists projects_slug_idx        on public.projects (slug) where slug is not null;
create index if not exists projects_published_idx   on public.projects (is_published) where is_published = true;
create index if not exists projects_custom_domain_idx on public.projects (custom_domain) where custom_domain is not null;


-- ─── subscriptions (v0.7) ───────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  plan_id              text not null default 'free',
  status               text not null default 'active',
  current_period_start timestamptz default now(),
  current_period_end   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);


-- ─── payments (v0.7) ────────────────────────────────────────────────────
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan_id              text not null,
  amount_vnd           integer not null,
  currency             text not null default 'VND',
  status               text not null default 'pending',
  vnp_txn_ref          text unique,
  vnp_transaction_no   text,
  vnp_response_code    text,
  vnp_bank_code        text,
  raw_response         jsonb,
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists payments_user_id_idx on public.payments (user_id, created_at desc);
create index if not exists payments_vnp_txn_ref_idx on public.payments (vnp_txn_ref);


-- ─── usage_monthly (v0.7) ───────────────────────────────────────────────
create table if not exists public.usage_monthly (
  user_id        uuid not null references auth.users(id) on delete cascade,
  year_month     text not null,
  ai_generates   integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, year_month)
);


-- ─── Trigger updated_at ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at before update on public.templates
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists usage_monthly_set_updated_at on public.usage_monthly;
create trigger usage_monthly_set_updated_at before update on public.usage_monthly
  for each row execute function public.set_updated_at();


-- ─── RLS: projects ──────────────────────────────────────────────────────
alter table public.projects enable row level security;

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects" on public.projects for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users can insert their own projects" on public.projects;
create policy "Users can insert their own projects" on public.projects for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects" on public.projects for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects" on public.projects for delete to authenticated
  using (user_id = auth.uid());


-- ─── RLS: templates ─────────────────────────────────────────────────────
alter table public.templates enable row level security;
drop policy if exists "Anyone authenticated can read templates" on public.templates;
create policy "Anyone authenticated can read templates" on public.templates for select to authenticated using (true);


-- ─── RLS: subscriptions / payments / usage (chi doc cua minh) ──────────
alter table public.subscriptions enable row level security;
drop policy if exists "Users view own subscription" on public.subscriptions;
create policy "Users view own subscription" on public.subscriptions for select to authenticated
  using (user_id = auth.uid());

alter table public.payments enable row level security;
drop policy if exists "Users view own payments" on public.payments;
create policy "Users view own payments" on public.payments for select to authenticated
  using (user_id = auth.uid());

alter table public.usage_monthly enable row level security;
drop policy if exists "Users view own usage" on public.usage_monthly;
create policy "Users view own usage" on public.usage_monthly for select to authenticated
  using (user_id = auth.uid());


-- ─── Functions ──────────────────────────────────────────────────────────
create or replace function public.increment_template_uses(template_id uuid)
returns void as $$
begin
  update public.templates set uses_count = uses_count + 1 where id = template_id;
end;
$$ language plpgsql security definer;
grant execute on function public.increment_template_uses(uuid) to authenticated;

create or replace function public.increment_ai_generates(user_uuid uuid)
returns void as $$
declare current_month text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage_monthly (user_id, year_month, ai_generates)
  values (user_uuid, current_month, 1)
  on conflict (user_id, year_month)
  do update set ai_generates = usage_monthly.ai_generates + 1;
end;
$$ language plpgsql security definer;
grant execute on function public.increment_ai_generates(uuid) to authenticated;


-- ─── Auto-create free subscription cho user moi ─────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
