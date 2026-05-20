-- =============================================================================
-- 0029_auth_trigger_fix.sql — Harden the new-user profile creation trigger
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
-- Fix A:  Handle the email unique violation explicitly — if an orphaned row
--         is found, re-point it at the new auth user id.
-- Fix B:  Wrap the whole trigger body in an EXCEPTION handler so that even
--         unexpected errors never block auth user creation (profile creation
--         is recoverable; blocked signup is not).
-- =============================================================================

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;  -- profile row already exists for this auth id

  return new;

exception
  when unique_violation then
    -- The email column has a separate UNIQUE constraint.
    -- An orphaned user_profiles row (different id, same email) is the culprit.
    -- Re-link it to the new auth user so onboarding proceeds normally.
    update public.user_profiles
      set
        id        = new.id,
        full_name = coalesce(
          new.raw_user_meta_data->>'full_name',
          full_name,
          split_part(new.email, '@', 1)
        )
    where email = new.email;

    return new;

  when others then
    -- Safety net: log the failure but NEVER block auth user creation.
    -- A missing profile row is recoverable; a blocked signup is not.
    raise warning 'handle_new_auth_user: could not create profile for user % (%): %',
      new.id, new.email, sqlerrm;
    return new;
end $$;

-- Re-create the trigger (idempotent — drop first, then create).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
