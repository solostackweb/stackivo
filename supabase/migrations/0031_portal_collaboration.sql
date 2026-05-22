-- =============================================================================
-- 0031_portal_collaboration.sql
--
-- Evolves the client portal into a production-grade collaboration hub.
--
-- New tables:
--   portal_updates           — structured async updates (NOT chat)
--   portal_update_reactions  — acknowledge / comment / approve on updates
--   portal_meetings          — meeting requests with Google Meet link support
--
-- Altered tables:
--   portal_files             — adds `category` and `approval_status` columns
--
-- All access gated by RLS:
--   Owner (freelancer) — full read/write on all rows in their portals.
--   Member (client)   — read all rows; write own rows; update approval on
--                       deliverable-type updates.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. portal_updates — structured async communication
-- ---------------------------------------------------------------------------
-- update_type drives which badge and UX is shown:
--   progress      general progress report
--   deliverable   a deliverable has been shared (can be approved / revision_requested)
--   revision      revision was made following client feedback
--   payment       payment-related update
--   milestone     milestone reached
--   meeting       meeting summary / notes
--   general       catch-all

create table if not exists public.portal_updates (
  id              uuid primary key default gen_random_uuid(),
  portal_id       uuid not null references public.portals(id) on delete cascade,
  author_id       uuid not null references auth.users(id) on delete cascade,
  update_type     text not null default 'general'
                    check (update_type in (
                      'progress','deliverable','revision',
                      'payment','milestone','meeting','general'
                    )),
  title           text not null check (char_length(title) between 1 and 200),
  body            text check (char_length(body) <= 8000),
  -- approval_status is meaningful only for update_type = 'deliverable'.
  -- kept on the parent row for easy querying without joining reactions.
  approval_status text not null default 'none'
                    check (approval_status in (
                      'none','submitted','under_review','approved','revision_requested'
                    )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists portal_updates_portal_idx
  on public.portal_updates (portal_id, created_at desc)
  where deleted_at is null;

create index if not exists portal_updates_author_idx
  on public.portal_updates (author_id);

-- ---------------------------------------------------------------------------
-- 2. portal_update_reactions — lightweight interactions on updates
-- ---------------------------------------------------------------------------
-- kind values:
--   acknowledged       client saw the update
--   comment            free-text reply
--   approved           client approved a deliverable
--   revision_requested client asked for changes

create table if not exists public.portal_update_reactions (
  id          uuid primary key default gen_random_uuid(),
  update_id   uuid not null references public.portal_updates(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null
                check (kind in ('acknowledged','comment','approved','revision_requested')),
  body        text check (char_length(body) <= 4000),
  created_at  timestamptz not null default now()
);

create index if not exists portal_update_reactions_update_idx
  on public.portal_update_reactions (update_id, created_at asc);

-- one acknowledge / approve / revision per user per update (comments are
-- unlimited — we only de-dupe the status-changing reactions)
create unique index if not exists portal_update_reactions_dedup_idx
  on public.portal_update_reactions (update_id, user_id, kind)
  where kind in ('acknowledged','approved','revision_requested');

-- ---------------------------------------------------------------------------
-- 3. portal_meetings — meeting requests with Google Meet support
-- ---------------------------------------------------------------------------
-- The flow:
--   1. Either party creates a row (status='pending').
--   2. Freelancer accepts → sets meet_link + status='accepted'.
--   3. Both see a "Join" button once meet_link is set.
--   4. After the call, freelancer marks status='completed'.

create table if not exists public.portal_meetings (
  id              uuid primary key default gen_random_uuid(),
  portal_id       uuid not null references public.portals(id) on delete cascade,
  requested_by    uuid not null references auth.users(id) on delete cascade,
  topic           text not null check (char_length(topic) between 1 and 200),
  proposed_time   text check (char_length(proposed_time) <= 200),
  meet_link       text check (char_length(meet_link) <= 500),
  notes           text check (char_length(notes) <= 4000),
  status          text not null default 'pending'
                    check (status in (
                      'pending','accepted','declined','completed','cancelled'
                    )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists portal_meetings_portal_idx
  on public.portal_meetings (portal_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Alter portal_files — add category + approval_status
-- ---------------------------------------------------------------------------
alter table public.portal_files
  add column if not exists category text not null default 'misc'
    check (category in (
      'contract','deliverable','asset','invoice','meeting_note','misc'
    ));

alter table public.portal_files
  add column if not exists approval_status text not null default 'none'
    check (approval_status in (
      'none','submitted','under_review','approved','revision_requested'
    ));

-- ---------------------------------------------------------------------------
-- 5. RLS — portal_updates
-- ---------------------------------------------------------------------------
alter table public.portal_updates enable row level security;

-- Owner of the portal can do everything.
drop policy if exists portal_updates_owner_all on public.portal_updates;
create policy portal_updates_owner_all
  on public.portal_updates
  for all
  using (
    exists (
      select 1 from public.portals p
      where p.id = portal_updates.portal_id
        and p.owner_user_id = auth.uid()
        and p.deleted_at is null
    )
  )
  with check (
    exists (
      select 1 from public.portals p
      where p.id = portal_updates.portal_id
        and p.owner_user_id = auth.uid()
        and p.deleted_at is null
    )
  );

-- Active portal member can read all non-deleted updates.
drop policy if exists portal_updates_member_read on public.portal_updates;
create policy portal_updates_member_read
  on public.portal_updates
  for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.portal_members pm
      where pm.portal_id = portal_updates.portal_id
        and pm.user_id = auth.uid()
        and pm.revoked_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- 6. RLS — portal_update_reactions
-- ---------------------------------------------------------------------------
alter table public.portal_update_reactions enable row level security;

-- Owner of the portal can read all reactions, write their own.
drop policy if exists portal_update_reactions_owner_read on public.portal_update_reactions;
create policy portal_update_reactions_owner_read
  on public.portal_update_reactions
  for select
  using (
    exists (
      select 1 from public.portal_updates pu
      join public.portals p on p.id = pu.portal_id
      where pu.id = portal_update_reactions.update_id
        and p.owner_user_id = auth.uid()
        and p.deleted_at is null
    )
  );

drop policy if exists portal_update_reactions_owner_insert on public.portal_update_reactions;
create policy portal_update_reactions_owner_insert
  on public.portal_update_reactions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.portal_updates pu
      join public.portals p on p.id = pu.portal_id
      where pu.id = portal_update_reactions.update_id
        and p.owner_user_id = auth.uid()
        and p.deleted_at is null
    )
  );

-- Active member can read and insert reactions on their portals.
drop policy if exists portal_update_reactions_member_read on public.portal_update_reactions;
create policy portal_update_reactions_member_read
  on public.portal_update_reactions
  for select
  using (
    exists (
      select 1 from public.portal_updates pu
      join public.portal_members pm on pm.portal_id = pu.portal_id
      where pu.id = portal_update_reactions.update_id
        and pm.user_id = auth.uid()
        and pm.revoked_at is null
        and pu.deleted_at is null
    )
  );

drop policy if exists portal_update_reactions_member_insert on public.portal_update_reactions;
create policy portal_update_reactions_member_insert
  on public.portal_update_reactions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.portal_updates pu
      join public.portal_members pm on pm.portal_id = pu.portal_id
      where pu.id = portal_update_reactions.update_id
        and pm.user_id = auth.uid()
        and pm.revoked_at is null
        and pu.deleted_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- 7. RLS — portal_meetings
-- ---------------------------------------------------------------------------
alter table public.portal_meetings enable row level security;

-- Owner can do everything.
drop policy if exists portal_meetings_owner_all on public.portal_meetings;
create policy portal_meetings_owner_all
  on public.portal_meetings
  for all
  using (
    exists (
      select 1 from public.portals p
      where p.id = portal_meetings.portal_id
        and p.owner_user_id = auth.uid()
        and p.deleted_at is null
    )
  )
  with check (
    exists (
      select 1 from public.portals p
      where p.id = portal_meetings.portal_id
        and p.owner_user_id = auth.uid()
        and p.deleted_at is null
    )
  );

-- Active member can read all meetings, insert new requests, update their own.
drop policy if exists portal_meetings_member_read on public.portal_meetings;
create policy portal_meetings_member_read
  on public.portal_meetings
  for select
  using (
    exists (
      select 1 from public.portal_members pm
      where pm.portal_id = portal_meetings.portal_id
        and pm.user_id = auth.uid()
        and pm.revoked_at is null
    )
  );

drop policy if exists portal_meetings_member_insert on public.portal_meetings;
create policy portal_meetings_member_insert
  on public.portal_meetings
  for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.portal_members pm
      where pm.portal_id = portal_meetings.portal_id
        and pm.user_id = auth.uid()
        and pm.revoked_at is null
    )
  );
