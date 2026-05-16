-- =============================================================================
-- 0022_support_threads.sql
--
-- Support-system index table.
--
-- We DO NOT mirror the full conversation content of Crisp / Zoho Desk
-- locally — that would create two sources of truth and a constant
-- consistency problem. Instead, this thin index table caches just
-- enough per-thread metadata to power:
--
--   1. The merged `/admin/support` inbox feed.
--   2. The per-user "open / recent support" widget on user detail.
--   3. Churn-signal badges (e.g. "user has 3 tickets in 30 days").
--
-- Conversation bodies stay in their source-of-truth system. Each row
-- carries a stable (`external_system`, `external_id`) pointer the UI
-- uses to deep-link out.
--
-- Writes happen exclusively through the service-role client inside
-- `/api/webhooks/crisp` and `/api/webhooks/zoho-desk`, so we keep the
-- table free of authenticated RLS policies — the absence of a SELECT
-- policy means anon/authenticated users can never read this table
-- directly. Founder console reads use the service-role client.
-- =============================================================================

create table if not exists public.support_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  external_system text not null check (
    external_system in ('crisp', 'zoho_desk', 'brevo_failure')
  ),
  external_id     text not null,
  subject         text,
  status          text not null default 'open' check (
    status in ('new', 'open', 'waiting', 'resolved', 'closed')
  ),
  priority        text not null default 'normal' check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  category        text check (
    category is null or category in (
      'billing', 'bug', 'how-to', 'feature-request', 'account', 'onboarding'
    )
  ),
  tags            text[] not null default '{}'::text[],
  external_url    text,                       -- canonical deep-link
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (external_system, external_id)
);

create index if not exists idx_support_threads_user_recent
  on public.support_threads (user_id, last_message_at desc)
  where user_id is not null;

create index if not exists idx_support_threads_status_recent
  on public.support_threads (status, last_message_at desc);

create index if not exists idx_support_threads_tags
  on public.support_threads using gin (tags);

-- RLS enabled with NO policies → only service-role can read/write.
alter table public.support_threads enable row level security;

-- Maintain `updated_at` automatically.
create or replace function public.support_threads_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_threads_updated_at on public.support_threads;
create trigger trg_support_threads_updated_at
  before update on public.support_threads
  for each row execute function public.support_threads_set_updated_at();
