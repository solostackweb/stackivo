-- =============================================================================
-- Migration 0026 — Project status workflow upgrade
--
-- Adds four lifecycle states the original schema didn't model:
--   waiting_on_client  — work is paused pending client input
--   revision           — work was reviewed and changes are needed
--   review             — work is delivered and under client review
--   cancelled          — engagement terminated before completion
--
-- Also introduces `project_status_history`, an append-only audit log that
-- powers the timeline on the project detail page. Every server-side status
-- mutation writes one row here.
--
-- Backwards compatible: existing rows with status `lead`, `on_hold` etc.
-- continue to work. The original CHECK constraint is dropped and re-added
-- with the expanded vocabulary.
-- =============================================================================

-- --- expand the CHECK constraint -------------------------------------------
alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check check (
    status in (
      'lead',
      'planning',
      'active',
      'waiting_on_client',
      'revision',
      'review',
      'on_hold',
      'completed',
      'cancelled',
      'archived'
    )
  );

-- --- project_status_history -------------------------------------------------
-- Append-only. `from_status` is NULL only for the synthetic "created" row
-- written by the trigger below so the timeline has a clean origin point.
create table if not exists public.project_status_history (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  note         text,
  changed_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists project_status_history_project_id_idx
  on public.project_status_history (project_id, created_at desc);
create index if not exists project_status_history_user_id_idx
  on public.project_status_history (user_id);

-- --- RLS --------------------------------------------------------------------
alter table public.project_status_history enable row level security;

drop policy if exists project_status_history_owner_all
  on public.project_status_history;
create policy project_status_history_owner_all
  on public.project_status_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- seed history with the current status for every existing project ------
-- Idempotent: only inserts when the project has no history rows yet.
insert into public.project_status_history (project_id, user_id, from_status, to_status, note, changed_by, created_at)
select p.id, p.user_id, null, p.status, 'Initial status', p.user_id, p.created_at
from public.projects p
where not exists (
  select 1
  from public.project_status_history h
  where h.project_id = p.id
);
