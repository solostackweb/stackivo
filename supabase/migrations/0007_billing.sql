-- =============================================================================
-- 0007_billing.sql — Razorpay billing & subscription lifecycle
-- -----------------------------------------------------------------------------
-- Backs:
--   * `src/features/billing/*`   (Razorpay client + services + webhook)
--   * `src/features/subscription/*` (feature gating reads same row)
--
-- Adds:
--   * Razorpay-specific columns on `public.subscriptions`
--   * `billing_payments` — one row per Razorpay payment / receipt
--   * `billing_events`   — webhook idempotency log
-- =============================================================================

-- --- subscriptions: razorpay lifecycle columns -----------------------------
alter table public.subscriptions
  add column if not exists razorpay_customer_id     text,
  add column if not exists razorpay_plan_id         text,
  add column if not exists billing_cycle            text not null default 'monthly'
    check (billing_cycle in ('monthly','yearly')),
  add column if not exists current_period_start     timestamptz,
  add column if not exists cancel_at_period_end     boolean not null default false,
  add column if not exists canceled_at              timestamptz,
  add column if not exists ended_at                 timestamptz,
  add column if not exists last_payment_at          timestamptz,
  add column if not exists next_charge_at           timestamptz,
  add column if not exists grace_period_ends_at     timestamptz,
  add column if not exists metadata                 jsonb not null default '{}'::jsonb;

create index if not exists subscriptions_rzp_customer_idx
  on public.subscriptions (razorpay_customer_id);
create index if not exists subscriptions_rzp_subscription_idx
  on public.subscriptions (razorpay_subscription_id);

-- --- billing_payments -------------------------------------------------------
create table if not exists public.billing_payments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  subscription_row_id      uuid references public.subscriptions(id) on delete set null,
  razorpay_payment_id      text not null unique,
  razorpay_order_id        text,
  razorpay_subscription_id text,
  razorpay_invoice_id      text,
  amount                   bigint not null,           -- paise
  currency                 text not null default 'INR',
  status                   text not null,             -- captured | failed | refunded | authorized | created
  method                   text,                      -- card | upi | netbanking | wallet | ...
  card_last4               text,
  card_network             text,
  description              text,
  error_code               text,
  error_description        text,
  captured_at              timestamptz,
  receipt_url              text,
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now()
);

create index if not exists billing_payments_user_idx
  on public.billing_payments (user_id, created_at desc);
create index if not exists billing_payments_subscription_idx
  on public.billing_payments (razorpay_subscription_id);

alter table public.billing_payments enable row level security;

create policy billing_payments_select_own on public.billing_payments
  for select to authenticated using (auth.uid() = user_id);
-- Inserts/updates happen exclusively via the service-role webhook handler.

-- --- billing_events (idempotency log) --------------------------------------
create table if not exists public.billing_events (
  id            uuid primary key default gen_random_uuid(),
  event_id      text not null unique,                 -- Razorpay's `x-razorpay-event-id`
  event_type    text not null,                        -- e.g. subscription.charged
  user_id       uuid references auth.users(id) on delete set null,
  payload       jsonb not null,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists billing_events_type_idx
  on public.billing_events (event_type, created_at desc);
create index if not exists billing_events_user_idx
  on public.billing_events (user_id, created_at desc);

alter table public.billing_events enable row level security;
-- No RLS read policy — service-role only.

-- --- subscriptions: keep SubscriptionStatusRow union in sync ---------------
-- ('trialing','active','past_due','canceled','paused','expired') already
-- covers Razorpay's lifecycle once mapped; no change needed here.
