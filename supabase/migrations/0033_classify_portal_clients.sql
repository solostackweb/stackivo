-- =============================================================================
-- 0033_classify_portal_clients.sql
--
-- Portal clients authenticate through Supabase Auth so RLS, sessions,
-- revocation, uploads, comments, approvals, and audit trails stay simple.
-- They are not freelancer workspace users, though, so classify them explicitly.
--
-- Adds:
--   * user_profiles.account_type: freelancer | portal_client
--   * auth trigger support for raw_user_meta_data.auth_context='client_portal'
--   * admin_user_overview.account_type for founder-console separation
--   * conservative backfill for existing client-only portal members
-- =============================================================================

alter table public.user_profiles
  add column if not exists account_type text not null default 'freelancer';

do $$ begin
  alter table public.user_profiles
    add constraint user_profiles_account_type_check
    check (account_type in ('freelancer', 'portal_client'));
exception when duplicate_object then null; end $$;

create index if not exists user_profiles_account_type_idx
  on public.user_profiles (account_type);

-- Existing portal users created before this classification existed.
-- Only classify accounts that have client membership and no owner-side data.
update public.user_profiles up
set account_type = 'portal_client',
    updated_at = now()
where account_type = 'freelancer'
  and exists (
    select 1
    from public.portal_members pm
    where pm.user_id = up.id
      and pm.role = 'client'
      and pm.revoked_at is null
  )
  and not exists (select 1 from public.portals p where p.owner_user_id = up.id)
  and not exists (select 1 from public.clients c where c.user_id = up.id)
  and not exists (select 1 from public.projects pr where pr.user_id = up.id)
  and not exists (select 1 from public.invoices i where i.user_id = up.id)
  and not exists (select 1 from public.contracts co where co.user_id = up.id);

update auth.users au
set raw_app_meta_data =
  coalesce(au.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('account_type', 'portal_client')
from public.user_profiles up
where up.id = au.id
  and up.account_type = 'portal_client';

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );
  v_account_type text := case
    when new.raw_user_meta_data->>'auth_context' = 'client_portal'
      then 'portal_client'
    else 'freelancer'
  end;
begin
  begin
    insert into public.user_profiles (id, full_name, email, account_type)
    values (new.id, v_full_name, new.email, v_account_type)
    on conflict (id) do update
      set
        full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
        email = excluded.email,
        account_type = case
          when public.user_profiles.account_type = 'portal_client'
            or excluded.account_type = 'portal_client'
            then 'portal_client'
          else public.user_profiles.account_type
        end,
        updated_at = now();

  exception
    when unique_violation then
      begin
        update public.user_profiles
          set
            id = new.id,
            full_name = coalesce(v_full_name, full_name),
            account_type = case
              when account_type = 'portal_client'
                or v_account_type = 'portal_client'
                then 'portal_client'
              else account_type
            end,
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
              account_type = case
                when account_type = 'portal_client'
                  or v_account_type = 'portal_client'
                  then 'portal_client'
                else account_type
              end,
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

  begin
    insert into public.subscriptions (user_id, plan, status)
    values (new.id, 'free', 'active')
    on conflict (user_id) do nothing;

  exception
    when undefined_table then
      null;
    when others then
      raise warning 'handle_new_auth_user: could not provision subscription for user % (%): %',
        new.id, new.email, sqlerrm;
  end;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace view public.admin_user_overview as
select
  up.id,
  up.full_name,
  up.email,
  up.avatar_url,
  up.company_name,
  up.country,
  au.created_at         as signed_up_at,
  au.last_sign_in_at,
  au.email_confirmed_at,
  au.banned_until,
  sub.plan,
  sub.status            as subscription_status,
  sub.current_period_end,
  (select count(*) from public.invoices i
     where i.user_id = up.id)                  as invoice_count,
  (select count(*) from public.clients c
     where c.user_id = up.id)                  as client_count,
  (select coalesce(sum(amount), 0) from public.billing_payments bp
     where bp.user_id = up.id and bp.status = 'captured')
                                                 as total_revenue_paise,
  (select count(*) from public.email_suppressions es
     where lower(es.email) = lower(up.email))   as suppression_count,
  up.account_type
from public.user_profiles up
left join auth.users au on au.id = up.id
left join lateral (
  select plan, status, current_period_end
  from public.subscriptions s
  where s.user_id = up.id
  order by s.created_at desc
  limit 1
) sub on true;

comment on view public.admin_user_overview is
  'Denormalized founder-console view of every auth user, including portal-client classification. Service-role reads only.';
