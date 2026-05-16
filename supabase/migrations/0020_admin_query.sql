-- =============================================================================
-- 0020_admin_query.sql
--
-- Backing RPC for the /admin/query SQL editor.
--
-- The function:
--   1. Is SECURITY DEFINER (owned by postgres) so it can issue
--      `SET LOCAL ROLE admin_readonly`.
--   2. Caps statement_timeout at 30s for the duration of the call.
--   3. Runs the caller's SQL via EXECUTE INTO a JSONB aggregate.
--   4. Returns `{ columns: [...], rows: [...] }` shaped JSONB.
--
-- The READ-ONLY-ness is guaranteed by the role grant (admin_readonly
-- only has SELECT on public). Statement timeout prevents runaway
-- queries from holding a backend.
--
-- The function is only callable by the service role — RLS-less because
-- it's defined in the public schema and we revoke from authenticated
-- + anon below. The application layer (Node) calls it via the service
-- role client after `requireAdmin()` succeeds.
-- =============================================================================

create or replace function public.admin_run_readonly_query(p_sql text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_started  timestamptz := clock_timestamp();
  v_rows     jsonb;
  v_columns  jsonb;
  v_count    integer;
  v_elapsed  numeric;
begin
  -- Defensive: refuse anything that obviously isn't a SELECT / WITH.
  -- The role grant is the real defence (admin_readonly has no
  -- write privileges) but this gives a clear error message before
  -- the database produces a generic permission error.
  if not (
    lower(btrim(p_sql)) like 'select%' or
    lower(btrim(p_sql)) like 'with%' or
    lower(btrim(p_sql)) like 'explain%'
  ) then
    raise exception 'Only SELECT / WITH / EXPLAIN statements are permitted.';
  end if;

  -- Apply a 30s statement timeout and switch into the read-only role
  -- for the duration of this transaction. Both reset on commit.
  perform set_config('statement_timeout', '30000', true);
  execute 'set local role admin_readonly';

  -- Wrap the user's query so we can collect columns + rows as JSONB
  -- in one round trip. `to_jsonb(t)` per row keeps the type info.
  execute format(
    'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (%s) t',
    p_sql
  )
  into v_rows;

  -- Column ordering — pull from the first row keys if any.
  if jsonb_array_length(v_rows) > 0 then
    select coalesce(jsonb_agg(k), '[]'::jsonb)
      from (
        select k from jsonb_object_keys(v_rows->0) k
      ) sub
      into v_columns;
  else
    v_columns := '[]'::jsonb;
  end if;

  v_count   := jsonb_array_length(v_rows);
  v_elapsed := extract(epoch from (clock_timestamp() - v_started)) * 1000;

  return jsonb_build_object(
    'columns',     v_columns,
    'rows',        v_rows,
    'row_count',   v_count,
    'elapsed_ms',  round(v_elapsed)
  );
exception when others then
  -- Surface the failure as a structured payload — the UI prefers a
  -- shaped error envelope over a raw exception text.
  return jsonb_build_object(
    'columns',    '[]'::jsonb,
    'rows',       '[]'::jsonb,
    'row_count',  0,
    'error',      sqlerrm,
    'sqlstate',   sqlstate,
    'elapsed_ms', round(extract(epoch from (clock_timestamp() - v_started)) * 1000)
  );
end;
$$;

revoke all on function public.admin_run_readonly_query(text)
  from public, authenticated, anon;
grant execute on function public.admin_run_readonly_query(text)
  to service_role;

comment on function public.admin_run_readonly_query(text) is
  'Founder Console SQL editor. SELECT/WITH/EXPLAIN only. Runs as admin_readonly with a 30s timeout.';
