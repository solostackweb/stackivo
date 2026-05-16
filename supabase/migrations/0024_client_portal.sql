-- =============================================================================
-- 0024_client_portal.sql
--
-- Phase 1 — Client Portal MVP.
--
-- A client portal is a shared workspace between a freelancer and one or more
-- of their clients. The freelancer (owner) creates the portal and attaches
-- existing entities (clients, contracts, invoices) plus uploads files.
-- Clients sign in with Supabase Auth and see a stripped-down workspace at
-- /portal/<id>.
--
-- Tables created:
--   portals                       — top-level workspace
--   portal_members                — N:M user ↔ portal (with role + revoke)
--   portal_invitations            — pre-account invite tokens
--   portal_files                  — R2-backed uploads
--   portal_messages               — thread comments (no realtime in MVP)
--   portal_activity               — audit feed for the portal home page
--   portal_storage_usage          — denormalised quota cache
--   portal_notification_outbox    — digest worker drains this
--   portal_contracts              — junction: portal → existing contract
--   portal_invoices               — junction: portal → existing invoice
--
-- All access is gated by RLS: the freelancer (owner) sees only their own
-- portals; clients see only portals they are an active member of. We also
-- gate every mutation in the application layer via `requirePortalAccess()`,
-- so a missing/buggy RLS policy can never be the only line of defence.
-- =============================================================================

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ---------- 1. portals ----------------------------------------------------
create table if not exists public.portals (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  -- Optional client linkage for convenience reporting. Many freelancers
  -- attach a portal directly to an existing CRM `clients` row.
  client_id       uuid references public.clients(id) on delete set null,
  brand_color     text default '#6366F1',
  status          text not null default 'active'
                    check (status in ('active', 'archived', 'deleted')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists portals_owner_idx
  on public.portals (owner_user_id) where deleted_at is null;
create index if not exists portals_client_idx
  on public.portals (client_id) where deleted_at is null;

-- ---------- 2. portal_members --------------------------------------------
create table if not exists public.portal_members (
  portal_id   uuid not null references public.portals(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner', 'client')),
  invited_at  timestamptz not null default now(),
  joined_at   timestamptz,
  revoked_at  timestamptz,
  primary key (portal_id, user_id)
);
create index if not exists portal_members_user_idx
  on public.portal_members (user_id) where revoked_at is null;
create index if not exists portal_members_portal_idx
  on public.portal_members (portal_id) where revoked_at is null;

-- ---------- 3. portal_invitations ----------------------------------------
-- Pre-account invitations. The freelancer sends an email containing a
-- one-time invitation token. The client clicks → /portal/accept?token=...,
-- signs up (or signs in), and we materialise a `portal_members` row.
-- We store only the SHA-256 hash of the token so a database leak doesn't
-- give an attacker valid invite links.
create table if not exists public.portal_invitations (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portals(id) on delete cascade,
  email        citext not null,
  token_hash   text not null unique,
  invited_by   uuid not null references auth.users(id) on delete cascade,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index if not exists portal_invitations_portal_idx
  on public.portal_invitations (portal_id, accepted_at);
create index if not exists portal_invitations_email_idx
  on public.portal_invitations (email)
  where accepted_at is null;

-- ---------- 4. portal_files ----------------------------------------------
create table if not exists public.portal_files (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portals(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  r2_key      text not null unique,
  name        text not null,
  size_bytes  bigint not null check (size_bytes >= 0),
  mime_type   text not null,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists portal_files_portal_idx
  on public.portal_files (portal_id, created_at desc) where deleted_at is null;

-- ---------- 5. portal_messages -------------------------------------------
create table if not exists public.portal_messages (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portals(id) on delete cascade,
  parent_id   uuid references public.portal_messages(id) on delete set null,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (length(body) between 1 and 8000),
  attachments jsonb,
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz
);
create index if not exists portal_messages_portal_idx
  on public.portal_messages (portal_id, created_at desc) where deleted_at is null;

-- ---------- 6. portal_activity -------------------------------------------
create table if not exists public.portal_activity (
  id          bigserial primary key,
  portal_id   uuid not null references public.portals(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  -- Free-form type so we can extend without migrations:
  --   portal.created, portal.member_invited, portal.member_joined,
  --   file.uploaded, file.deleted, message.posted, contract.attached,
  --   contract.signed, invoice.attached, invoice.paid, etc.
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists portal_activity_portal_idx
  on public.portal_activity (portal_id, created_at desc);

-- ---------- 7. portal_storage_usage --------------------------------------
create table if not exists public.portal_storage_usage (
  portal_id   uuid primary key references public.portals(id) on delete cascade,
  total_bytes bigint not null default 0,
  file_count  int not null default 0,
  updated_at  timestamptz not null default now()
);

-- Trigger: keep portal_storage_usage in sync on file insert / soft-delete /
-- hard-delete. We treat soft-delete (deleted_at IS NOT NULL) as releasing
-- the storage so the freelancer's quota frees up immediately.
create or replace function public.portal_files_usage_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal uuid;
  v_total  bigint;
  v_count  int;
begin
  if (tg_op = 'INSERT') then
    v_portal := new.portal_id;
  elsif (tg_op = 'DELETE') then
    v_portal := old.portal_id;
  else
    v_portal := coalesce(new.portal_id, old.portal_id);
  end if;

  select coalesce(sum(size_bytes), 0), count(*)
    into v_total, v_count
    from public.portal_files
   where portal_id = v_portal
     and deleted_at is null;

  insert into public.portal_storage_usage (portal_id, total_bytes, file_count, updated_at)
  values (v_portal, v_total, v_count, now())
  on conflict (portal_id) do update
    set total_bytes = excluded.total_bytes,
        file_count  = excluded.file_count,
        updated_at  = excluded.updated_at;

  return null;
end
$$;

drop trigger if exists portal_files_usage_sync_trg on public.portal_files;
create trigger portal_files_usage_sync_trg
after insert or update of deleted_at, size_bytes or delete
on public.portal_files
for each row execute function public.portal_files_usage_sync();

-- ---------- 8. portal_notification_outbox --------------------------------
create table if not exists public.portal_notification_outbox (
  id            bigserial primary key,
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  portal_id     uuid references public.portals(id) on delete cascade,
  event_type    text not null,
  payload       jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists portal_outbox_due_idx
  on public.portal_notification_outbox (scheduled_for)
  where sent_at is null;

-- ---------- 9. junction tables -------------------------------------------
create table if not exists public.portal_contracts (
  portal_id   uuid not null references public.portals(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  added_at    timestamptz not null default now(),
  added_by    uuid not null references auth.users(id) on delete cascade,
  primary key (portal_id, contract_id)
);
create index if not exists portal_contracts_contract_idx
  on public.portal_contracts (contract_id);

create table if not exists public.portal_invoices (
  portal_id  uuid not null references public.portals(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  added_at   timestamptz not null default now(),
  added_by   uuid not null references auth.users(id) on delete cascade,
  primary key (portal_id, invoice_id)
);
create index if not exists portal_invoices_invoice_idx
  on public.portal_invoices (invoice_id);

-- ---------- 10. updated_at touch trigger for portals ---------------------
create or replace function public.portals_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
drop trigger if exists portals_touch_updated_at_trg on public.portals;
create trigger portals_touch_updated_at_trg
before update on public.portals
for each row execute function public.portals_touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.portals                     enable row level security;
alter table public.portal_members              enable row level security;
alter table public.portal_invitations          enable row level security;
alter table public.portal_files                enable row level security;
alter table public.portal_messages             enable row level security;
alter table public.portal_activity             enable row level security;
alter table public.portal_storage_usage        enable row level security;
alter table public.portal_notification_outbox  enable row level security;
alter table public.portal_contracts            enable row level security;
alter table public.portal_invoices             enable row level security;

-- Helper: a user has access to a portal iff they are the owner OR an
-- active (non-revoked) member. We inline this check rather than using a
-- SQL function so the planner can use indexes directly.

-- ---- portals -----------------------------------------------------------
drop policy if exists portals_select on public.portals;
create policy portals_select on public.portals for select
  using (
    deleted_at is null
    and (
      owner_user_id = auth.uid()
      or exists (
        select 1 from public.portal_members m
         where m.portal_id = portals.id
           and m.user_id = auth.uid()
           and m.revoked_at is null
      )
    )
  );

drop policy if exists portals_owner_write on public.portals;
create policy portals_owner_write on public.portals for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- ---- portal_members ----------------------------------------------------
drop policy if exists portal_members_select on public.portal_members;
create policy portal_members_select on public.portal_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.portals p
       where p.id = portal_members.portal_id
         and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists portal_members_owner_write on public.portal_members;
create policy portal_members_owner_write on public.portal_members for all
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_members.portal_id
         and p.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portals p
       where p.id = portal_members.portal_id
         and p.owner_user_id = auth.uid()
    )
  );

-- ---- portal_invitations -----------------------------------------------
drop policy if exists portal_invitations_owner on public.portal_invitations;
create policy portal_invitations_owner on public.portal_invitations for all
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_invitations.portal_id
         and p.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portals p
       where p.id = portal_invitations.portal_id
         and p.owner_user_id = auth.uid()
    )
  );

-- ---- portal_files ------------------------------------------------------
drop policy if exists portal_files_select on public.portal_files;
create policy portal_files_select on public.portal_files for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.portals p
       where p.id = portal_files.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  );

drop policy if exists portal_files_member_write on public.portal_files;
create policy portal_files_member_write on public.portal_files for all
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_files.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  )
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.portals p
       where p.id = portal_files.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  );

-- ---- portal_messages ---------------------------------------------------
drop policy if exists portal_messages_select on public.portal_messages;
create policy portal_messages_select on public.portal_messages for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.portals p
       where p.id = portal_messages.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  );

drop policy if exists portal_messages_member_insert on public.portal_messages;
create policy portal_messages_member_insert on public.portal_messages for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.portals p
       where p.id = portal_messages.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  );

drop policy if exists portal_messages_author_update on public.portal_messages;
create policy portal_messages_author_update on public.portal_messages for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- ---- portal_activity (read-only for members; writes go via service-role)
drop policy if exists portal_activity_select on public.portal_activity;
create policy portal_activity_select on public.portal_activity for select
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_activity.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  );

-- ---- portal_storage_usage (read-only for the owner) -------------------
drop policy if exists portal_storage_usage_select on public.portal_storage_usage;
create policy portal_storage_usage_select on public.portal_storage_usage for select
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_storage_usage.portal_id
         and p.owner_user_id = auth.uid()
    )
  );

-- ---- portal_notification_outbox (no client read; service-role only)
-- (no select policy → empty result set for non-service callers)

-- ---- portal_contracts / portal_invoices (owner manages, members read)
drop policy if exists portal_contracts_select on public.portal_contracts;
create policy portal_contracts_select on public.portal_contracts for select
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_contracts.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  );

drop policy if exists portal_contracts_owner_write on public.portal_contracts;
create policy portal_contracts_owner_write on public.portal_contracts for all
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_contracts.portal_id
         and p.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portals p
       where p.id = portal_contracts.portal_id
         and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists portal_invoices_select on public.portal_invoices;
create policy portal_invoices_select on public.portal_invoices for select
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_invoices.portal_id
         and (
           p.owner_user_id = auth.uid()
           or exists (
             select 1 from public.portal_members m
              where m.portal_id = p.id
                and m.user_id = auth.uid()
                and m.revoked_at is null
           )
         )
    )
  );

drop policy if exists portal_invoices_owner_write on public.portal_invoices;
create policy portal_invoices_owner_write on public.portal_invoices for all
  using (
    exists (
      select 1 from public.portals p
       where p.id = portal_invoices.portal_id
         and p.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portals p
       where p.id = portal_invoices.portal_id
         and p.owner_user_id = auth.uid()
    )
  );

-- =============================================================================
-- end of 0024_client_portal.sql
-- =============================================================================
