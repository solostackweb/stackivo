-- =============================================================================
-- 0002_subscriptions.sql — Subscription + usage-tracking tables
-- -----------------------------------------------------------------------------
-- Backs:
--   * `src/features/subscription/plans.ts` (plan + feature + limit config)
--   * `src/features/subscription/usage.ts` (usage counter reads/increments)
--
-- Notes:
--   * `subscriptions` is 1:1 with a user for the MVP (single workspace).
--     Schema is workspace-ready: replace `user_id` with `workspace_id` if
--     multi-user workspaces are introduced later.
--   * `usage_counters` is generic: one row per (user, metric, period).
--     Metric keys live in TS (`UsageMetric` union) so the DB never constrains
--     them — adding a metric is a one-line code change.
-- =============================================================================

-- --- subscriptions ----------------------------------------------------------
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references auth.users(id) on delete cascade,
  plan                      text not null default 'free'
                              check (plan in ('free','pro','business')),
  status                    text not null default 'active'
                              check (status in (
                                'trialing','active','past_due','canceled','paused','expired'
                              )),
  razorpay_subscription_id  text unique,
  trial_ends_at             timestamptz,
  current_period_end        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx  on public.subscriptions (status);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Auto-provision a `free` subscription row whenever a new user profile is
-- created. Keeps the feature-gating code safe: every user always has a row.
create or replace function public.handle_new_user_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_user_profile_created on public.user_profiles;
create trigger on_user_profile_created
after insert on public.user_profiles
for each row execute function public.handle_new_user_subscription();

-- --- usage_counters ---------------------------------------------------------
create table if not exists public.usage_counters (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  metric        text not null,
  period_start  timestamptz not null,
  period_end    timestamptz not null,
  count         bigint not null default 0,
  updated_at    timestamptz not null default now(),
  unique (user_id, metric, period_start)
);

create index if not exists usage_counters_user_id_idx       on public.usage_counters (user_id);
create index if not exists usage_counters_user_metric_idx   on public.usage_counters (user_id, metric);

create trigger usage_counters_set_updated_at
before update on public.usage_counters
for each row execute function public.set_updated_at();

-- Atomic increment helper. Usage:
--   select public.increment_usage(auth.uid(), 'invoices_created', 1, now());
create or replace function public.increment_usage(
  p_user_id uuid,
  p_metric  text,
  p_delta   bigint default 1,
  p_now     timestamptz default now()
) returns bigint
language plpgsql
security invoker
as $$
declare
  v_period_start timestamptz := date_trunc('month', p_now);
  v_period_end   timestamptz := (date_trunc('month', p_now) + interval '1 month');
  v_new_count    bigint;
begin
  insert into public.usage_counters (user_id, metric, period_start, period_end, count)
  values (p_user_id, p_metric, v_period_start, v_period_end, p_delta)
  on conflict (user_id, metric, period_start)
  do update set count = usage_counters.count + excluded.count,
                updated_at = now()
  returning count into v_new_count;

  return v_new_count;
end $$;
