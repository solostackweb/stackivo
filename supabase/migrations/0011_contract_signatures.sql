-- =============================================================================
-- 0011_contract_signatures.sql — Contract signature metadata and audit trail
-- =============================================================================
-- Adds comprehensive signature capture, audit trail, and immutable PDF support
-- to contracts table per MVP signature system specification.
-- =============================================================================

-- --- Add signature metadata columns to contracts table ----------------------
alter table public.contracts
add column if not exists signature_type text
  check (signature_type in ('draw', 'type', 'upload')),
add column if not exists signature_image_url text,
add column if not exists signature_text_value text,
add column if not exists signature_font_family text,
add column if not exists signature_metadata jsonb,
add column if not exists pdf_snapshot_url text,
add column if not exists pdf_snapshot_hash text,
add column if not exists viewed_at timestamptz;

-- --- Add indexes for audit trail queries ------------------------------------
create index if not exists contracts_viewed_at_idx on public.contracts (viewed_at);
create index if not exists contracts_signed_at_idx on public.contracts (signed_at);

-- --- Signature metadata should contain: ------
-- {
--   "signed_ip": "192.168.1.1",
--   "signed_user_agent": "Mozilla/5.0...",
--   "signed_device": {
--     "os": "Windows",
--     "browser": "Chrome",
--     "device_type": "Desktop"
--   },
--   "signature_accepted_at": "2026-05-09T10:30:00Z",
--   "legal_name_confirmed": true,
--   "agreement_accepted": true
-- }

-- --- Create contract_signatures table for enhanced audit trail ---------------
create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  signature_type text not null
    check (signature_type in ('draw', 'type', 'upload')),
  signature_image_url text,
  signature_text_value text,
  signature_font_family text,
  legal_name text not null,
  signed_ip text,
  signed_user_agent text,
  signed_device jsonb,
  signed_at timestamptz not null default now(),
  pdf_snapshot_url text,
  pdf_snapshot_hash text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contract_signatures_contract_id_idx
  on public.contract_signatures (contract_id);
create index if not exists contract_signatures_user_id_idx
  on public.contract_signatures (user_id);
create index if not exists contract_signatures_signed_at_idx
  on public.contract_signatures (signed_at);

-- --- RLS policies for contract_signatures table ----------------------------
alter table public.contract_signatures enable row level security;

create policy "Freelancers can view their contract signatures"
  on public.contract_signatures for select
  using (auth.uid() = user_id);

create policy "Service role can insert signatures"
  on public.contract_signatures for insert
  with check (true);
