-- =============================================================================
-- 0006_operational.sql — Core operational domain
-- -----------------------------------------------------------------------------
-- Adds:
--   * Invoice GST breakdown columns (cgst/sgst/igst, tax_mode, classification,
--     buyer/seller state snapshots).
--   * Contracts.kind so the same table backs "proposal" + "contract".
--   * `time_entries` table for time tracking + billable hours.
--   * `activity_events` table for the cross-module activity timeline.
--   * RLS + indexes on new tables.
-- =============================================================================

-- --- invoices: GST engine columns ------------------------------------------
alter table public.invoices
  add column if not exists tax_mode text not null default 'non_gst'
    check (tax_mode in ('non_gst','cgst_sgst','igst')),
  add column if not exists classification text not null default 'standard'
    check (classification in ('standard','b2c','b2b')),
  add column if not exists cgst_amount numeric(14,2) not null default 0,
  add column if not exists sgst_amount numeric(14,2) not null default 0,
  add column if not exists igst_amount numeric(14,2) not null default 0,
  add column if not exists seller_state_code text,
  add column if not exists client_state_code text,
  add column if not exists footer_note text,
  add column if not exists sent_at timestamptz,
  add column if not exists paid_at timestamptz;

create index if not exists invoices_tax_mode_idx        on public.invoices (tax_mode);
create index if not exists invoices_issue_date_idx      on public.invoices (issue_date);
create index if not exists invoices_user_status_due_idx on public.invoices (user_id, status, due_date);

-- --- invoice_items: ensure position default + index ------------------------
create index if not exists invoice_items_position_idx on public.invoice_items (invoice_id, position);

-- --- contracts: proposal vs contract ---------------------------------------
alter table public.contracts
  add column if not exists kind text not null default 'contract'
    check (kind in ('proposal','contract')),
  add column if not exists sent_at timestamptz,
  add column if not exists viewed_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists currency text not null default 'INR',
  add column if not exists value_amount numeric(14,2);

create index if not exists contracts_kind_idx on public.contracts (kind);

-- --- time_entries -----------------------------------------------------------
create table if not exists public.time_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  client_id         uuid references public.clients(id)  on delete set null,
  description       text,
  started_at        timestamptz not null,
  ended_at          timestamptz,
  duration_seconds  bigint not null default 0,
  billable          boolean not null default true,
  hourly_rate       numeric(12,2) not null default 0,
  amount            numeric(14,2) not null default 0,
  tags              text[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  check (duration_seconds >= 0)
);

create index if not exists time_entries_user_id_idx       on public.time_entries (user_id);
create index if not exists time_entries_project_id_idx    on public.time_entries (project_id);
create index if not exists time_entries_client_id_idx     on public.time_entries (client_id);
create index if not exists time_entries_started_at_idx    on public.time_entries (started_at desc);
create index if not exists time_entries_running_idx       on public.time_entries (user_id) where ended_at is null;

create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

-- --- activity_events --------------------------------------------------------
create table if not exists public.activity_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,
  entity_type   text not null
                  check (entity_type in (
                    'project','client','invoice','contract','time_entry','file','system'
                  )),
  entity_id     uuid,
  title         text not null,
  message       text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists activity_events_user_id_idx     on public.activity_events (user_id);
create index if not exists activity_events_created_at_idx  on public.activity_events (user_id, created_at desc);
create index if not exists activity_events_entity_idx      on public.activity_events (entity_type, entity_id);

-- --- RLS for new tables -----------------------------------------------------
alter table public.time_entries enable row level security;

create policy time_entries_select_own on public.time_entries
  for select to authenticated using (auth.uid() = user_id);
create policy time_entries_insert_own on public.time_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy time_entries_update_own on public.time_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy time_entries_delete_own on public.time_entries
  for delete to authenticated using (auth.uid() = user_id);

alter table public.activity_events enable row level security;

create policy activity_events_select_own on public.activity_events
  for select to authenticated using (auth.uid() = user_id);
create policy activity_events_insert_own on public.activity_events
  for insert to authenticated with check (auth.uid() = user_id);
-- Inserts may also come from server actions running as the user. No update /
-- delete policies — events are append-only.

-- --- Notifications insert policy (allow user-scoped inserts) ---------------
-- Originally inserts were service-role-only. Server actions running as the
-- user need to write activity-driven notifications too.
do $$ begin
  create policy notifications_insert_own on public.notifications
    for insert to authenticated with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
