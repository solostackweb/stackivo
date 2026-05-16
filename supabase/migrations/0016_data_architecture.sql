-- =============================================================================
-- 0016_data_architecture.sql — Tactical data architecture improvements
-- -----------------------------------------------------------------------------
-- Bundles five additive, backward-compatible improvements identified in the
-- database architecture audit:
--
--   B.2  Fix the wide-open contract_signatures INSERT policy.
--   B.4  pg_trgm extension + GIN trigram indexes for ILIKE search on
--        clients + invoices.
--   B.5  Notifications: add entity_type / entity_id / metadata / read_at
--        + partial index on unread rows for the in-app feed hot path.
--   B.15 files.bucket column so a metadata row is self-describing
--        (today the bucket lives only in TS).
--   B.3  SQL aggregation RPCs so dashboard pages stop pulling whole tables
--        into JS for client_revenue / overdue / paid summaries.
--
-- All changes are idempotent (`if not exists`, `do … exception duplicate_*`)
-- so this is safe to re-run.
-- =============================================================================

-- ============================================================================
-- B.2 — Contract signatures: restrict INSERT to row-owner
-- ----------------------------------------------------------------------------
-- The original policy used `with check (true)` which lets any authenticated
-- user forge audit-trail rows for any contract via the REST API. Replace it
-- with the same `auth.uid() = user_id` shape used everywhere else.
-- Service-role inserts (from `signContractPublicAction`) bypass RLS so the
-- public sign flow keeps working unchanged.
-- ============================================================================
drop policy if exists "Service role can insert signatures"
  on public.contract_signatures;

do $$ begin
  create policy contract_signatures_insert_own
    on public.contract_signatures
    for insert to authenticated
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Normalise the existing select policy name to match project convention
-- (snake_case, no spaces). Keeps `grep` predictable.
drop policy if exists "Freelancers can view their contract signatures"
  on public.contract_signatures;

do $$ begin
  create policy contract_signatures_select_own
    on public.contract_signatures
    for select to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;


-- ============================================================================
-- B.4 — pg_trgm + GIN trigram indexes
-- ----------------------------------------------------------------------------
-- Server code does `ilike '%term%'` (leading wildcard) which is a sequential
-- scan without a trigram index. At 10k+ rows per user this is the kind of
-- query that turns into a visible UI freeze.
-- ============================================================================
create extension if not exists pg_trgm;

-- Clients: search hits full_name OR business_name OR email. A single GIN
-- index over a concatenated expression covers all three branches of the
-- existing `.or(...)` query in clients/server.ts.
create index if not exists clients_search_trgm_idx
  on public.clients using gin (
    (
      coalesce(full_name, '')     || ' ' ||
      coalesce(business_name, '') || ' ' ||
      coalesce(email, '')
    ) gin_trgm_ops
  );

-- Invoices: ILIKE on invoice_number for the list page.
create index if not exists invoices_number_trgm_idx
  on public.invoices using gin (invoice_number gin_trgm_ops);


-- ============================================================================
-- B.5 — Notifications: entity linkage + read_at + partial unread index
-- ----------------------------------------------------------------------------
-- Brings notifications inline with activity_events so the UI can deep-link
-- "Invoice 0042 viewed" → /invoices/<id>. Also adds `read_at` so the
-- analytics layer can answer "median time-to-read", and a partial index
-- on the unread set (which is the hot query for the in-app bell).
-- ============================================================================
alter table public.notifications
  add column if not exists entity_type text
    check (entity_type is null or entity_type in (
      'project','client','invoice','contract','time_entry','file','system','billing'
    )),
  add column if not exists entity_id   uuid,
  add column if not exists metadata    jsonb not null default '{}'::jsonb,
  add column if not exists read_at     timestamptz;

create index if not exists notifications_entity_idx
  on public.notifications (entity_type, entity_id);

-- Partial index on the unread set. The "unread feed" query becomes an
-- index-only scan against this much smaller subset.
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read = false;


-- ============================================================================
-- B.15 — files.bucket column
-- ----------------------------------------------------------------------------
-- Today the bucket is encoded only in `FileBucket` (TS) and storage policies.
-- A `files` row is not self-describing. Storing the bucket alongside
-- `storage_path` lets us reconstruct a signed URL or migrate storage backends
-- without going back to the TS code.
-- Default = 'portal-files' covers existing rows; the column is NOT NULL so
-- new inserts must be explicit.
-- ============================================================================
alter table public.files
  add column if not exists bucket text not null default 'portal-files'
    check (bucket in (
      'invoices','contracts','portal-files','profile-images','branding-assets'
    ));

create index if not exists files_bucket_idx
  on public.files (bucket);


-- ============================================================================
-- B.3 — SQL aggregation RPCs (security invoker → RLS applies inside)
-- ----------------------------------------------------------------------------
-- These replace four "fetch all rows and reduce in JS" patterns in
-- src/features/pulse/server.ts and src/features/clients/server.ts.
--
-- `security invoker` is critical: RLS runs as the caller, not as the function
-- owner, so each user only sees their own rows just like every other query.
-- `stable` lets the planner cache evaluation within a statement.
-- ============================================================================

-- ----- Client revenue ranking (replaces JS reduction in pulse/server.ts) ----
create or replace function public.client_revenue_summary(
  p_limit int default 5
) returns table (
  client_id     uuid,
  total_paid    numeric,
  invoice_count bigint
)
language sql
security invoker
stable
set search_path = public
as $$
  select client_id,
         sum(total_amount)::numeric as total_paid,
         count(*)::bigint           as invoice_count
    from public.invoices
   where status    = 'paid'
     and client_id is not null
   group by client_id
   order by total_paid desc nulls last
   limit greatest(coalesce(p_limit, 5), 1);
$$;

-- ----- Status summary (count + sum) for overdue / paid / draft / etc. ------
create or replace function public.invoice_status_summary(
  p_status text
) returns table (
  invoice_count bigint,
  total_amount  numeric
)
language sql
security invoker
stable
set search_path = public
as $$
  select count(*)::bigint,
         coalesce(sum(total_amount), 0)::numeric
    from public.invoices
   where status = p_status;
$$;

-- ----- Per-client invoice metrics (paid count + paid sum) -------------------
create or replace function public.client_invoice_metrics(
  p_client_id uuid
) returns table (
  invoice_count bigint,
  paid_total    numeric
)
language sql
security invoker
stable
set search_path = public
as $$
  select count(*)::bigint,
         coalesce(sum(total_amount), 0)::numeric
    from public.invoices
   where client_id = p_client_id
     and status    = 'paid';
$$;

-- Grant execute to authenticated. Anon has no business calling these.
grant execute on function public.client_revenue_summary(int)     to authenticated;
grant execute on function public.invoice_status_summary(text)    to authenticated;
grant execute on function public.client_invoice_metrics(uuid)    to authenticated;
