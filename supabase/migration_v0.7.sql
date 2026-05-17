-- ========================================================================
-- DaisanAI Lite — Migration v0.6 → v0.7
-- ========================================================================
-- Them billing system: subscriptions, payments, usage tracking
-- ========================================================================


-- ─── 1. subscriptions (1 row/user) ──────────────────────────────────────
create table if not exists public.subscriptions (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  plan_id              text not null default 'free',           -- 'free' | 'pro' | 'business'
  status               text not null default 'active',         -- 'active' | 'expired' | 'cancelled'
  current_period_start timestamptz default now(),
  current_period_end   timestamptz,                            -- null = free (khong het han)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);


-- ─── 2. payments (lich su giao dich) ────────────────────────────────────
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  plan_id              text not null,
  amount_vnd           integer not null,
  currency             text not null default 'VND',
  status               text not null default 'pending',        -- 'pending' | 'success' | 'failed'
  vnp_txn_ref          text unique,                            -- mã giao dich tu cap
  vnp_transaction_no   text,                                   -- VNPay transaction id
  vnp_response_code    text,                                   -- VNPay response code (00 = success)
  vnp_bank_code        text,                                   -- ngân hàng
  raw_response         jsonb,                                  -- raw response tu VNPay
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id, created_at desc);
create index if not exists payments_vnp_txn_ref_idx on public.payments (vnp_txn_ref);


-- ─── 3. usage_monthly (track AI generates per month) ────────────────────
create table if not exists public.usage_monthly (
  user_id        uuid not null references auth.users(id) on delete cascade,
  year_month     text not null,                                -- '2026-05'
  ai_generates   integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, year_month)
);


-- ─── 4. Triggers ─────────────────────────────────────────────────────────
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions for each row execute function public.set_updated_at();

drop trigger if exists usage_monthly_set_updated_at on public.usage_monthly;
create trigger usage_monthly_set_updated_at
  before update on public.usage_monthly for each row execute function public.set_updated_at();


-- ─── 5. RLS ─────────────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.usage_monthly enable row level security;

-- Subscriptions: chi user xem cua minh
drop policy if exists "Users view own subscription" on public.subscriptions;
create policy "Users view own subscription" on public.subscriptions for select to authenticated
  using (user_id = auth.uid());
-- KHONG cho insert/update tu client — chi server (service_role) moi ghi

-- Payments: chi user xem cua minh
drop policy if exists "Users view own payments" on public.payments;
create policy "Users view own payments" on public.payments for select to authenticated
  using (user_id = auth.uid());

-- Usage: chi user xem cua minh
drop policy if exists "Users view own usage" on public.usage_monthly;
create policy "Users view own usage" on public.usage_monthly for select to authenticated
  using (user_id = auth.uid());


-- ─── 6. Tao subscription mac dinh "free" khi user moi dang ky ────────────
-- Trigger tu Supabase auth → khi co user moi → tao row subscription
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
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── 7. Backfill subscription "free" cho users hien tai ────────────────
insert into public.subscriptions (user_id, plan_id, status)
select id, 'free', 'active' from auth.users
on conflict (user_id) do nothing;


-- ─── 8. Function increment usage ────────────────────────────────────────
create or replace function public.increment_ai_generates(user_uuid uuid)
returns void as $$
declare
  current_month text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage_monthly (user_id, year_month, ai_generates)
  values (user_uuid, current_month, 1)
  on conflict (user_id, year_month)
  do update set ai_generates = usage_monthly.ai_generates + 1;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_ai_generates(uuid) to authenticated;


-- ========================================================================
-- Sau khi chay xong:
--   1) Database → Tables → thay 3 bang moi: subscriptions, payments, usage_monthly
--   2) Database → Functions → handle_new_user + increment_ai_generates
--   3) Bang subscriptions co 1 row per user (free plan mac dinh)
-- ========================================================================
