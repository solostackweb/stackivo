-- =============================================================================
-- 0027_payment_methods.sql
--
-- Two-option freelancer payments architecture.
--
-- Replaces the legacy "freelancer pastes their own Razorpay key" model from
-- 0023 with two pragmatic, early-stage options:
--
--   1) stackivo_managed
--      Stackivo collects via the platform Razorpay account. Webhook flips
--      the invoice to `paid` automatically. Payout to the freelancer's bank
--      is processed manually by the Stackivo ops team in 1-2 business days.
--
--   2) upi_manual           (Recommended)
--      Freelancer stores a UPI VPA. The public invoice page renders a UPI
--      QR; the client pays externally. The freelancer manually confirms
--      payment in their dashboard, which generates the receipt.
--
-- This migration is ADDITIVE. The legacy 0023 columns
-- (razorpay_key_id, razorpay_key_secret_enc, razorpay_account_status,
--  razorpay_test_mode, razorpay_connected_at, razorpay_last_verified_at)
-- remain so historic data + the encryption RPCs still work, but the
-- application code no longer writes to them.
-- =============================================================================

-- --- user_profiles: payment-method config ---------------------------------
alter table public.user_profiles
  add column if not exists payment_method_type            text
    check (payment_method_type in ('stackivo_managed', 'upi_manual')),
  add column if not exists payment_method_configured_at   timestamptz,

  -- Stackivo managed → manual payouts. We just store the bank coordinates
  -- the ops team needs to push money out. Never used by the application
  -- to move money on its own.
  add column if not exists payout_account_holder_name     text,
  add column if not exists payout_bank_account_number     text,
  add column if not exists payout_bank_ifsc               text,
  add column if not exists payout_bank_name               text,

  -- UPI manual → client pays directly into this VPA.
  add column if not exists payout_upi_vpa                 text;

create index if not exists user_profiles_payment_method_idx
  on public.user_profiles (payment_method_type);

-- --- invoices: mark which collection flow produced the payment ------------
-- `payment_method` already exists (free-form string like "razorpay"). We
-- add a stricter, queryable column for the new two-option world.
alter table public.invoices
  add column if not exists payment_method_used text
    check (payment_method_used in ('stackivo_managed', 'upi_manual'));

create index if not exists invoices_payment_method_used_idx
  on public.invoices (payment_method_used);

-- --- invoice_payment_attempts: split managed vs. upi_manual; track payout -
alter table public.invoice_payment_attempts
  add column if not exists payment_method text not null default 'stackivo_managed'
    check (payment_method in ('stackivo_managed', 'upi_manual')),
  add column if not exists payout_status   text not null default 'not_applicable'
    check (payout_status in ('not_applicable', 'pending', 'processing', 'transferred', 'failed')),
  add column if not exists payout_reference text,
  add column if not exists payout_transferred_at timestamptz;

-- --- invoice_receipts -----------------------------------------------------
-- Receipts have their own table now (0013/0014 tried to live on `invoices`
-- and were dropped). Receipt numbers are per-user sequential and immutable
-- once issued; reissuing on a refund/correction creates a new row.
create table if not exists public.invoice_receipts (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid not null references public.invoices(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  receipt_number    text not null,
  payment_method    text not null
                      check (payment_method in ('stackivo_managed', 'upi_manual')),
  amount            numeric(14,2) not null,
  currency          text not null default 'INR',
  paid_at           timestamptz not null,
  payer_name        text,
  payer_email       text,
  -- For managed: razorpay_payment_id. For upi_manual: whatever the
  -- freelancer enters as the UPI reference (UTR / txn id).
  reference         text,
  notes             text,
  created_at        timestamptz not null default now(),
  unique (user_id, receipt_number)
);

create index if not exists invoice_receipts_invoice_id_idx
  on public.invoice_receipts (invoice_id);
create index if not exists invoice_receipts_user_id_idx
  on public.invoice_receipts (user_id, created_at desc);

alter table public.invoice_receipts enable row level security;

create policy "invoice_receipts owner select" on public.invoice_receipts
  for select to authenticated using (user_id = auth.uid());

-- Public payers read receipts via the parent invoice's `public_token`
-- through a security-definer view (handled in app code via service-role).
-- No INSERT/UPDATE/DELETE policies → writes flow through service-role only.

-- --- invoice_manual_confirmations ----------------------------------------
-- Audit trail for "freelancer marked this invoice paid". Distinct from
-- `invoice_payment_attempts` because no Razorpay round-trip happened.
create table if not exists public.invoice_manual_confirmations (
  id                  uuid primary key default gen_random_uuid(),
  invoice_id          uuid not null references public.invoices(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  confirmed_by_user_id uuid not null references auth.users(id) on delete cascade,
  amount              numeric(14,2) not null,
  currency            text not null default 'INR',
  paid_at             timestamptz not null,
  reference           text,
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists invoice_manual_confirmations_invoice_idx
  on public.invoice_manual_confirmations (invoice_id);
create index if not exists invoice_manual_confirmations_user_idx
  on public.invoice_manual_confirmations (user_id, created_at desc);

alter table public.invoice_manual_confirmations enable row level security;

create policy "manual_conf owner select" on public.invoice_manual_confirmations
  for select to authenticated using (user_id = auth.uid());

-- Writes are gated through service-role from a server action that has
-- already enforced ownership.

-- --- Helper: next receipt number per user --------------------------------
-- Returns the next receipt number for a user in the form RCP-YYYY-NNNNNN.
-- We don't use a sequence because numbering should reset per-user and
-- per-year. A NOT NULL UNIQUE constraint on (user_id, receipt_number)
-- guards against collisions if two writes race.
create or replace function public.next_invoice_receipt_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr int := extract(year from now() at time zone 'UTC')::int;
  n  int;
begin
  select coalesce(
           max(
             nullif(
               regexp_replace(receipt_number, '^RCP-\d{4}-', ''),
               ''
             )::int
           ),
           0
         ) + 1
    into n
    from public.invoice_receipts
   where user_id = p_user_id
     and receipt_number like ('RCP-' || yr::text || '-%');

  return format('RCP-%s-%s', yr::text, lpad(n::text, 6, '0'));
end;
$$;

revoke all on function public.next_invoice_receipt_number(uuid)
  from public, anon, authenticated;
grant execute on function public.next_invoice_receipt_number(uuid)
  to service_role;
