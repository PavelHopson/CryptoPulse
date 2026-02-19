create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'free' check (role in ('free', 'pro', 'enterprise')),
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin_id text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.comparisons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin_ids jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin_id text not null,
  amount numeric not null,
  buy_price numeric not null
);

create table if not exists public.alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin_id text not null,
  target_price numeric not null,
  direction text not null check (direction in ('above', 'below'))
);

create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  plan text not null default 'free',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz
);

create table if not exists public.subscription_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_jobs (
  id uuid primary key default uuid_generate_v4(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alert_jobs_status_run_at on public.alert_jobs(status, run_at);


create table if not exists public.usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.analytics_revenue_snapshot as
select
  coalesce(sum(case when status in ('active', 'trialing', 'past_due') then 1 else 0 end), 0) as active_subscribers,
  coalesce(sum(
    case
      when status in ('active', 'trialing', 'past_due') and plan ilike '%enterprise%' then 29900
      when status in ('active', 'trialing', 'past_due') and plan ilike '%pro%' then 4900
      else 0
    end
  ), 0) as mrr
from public.subscriptions;

create or replace view public.analytics_churn_monthly as
select
  date_trunc('month', created_at) as month,
  count(*) filter (where event_type = 'customer.subscription.deleted') as churned,
  count(*) filter (where event_type = 'customer.subscription.created') as started
from public.subscription_events
group by 1
order by 1 desc;

create table if not exists public.feature_flags (
  id uuid primary key default uuid_generate_v4(),
  feature_key text not null,
  role text not null check (role in ('free', 'pro', 'enterprise')),
  limit_value integer,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(feature_key, role)
);

insert into public.feature_flags (feature_key, role, limit_value, enabled)
values
  ('favorites_limit', 'free', 10, true),
  ('favorites_limit', 'pro', 100, true),
  ('favorites_limit', 'enterprise', null, true),
  ('comparison_limit', 'free', 2, true),
  ('comparison_limit', 'pro', 5, true),
  ('comparison_limit', 'enterprise', null, true),
  ('portfolio_enabled', 'free', 0, false),
  ('portfolio_enabled', 'pro', 1, true),
  ('portfolio_enabled', 'enterprise', 1, true)
on conflict (feature_key, role) do nothing;

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.comparisons enable row level security;
alter table public.portfolios enable row level security;
alter table public.alerts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.alert_jobs enable row level security;
alter table public.feature_flags enable row level security;
alter table public.usage_events enable row level security;

create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own comparisons" on public.comparisons for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own portfolios" on public.portfolios for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own alerts" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own subscriptions" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own subscription events" on public.subscription_events for select using (auth.uid() = user_id);
create policy "Users view own alert jobs" on public.alert_jobs for select using (
  exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid())
);
create policy "Feature flags are readable by all authenticated users" on public.feature_flags for select using (auth.uid() is not null);
create policy "Users insert own usage events" on public.usage_events for insert with check (auth.uid() = user_id);
create policy "Users view own usage events" on public.usage_events for select using (auth.uid() = user_id);
