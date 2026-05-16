-- =============================================================================
-- 0023_invoice_payments.sql
--
-- Phase 0a — Invoice flow restoration.
--
-- Adds per-user Razorpay credentials so each freelancer can collect client
-- invoice payments into THEIR OWN Razorpay account. Stackivo never holds
-- client money — we only sign orders on the freelancer's behalf.
--
-- Secrets are encrypted at rest using `pgcrypto` symmetric encryption.
-- The encryption key lives in `app.invoice_payment_secret_key` (a Postgres
-- GUC set at the DB level). Production should rotate this via a controlled
-- migration; the local default below is for development only.
--
-- Adds idempotency support for invoice payment webhook events on the
-- existing `invoices` table by reusing the `payment_reference` column.
-- =============================================================================

-- pgcrypto for symmetric encryption + gen_random_uuid (already enabled by 0001
-- but `create extension if not exists` is idempotent and self-documenting).
create extension if not exists pgcrypto;

-- --- user_profiles: per-user Razorpay credentials --------------------------
alter table public.user_profiles
  add column if not exists razorpay_key_id           text,
  add column if not exists razorpay_key_secret_enc   bytea,
  add column if not exists razorpay_account_status   text not null default 'unverified'
    check (razorpay_account_status in ('unverified', 'connected', 'invalid', 'revoked')),
  add column if not exists razorpay_test_mode        boolean not null default true,
  add column if not exists razorpay_connected_at     timestamptz,
  add column if not exists razorpay_last_verified_at timestamptz;

-- --- invoice_payment_attempts ---------------------------------------------
-- Per-attempt audit trail. We DO upsert the canonical paid state onto the
-- invoice row directly, but we keep a sequential history of every Razorpay
-- order/payment touched against an invoice for reconciliation + debugging.
create table if not exists public.invoice_payment_attempts (
  id                    uuid primary key default gen_random_uuid(),
  invoice_id            uuid not null references public.invoices(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id     text,
  razorpay_payment_id   text,
  amount                numeric(12, 2) not null,
  currency              text not null default 'INR',
  status                text not null check (
    status in ('created', 'authorized', 'captured', 'failed', 'refunded')
  ),
  error_code            text,
  error_description     text,
  payload               jsonb,
  created_at            timestamptz not null default now()
);
create index if not exists idx_inv_pay_attempts_invoice on public.invoice_payment_attempts (invoice_id, created_at desc);
create unique index if not exists uq_inv_pay_attempts_payment on public.invoice_payment_attempts (razorpay_payment_id) where razorpay_payment_id is not null;
create unique index if not exists uq_inv_pay_attempts_order on public.invoice_payment_attempts (razorpay_order_id) where razorpay_order_id is not null;

alter table public.invoice_payment_attempts enable row level security;

create policy "inv_pay_attempts owner select" on public.invoice_payment_attempts
  for select to authenticated using (user_id = auth.uid());

-- Inserts/updates happen via service-role from the server actions / webhook.
-- No INSERT/UPDATE policy → RLS denies authenticated mutations by default.

-- --- Helper: decrypt the per-user Razorpay secret --------------------------
-- Stackivo server reads via service-role + this function (definer security).
-- The encryption key is sourced from a runtime GUC so we don't bake it into
-- the migration. Set per-environment via:
--   alter database <db> set app.invoice_payment_secret_key = '<32-byte-hex>'

create or replace function public.encrypt_razorpay_secret(plaintext text)
returns bytea
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := current_setting('app.invoice_payment_secret_key', true);
begin
  if key is null or length(key) < 16 then
    raise exception 'app.invoice_payment_secret_key not configured';
  end if;
  return pgp_sym_encrypt(plaintext, key);
end;
$$;

create or replace function public.decrypt_razorpay_secret(ciphertext bytea)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := current_setting('app.invoice_payment_secret_key', true);
begin
  if ciphertext is null then
    return null;
  end if;
  if key is null or length(key) < 16 then
    raise exception 'app.invoice_payment_secret_key not configured';
  end if;
  return pgp_sym_decrypt(ciphertext, key);
end;
$$;

revoke all on function public.encrypt_razorpay_secret(text) from public, anon, authenticated;
revoke all on function public.decrypt_razorpay_secret(bytea) from public, anon, authenticated;
grant execute on function public.encrypt_razorpay_secret(text) to service_role;
grant execute on function public.decrypt_razorpay_secret(bytea) to service_role;

-- --- High-level wrappers used by the application server -------------------

-- Sets a user's Razorpay credentials, encrypting the secret in-database so
-- the plaintext NEVER hits the application's process memory persistently.
create or replace function public.set_user_razorpay_secret(
  p_user_id   uuid,
  p_key_id    text,
  p_key_secret text,
  p_test_mode boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
     set razorpay_key_id = p_key_id,
         razorpay_key_secret_enc = public.encrypt_razorpay_secret(p_key_secret),
         razorpay_test_mode = coalesce(p_test_mode, true),
         razorpay_account_status = 'unverified'
   where id = p_user_id;
end;
$$;

create or replace function public.decrypt_user_razorpay_secret(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  enc bytea;
begin
  select razorpay_key_secret_enc into enc
    from public.user_profiles
   where id = p_user_id;
  return public.decrypt_razorpay_secret(enc);
end;
$$;

revoke all on function public.set_user_razorpay_secret(uuid, text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.decrypt_user_razorpay_secret(uuid)
  from public, anon, authenticated;
grant execute on function public.set_user_razorpay_secret(uuid, text, text, boolean)
  to service_role;
grant execute on function public.decrypt_user_razorpay_secret(uuid)
  to service_role;
