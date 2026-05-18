-- Break RLS recursion between portals and portal_members.

create or replace function public.portal_is_owner(p_portal_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
      from public.portals p
     where p.id = p_portal_id
       and p.owner_user_id = p_user_id
       and p.deleted_at is null
  );
$$;

revoke all on function public.portal_is_owner(uuid, uuid) from public, anon, authenticated;
grant execute on function public.portal_is_owner(uuid, uuid) to authenticated, service_role;

-- Recreate portal_members policies to use the helper (avoids recursion).
drop policy if exists portal_members_select on public.portal_members;
create policy portal_members_select on public.portal_members for select
  using (
    user_id = auth.uid()
    or public.portal_is_owner(portal_members.portal_id, auth.uid())
  );

drop policy if exists portal_members_owner_write on public.portal_members;
create policy portal_members_owner_write on public.portal_members for all
  using (public.portal_is_owner(portal_members.portal_id, auth.uid()))
  with check (public.portal_is_owner(portal_members.portal_id, auth.uid()));
