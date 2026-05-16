-- =============================================================================
-- 0018_security_events.sql — Security + operational event log
-- -----------------------------------------------------------------------------
-- A single append-only sink for security-relevant events that cut across
-- the per-user `activity_events` feed: login failures, rate-limit trips,
-- webhook signature mismatches, suppression list hits, RLS guard misses.
--
-- Design:
--   * user_id is nullable — many events happen before authentication
--     (signup attempt, webhook from external service).
--   * ip + user_agent captured for correlation when available.
--   * Service-role-only writes. SELECT is restricted to admin users
--     (enforced at the app layer once we ship an admin role column).
--   * Append-only: no UPDATE / DELETE policy. History is forensic.
-- =============================================================================

create table if not exists public.security_events (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null
                 check (kind in (
                   'auth_login_failed',
                   'auth_signup_failed',
                   'auth_ratelimit_tripped',
                   'auth_password_reset_requested',
                   'rls_guard_miss',
                   'webhook_signature_invalid',
                   'webhook_replay_detected',
                   'storage_prefix_mismatch',
                   'cron_monitor_alert',
                   'suppression_hit',
                   'other'
                 )),
  -- Optional severity tag. Most events are 'info' / 'warn'. An
  -- 'alert'-level event is a signal the ops cron should escalate.
  severity     text not null default 'info'
                 check (severity in ('info','warn','alert')),
  -- Best-effort user attribution. Nullable because many events fire
  -- pre-auth or from webhooks.
  user_id      uuid references auth.users(id) on delete set null,
  -- IP + UA are intentionally stored as plain text; retention is
  -- capped by the cleanup cron (see the ops dashboard).
  ip           text,
  user_agent   text,
  -- Free-form context. Never populated with GSTIN / PAN / passwords /
  -- raw tokens — redactor in `src/lib/logger/redact.ts` is the
  -- canonical allow-list.
  metadata     jsonb not null default '{}'::jsonb,
  -- Correlation ID from the `x-request-id` response header so ops can
  -- trace a single request across structured logs + Sentry + this table.
  request_id   text,
  created_at   timestamptz not null default now()
);

create index if not exists security_events_kind_idx
  on public.security_events (kind, created_at desc);
create index if not exists security_events_created_at_idx
  on public.security_events (created_at desc);
create index if not exists security_events_user_idx
  on public.security_events (user_id, created_at desc)
  where user_id is not null;
-- Partial index on alerts so the ops dashboard "what's on fire right now"
-- query is a direct index lookup instead of a filtered scan.
create index if not exists security_events_alert_idx
  on public.security_events (created_at desc)
  where severity = 'alert';

alter table public.security_events enable row level security;

-- No authenticated-user SELECT policy. Admin UI will consume via the
-- service-role client.
