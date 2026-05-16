-- =============================================================================
-- 0003_rls_policies.sql — Row-Level Security policies
-- -----------------------------------------------------------------------------
-- Implements SAD § 2.2:
--   "USING (auth.uid() = user_id)" applied to all per-tenant business tables.
--
-- All policies are permissive + role-scoped to `authenticated`. The service
-- role bypasses RLS automatically, so webhook / cron code in `admin.ts` is
-- unaffected.
-- =============================================================================

-- Helper macro-like block: enables RLS + 4 standard policies per table.
-- PostgreSQL has no macros, so each table is spelled out explicitly below.

-- --- user_profiles ----------------------------------------------------------
alter table public.user_profiles enable row level security;

create policy user_profiles_select_own on public.user_profiles
  for select to authenticated using (auth.uid() = id);

create policy user_profiles_update_own on public.user_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Insert is handled by the `on_auth_user_created` trigger (security definer),
-- so no client-side insert policy is needed.

-- --- clients ----------------------------------------------------------------
alter table public.clients enable row level security;

create policy clients_select_own on public.clients
  for select to authenticated using (auth.uid() = user_id);
create policy clients_insert_own on public.clients
  for insert to authenticated with check (auth.uid() = user_id);
create policy clients_update_own on public.clients
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy clients_delete_own on public.clients
  for delete to authenticated using (auth.uid() = user_id);

-- --- projects ---------------------------------------------------------------
alter table public.projects enable row level security;

create policy projects_select_own on public.projects
  for select to authenticated using (auth.uid() = user_id);
create policy projects_insert_own on public.projects
  for insert to authenticated with check (auth.uid() = user_id);
create policy projects_update_own on public.projects
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_delete_own on public.projects
  for delete to authenticated using (auth.uid() = user_id);

-- --- invoices ---------------------------------------------------------------
alter table public.invoices enable row level security;

create policy invoices_select_own on public.invoices
  for select to authenticated using (auth.uid() = user_id);
create policy invoices_insert_own on public.invoices
  for insert to authenticated with check (auth.uid() = user_id);
create policy invoices_update_own on public.invoices
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy invoices_delete_own on public.invoices
  for delete to authenticated using (auth.uid() = user_id);

-- --- invoice_items (scoped via parent invoice) ------------------------------
alter table public.invoice_items enable row level security;

create policy invoice_items_select_own on public.invoice_items
  for select to authenticated using (
    exists (select 1 from public.invoices i
            where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );
create policy invoice_items_insert_own on public.invoice_items
  for insert to authenticated with check (
    exists (select 1 from public.invoices i
            where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );
create policy invoice_items_update_own on public.invoice_items
  for update to authenticated using (
    exists (select 1 from public.invoices i
            where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.invoices i
            where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );
create policy invoice_items_delete_own on public.invoice_items
  for delete to authenticated using (
    exists (select 1 from public.invoices i
            where i.id = invoice_items.invoice_id and i.user_id = auth.uid())
  );

-- --- contracts --------------------------------------------------------------
alter table public.contracts enable row level security;

create policy contracts_select_own on public.contracts
  for select to authenticated using (auth.uid() = user_id);
create policy contracts_insert_own on public.contracts
  for insert to authenticated with check (auth.uid() = user_id);
create policy contracts_update_own on public.contracts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy contracts_delete_own on public.contracts
  for delete to authenticated using (auth.uid() = user_id);

-- Public-token read path for the /sign/:token page. Only exposes the row,
-- not related client/project data, which stays behind auth.
create policy contracts_public_token_read on public.contracts
  for select to anon using (public_token is not null);

-- --- files ------------------------------------------------------------------
alter table public.files enable row level security;

create policy files_select_own on public.files
  for select to authenticated using (auth.uid() = user_id);
create policy files_insert_own on public.files
  for insert to authenticated with check (auth.uid() = user_id);
create policy files_update_own on public.files
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy files_delete_own on public.files
  for delete to authenticated using (auth.uid() = user_id);

-- --- notifications ----------------------------------------------------------
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy notifications_update_own on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- Inserts are server-side only (service role) for cross-cutting events.

-- --- subscriptions ----------------------------------------------------------
alter table public.subscriptions enable row level security;

-- Users may READ their own subscription to drive UI gates. Mutations are
-- server-side only (Razorpay webhooks + admin ops run with the service role).
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- --- usage_counters ---------------------------------------------------------
alter table public.usage_counters enable row level security;

-- Users may READ their own usage counters to power the "usage" UI.
create policy usage_counters_select_own on public.usage_counters
  for select to authenticated using (auth.uid() = user_id);

-- Mutations happen via the `public.increment_usage()` SQL function which
-- validates the caller inside server-side code paths.
