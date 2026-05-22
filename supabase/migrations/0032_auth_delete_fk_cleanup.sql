-- =============================================================================
-- 0032_auth_delete_fk_cleanup.sql
--
-- Supabase Dashboard deletes from auth.users. Any public FK with NO ACTION /
-- RESTRICT can make that fail with "Database error deleting user".
--
-- Keep audit/history rows, but stop them from blocking auth-user deletion:
--   * admin_actions.actor_id     -> nullable + ON DELETE SET NULL
--   * admin_notes.actor_id       -> nullable + ON DELETE SET NULL
--   * portal_invitations.accepted_by -> ON DELETE SET NULL
--
-- We intentionally do NOT cascade-delete admin audit rows; retaining them with
-- a null actor preserves the forensic trail without pinning deleted auth users.
-- =============================================================================

alter table public.admin_actions
  drop constraint if exists admin_actions_actor_id_fkey;

alter table public.admin_actions
  alter column actor_id drop not null;

alter table public.admin_actions
  add constraint admin_actions_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

drop index if exists admin_actions_actor_idx;
create index if not exists admin_actions_actor_idx
  on public.admin_actions (actor_id, created_at desc)
  where actor_id is not null;

alter table public.admin_notes
  drop constraint if exists admin_notes_actor_id_fkey;

alter table public.admin_notes
  alter column actor_id drop not null;

alter table public.admin_notes
  add constraint admin_notes_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

alter table public.portal_invitations
  drop constraint if exists portal_invitations_accepted_by_fkey;

alter table public.portal_invitations
  add constraint portal_invitations_accepted_by_fkey
  foreign key (accepted_by) references auth.users(id) on delete set null;
