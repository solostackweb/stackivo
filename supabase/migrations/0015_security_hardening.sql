-- =============================================================================
-- 0015_security_hardening.sql — Production-grade security baseline
-- -----------------------------------------------------------------------------
-- Two unrelated hardenings packaged together so they can be deployed atomically:
--
-- A. Drop the broad anon-role SELECT policies on contracts / invoices /
--    invoice_items. The policies were defined in 0003 + 0008 with
--    `using (public_token is not null)` which lets ANY anonymous client
--    holding the public Supabase anon key (which ships in every browser
--    bundle as NEXT_PUBLIC_SUPABASE_ANON_KEY) enumerate every shared
--    contract / invoice across the entire platform via the REST endpoint
--      GET /rest/v1/contracts?public_token=not.is.null
--    This is a P0 data-leak.
--
--    The application never relies on these policies — every public share
--    read goes through the service-role client in
--    `src/features/share/server.ts`. Dropping them is purely a
--    defense-in-depth tightening; no app behaviour changes.
--
-- B. Apply per-bucket file-size + MIME-type guardrails on Supabase Storage
--    so a single bad actor can't fill storage with executables or
--    arbitrary multi-gigabyte uploads.
-- =============================================================================

-- ----- A. Drop broad anon SELECT policies -----------------------------------
drop policy if exists contracts_public_token_read       on public.contracts;
drop policy if exists invoices_public_token_read        on public.invoices;
drop policy if exists invoice_items_public_token_read   on public.invoice_items;

-- ----- B. Storage bucket size + MIME constraints ----------------------------
-- Profile + branding assets: small, images only.
update storage.buckets set
  file_size_limit    = 5242880,   -- 5 MB
  allowed_mime_types = array[
    'image/png','image/jpeg','image/webp','image/svg+xml','image/gif'
  ]
where id in ('profile-images', 'branding-assets');

-- Contract / invoice attachments: PDFs + images.
update storage.buckets set
  file_size_limit    = 26214400,  -- 25 MB
  allowed_mime_types = array[
    'application/pdf',
    'image/png','image/jpeg','image/webp'
  ]
where id in ('contracts', 'invoices');

-- Portal files (client deliverables): broader range, larger cap.
update storage.buckets set
  file_size_limit    = 52428800,  -- 50 MB
  allowed_mime_types = array[
    'application/pdf',
    'image/png','image/jpeg','image/webp',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'text/plain','text/csv'
  ]
where id = 'portal-files';

-- ----- C. Composite indexes for the dashboard hot paths ---------------------
-- These pay for themselves on tenants with >100 invoices / contracts. RLS
-- already narrows to one user, but PG still scans the per-user partition; a
-- composite (user_id, created_at desc) lets the planner go straight to the
-- top N rows without a sort.
create index if not exists invoices_user_created_idx
  on public.invoices (user_id, created_at desc);
create index if not exists contracts_user_created_idx
  on public.contracts (user_id, created_at desc);
create index if not exists clients_user_created_idx
  on public.clients (user_id, created_at desc);
create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read, created_at desc);
