-- =============================================================================
-- 0017_email_hardening.sql — Email suppression list + idempotent send key
-- -----------------------------------------------------------------------------
-- Backs the email infrastructure audit fixes:
--
--   * `email_suppressions` — global per-address blocklist fed from the Brevo
--     webhook handler. Every outbound transactional email consults this
--     table first; addresses flagged for hard-bounce, spam complaint, or
--     manual unsubscribe are silently skipped. Protects sender reputation
--     and is the deliverability best-practice (Gmail / Yahoo 2024 bulk
--     sender rules).
--
--   * `delivery_logs.idempotency_key` — callers pass a stable key per
--     logical send (e.g. "invoice:<id>:email-v1") so duplicate server
--     action invocations (browser retry, RSC re-render, double-submit)
--     don't produce two emails for one logical event.
-- =============================================================================

-- ----- email_suppressions ---------------------------------------------------
-- Primary key is the normalized (lowercased) email address \u2014 there is only
-- ever one suppression per address regardless of which tenant originally
-- triggered the bounce. A hard bounce is a property of the recipient
-- mailbox, not the sender, so per-user scoping would leak reputation
-- between workspaces.
create table if not exists public.email_suppressions (
  email       text primary key,
  reason      text not null
                check (reason in (
                  'hard_bounce','soft_bounce_repeat','complaint',
                  'unsubscribe','invalid','manual'
                )),
  -- The user whose send triggered the suppression (nullable for manual
  -- admin entries). `on delete set null` keeps the suppression even if
  -- the originating user deletes their account \u2014 protecting the
  -- recipient's "don't-email-me" signal regardless of tenant churn.
  triggered_by_user_id  uuid references auth.users(id) on delete set null,
  provider              text not null default 'brevo',
  provider_message_id   text,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists email_suppressions_reason_idx
  on public.email_suppressions (reason);
create index if not exists email_suppressions_created_at_idx
  on public.email_suppressions (created_at desc);
create index if not exists email_suppressions_user_idx
  on public.email_suppressions (triggered_by_user_id);

create trigger email_suppressions_set_updated_at
before update on public.email_suppressions
for each row execute function public.set_updated_at();

alter table public.email_suppressions enable row level security;

-- The suppression list is a SERVICE-ROLE-OWNED resource:
--   * Webhook handler writes on bounce / complaint events.
--   * Email dispatcher reads via service-role inside `send.ts`.
-- No authenticated-user policies \u2014 a freelancer should never be able to
-- enumerate which of their clients have suppressed mail (privacy) nor
-- remove suppressions for their own benefit (reputation protection).


-- ----- delivery_logs.idempotency_key ----------------------------------------
-- Unique-when-present key. A NULL key means \"not idempotent\" which
-- preserves backward compatibility for any call site that hasn't been
-- updated yet. Repeat inserts with the same key fail with PG unique-
-- violation; the app treats that as \"already sent, return the existing
-- log id.\"
alter table public.delivery_logs
  add column if not exists idempotency_key text;

create unique index if not exists delivery_logs_idempotency_key_uidx
  on public.delivery_logs (idempotency_key)
  where idempotency_key is not null;
