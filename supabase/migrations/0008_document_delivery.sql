-- =============================================================================
-- 0008_document_delivery.sql — Public share tokens, view tracking, delivery logs
-- -----------------------------------------------------------------------------
-- Backs:
--   * `src/features/documents/*`  (PDF engine + API routes)
--   * `src/features/share/*`      (public token resolvers)
--   * `src/features/email/*`      (Brevo delivery + delivery_logs sink)
--
-- Adds:
--   * `invoices.public_token` + `viewed_at` so freelancers can share read-only
--     links with clients (mirrors the existing contracts.public_token flow).
--   * Anonymous-role SELECT policy for invoices via token, and a tightened
--     SELECT policy for invoice_items reachable through the same token.
--   * `delivery_logs` — every transactional email we send lands here so the
--     UI can surface "Sent · Delivered · Opened" states and so we can debug
--     Brevo webhook replays without re-reading mail server logs.
-- =============================================================================

-- --- invoices: share tokens + view tracking --------------------------------
alter table public.invoices
  add column if not exists public_token text unique,
  add column if not exists viewed_at    timestamptz;

create index if not exists invoices_public_token_idx
  on public.invoices (public_token);

-- Anonymous read path (matches the contracts pattern in 0003).
do $$ begin
  create policy invoices_public_token_read on public.invoices
    for select to anon using (public_token is not null);
exception when duplicate_object then null; end $$;

-- Line items need an anon-readable path too, BUT only through an invoice
-- that is exposed via token. Drop the authenticated-only existing select
-- policy's effect by adding a second permissive policy scoped to anon.
do $$ begin
  create policy invoice_items_public_token_read on public.invoice_items
    for select to anon using (
      exists (
        select 1 from public.invoices i
        where i.id = invoice_items.invoice_id
          and i.public_token is not null
      )
    );
exception when duplicate_object then null; end $$;

-- --- delivery_logs ----------------------------------------------------------
-- One row per outbound transactional email. We insert on send, and update
-- from Brevo webhooks (delivered / opened / bounced). Failures are persisted
-- with `error` so the UI can show why a send didn't land.
create table if not exists public.delivery_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  kind              text not null
                      check (kind in (
                        'invoice_sent','invoice_reminder','invoice_viewed',
                        'invoice_paid','contract_sent','contract_signed',
                        'contract_declined','proposal_sent','custom'
                      )),
  channel           text not null default 'email'
                      check (channel in ('email','sms','inapp')),
  entity_type       text not null
                      check (entity_type in ('invoice','contract','client','system')),
  entity_id         uuid,
  to_email          text,
  subject           text,
  status            text not null default 'queued'
                      check (status in (
                        'queued','sent','delivered','opened','clicked',
                        'bounced','failed','suppressed'
                      )),
  provider          text not null default 'brevo',
  provider_message_id text,
  error             text,
  sent_at           timestamptz,
  delivered_at      timestamptz,
  opened_at         timestamptz,
  bounced_at        timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists delivery_logs_user_idx
  on public.delivery_logs (user_id, created_at desc);
create index if not exists delivery_logs_entity_idx
  on public.delivery_logs (entity_type, entity_id);
create index if not exists delivery_logs_provider_msg_idx
  on public.delivery_logs (provider_message_id);

create trigger delivery_logs_set_updated_at
before update on public.delivery_logs
for each row execute function public.set_updated_at();

alter table public.delivery_logs enable row level security;

create policy delivery_logs_select_own on public.delivery_logs
  for select to authenticated using (auth.uid() = user_id);
create policy delivery_logs_insert_own on public.delivery_logs
  for insert to authenticated with check (auth.uid() = user_id);
-- Updates from Brevo webhooks run as service-role and bypass RLS.
