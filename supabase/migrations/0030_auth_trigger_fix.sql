-- =============================================================================
-- 0030_auth_trigger_fix.sql — Harden the new-user profile creation trigger
-- -----------------------------------------------------------------------------
-- Root cause of "We couldn't create your account" error:
--
--   The handle_new_auth_user trigger uses `ON CONFLICT (id) DO NOTHING` which
--   only handles PK conflicts.  user_profiles.email also has a UNIQUE
--   constraint.  If an orphaned profile row exists for the same email (e.g.
--   after a manual admin delete that didn't cascade, or a previous test
--   account) the INSERT throws a unique_violation that is NOT caught by the
--   ON CONFLICT clause.  PostgreSQL propagates the exception out of the
--   trigger function, GoTrue rolls back the entire auth.users INSERT, and
--   returns "We couldn't create your account. Please try again in a moment."
--
-- Fix A:  Handle profile rows that already exist by id.
-- Fix B:  Handle the email unique violation explicitly — if an orphaned row
--         is found, re-point it at the new auth user id.
-- Fix C:  Provision the free subscription explicitly. Re-pointing an existing
--         profile is an UPDATE, not an INSERT, so the
--         on_user_profile_created trigger will not fire in that repair path.
-- Fix D:  Isolate each repair step so that unexpected profile/subscription
--         errors never block auth user creation.
-- =============================================================================

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );
begin
  begin
    insert into public.user_profiles (id, full_name, email)
    values (new.id, v_full_name, new.email)
    on conflict (id) do update
      set
        full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
        email = excluded.email,
        updated_at = now();

  exception
    when unique_violation then
      -- The email column has a separate UNIQUE constraint.
      -- If a stale profile row exists for the same email, attach it to the new
      -- auth user. Guard against the rare case where this id already has a
      -- profile too; in that case, keep the id-owned profile and avoid blocking
      -- signup.
      begin
        update public.user_profiles
          set
            id = new.id,
            full_name = coalesce(v_full_name, full_name),
            updated_at = now()
        where email = new.email
          and not exists (
            select 1
            from public.user_profiles existing
            where existing.id = new.id
          );

        if not found then
          update public.user_profiles
            set
              full_name = coalesce(v_full_name, full_name),
              updated_at = now()
          where id = new.id;
        end if;

      exception
        when others then
          raise warning 'handle_new_auth_user: could not repair profile for user % (%): %',
            new.id, new.email, sqlerrm;
      end;

    when others then
      raise warning 'handle_new_auth_user: could not create profile for user % (%): %',
        new.id, new.email, sqlerrm;
  end;

  -- Keep feature-gating safe even when the profile path repaired an existing
  -- row instead of inserting a new one.
  begin
    insert into public.subscriptions (user_id, plan, status)
    values (new.id, 'free', 'active')
    on conflict (user_id) do nothing;

  exception
    when undefined_table then
      -- Defensive for partial/local databases. In the normal migration order,
      -- subscriptions exists by the time this migration runs.
      null;
    when others then
      raise warning 'handle_new_auth_user: could not provision subscription for user % (%): %',
        new.id, new.email, sqlerrm;
  end;

  return new;
end $$;

-- Re-create the trigger (idempotent — drop first, then create).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
