-- =============================================================================
-- 0034_payment_architecture.sql
--
-- Extends the 0027 two-option model into a full three-method architecture:
--
--   stackivo_managed (updated)
--     Client pays via Razorpay Checkout (card / UPI / net banking /
--     international). Razorpay captures to Stackivo's account; Stackivo
--     ops processes a payout to the freelancer's bank within 1-2 business
--     days. Freelancer must be registered as a Razorpay Contact + Fund
--     Account so the ops team can push money via the Payouts API.
--
--   upi_smart  (NEW)
--     Client pays a per-invoice Virtual UPI VPA (Razorpay Smart Collect).
--     Webhook `virtual_account.credited` auto-marks the invoice paid.
--     Same Contact + Fund Account registration as stackivo_managed;
--     Indian UPI only; ~1.77% fee.
--
--   upi_manual  (unchanged)
--     Client pays freelancer's UPI VPA directly. Zero fee. Freelancer
--     confirms payment manually.
--
-- Changes in this migration
-- ─────────────────────────
-- user_profiles
--   + payout_pan                  — PAN for Razorpay compliance / KYC
--   + razorpay_contact_id         — Contact created via /v1/contacts
--   + razorpay_fund_account_id    — Fund account via /v1/fund_accounts
--   + fee_passthrough_enabled     — Global toggle: pass Razorpay fee to client
--   + fee_passthrough_percent     — Stored rate shown on invoices (e.g. 1.77)
--   CHECK constraint updated to allow 'upi_smart'
--
-- invoices
--   + smart_collect_virtual_account_id  — Razorpay virtual account ID
--   + smart_collect_vpa                 — Virtual UPI address (client pays this)
--   + smart_collect_expires_at          — When the virtual account closes
--   + fee_passthrough_amount            — Line-item fee charged to client
--   CHECK constraint updated to allow 'upi_smart'
--
-- invoice_payment_attempts        — CHECK updated for 'upi_smart'
-- invoice_receipts                — CHECK updated for 'upi_smart'
-- =============================================================================

-- ---------------------------------------------------------------------------
-- user_profiles: new columns
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists payout_pan                   text,
  add column if not exists razorpay_contact_id          text,
  add column if not exists razorpay_fund_account_id     text,
  add column if not exists fee_passthrough_enabled      boolean not null default false,
  add column if not exists fee_passthrough_percent      numeric(5,2);

-- Update the payment_method_type CHECK to include 'upi_smart'.
-- We drop-and-recreate because the original inline CHECK in 0027 uses a
-- Postgres-generated name. The DO block handles both "was applied" and
-- "never ran on this DB" paths safely.
do $$
declare
  v_cname text;
begin
  select constraint_name into v_cname
    from information_schema.table_constraints
   where table_schema   = 'public'
     and table_name     = 'user_profiles'
     and constraint_type = 'CHECK'
     and constraint_name ilike '%payment_method_type%'
   limit 1;

  if v_cname is not null then
    execute format('alter table public.user_profiles drop constraint %I', v_cname);
  end if;
end
$$;

alter table public.user_profiles
  add constraint user_profiles_payment_method_type_check
  check (payment_method_type in ('stackivo_managed', 'upi_smart', 'upi_manual'));

-- Index for Contact/Fund Account lookups (ops tooling).
create index if not exists user_profiles_razorpay_contact_idx
  on public.user_profiles (razorpay_contact_id)
  where razorpay_contact_id is not null;

-- ---------------------------------------------------------------------------
-- invoices: Smart Collect columns + fee passthrough
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists smart_collect_virtual_account_id  text,
  add column if not exists smart_collect_vpa                 text,
  add column if not exists smart_collect_expires_at          timestamptz,
  add column if not exists fee_passthrough_amount            numeric(14,2);

-- Update payment_method_used CHECK (same drop-and-recreate pattern).
do $$
declare
  v_cname text;
begin
  select constraint_name into v_cname
    from information_schema.table_constraints
   where table_schema   = 'public'
     and table_name     = 'invoices'
     and constraint_type = 'CHECK'
     and constraint_name ilike '%payment_method_used%'
   limit 1;

  if v_cname is not null then
    execute format('alter table public.invoices drop constraint %I', v_cname);
  end if;
end
$$;

alter table public.invoices
  add constraint invoices_payment_method_used_check
  check (payment_method_used in ('stackivo_managed', 'upi_smart', 'upi_manual'));

create index if not exists invoices_smart_collect_vpa_idx
  on public.invoices (smart_collect_vpa)
  where smart_collect_vpa is not null;

-- ---------------------------------------------------------------------------
-- invoice_payment_attempts: update CHECK for upi_smart
-- ---------------------------------------------------------------------------
do $$
declare
  v_cname text;
begin
  select constraint_name into v_cname
    from information_schema.table_constraints
   where table_schema   = 'public'
     and table_name     = 'invoice_payment_attempts'
     and constraint_type = 'CHECK'
     and constraint_name ilike '%payment_method%'
   limit 1;

  if v_cname is not null then
    execute format(
      'alter table public.invoice_payment_attempts drop constraint %I',
      v_cname
    );
  end if;
end
$$;

alter table public.invoice_payment_attempts
  add constraint invoice_payment_attempts_payment_method_check
  check (payment_method in ('stackivo_managed', 'upi_smart', 'upi_manual'));

-- ---------------------------------------------------------------------------
-- invoice_receipts: update CHECK for upi_smart
-- ---------------------------------------------------------------------------
do $$
declare
  v_cname text;
begin
  select constraint_name into v_cname
    from information_schema.table_constraints
   where table_schema   = 'public'
     and table_name     = 'invoice_receipts'
     and constraint_type = 'CHECK'
     and constraint_name ilike '%payment_method%'
   limit 1;

  if v_cname is not null then
    execute format(
      'alter table public.invoice_receipts drop constraint %I',
      v_cname
    );
  end if;
end
$$;

alter table public.invoice_receipts
  add constraint invoice_receipts_payment_method_check
  check (payment_method in ('stackivo_managed', 'upi_smart', 'upi_manual'));
