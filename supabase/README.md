# Supabase — migrations & local dev

This directory is the source of truth for Stackivo's database schema, RLS
policies, and storage buckets. Everything here is applied against a Supabase
project via the Supabase CLI.

## Files

| File | Purpose |
|---|---|
| `migrations/0001_init_schema.sql` | Core tables from SAD §2.1 — profiles, clients, projects, invoices, contracts, files, notifications. |
| `migrations/0002_subscriptions.sql` | Subscription + usage-counter tables, auto-provision trigger, `increment_usage()` SQL fn. |
| `migrations/0003_rls_policies.sql` | Row-Level Security policies (SAD §2.2) — `auth.uid() = user_id` on every business table. |
| `migrations/0004_storage_buckets.sql` | Storage buckets + per-user object policies (SAD §1.7). |

## Applying migrations

### Against a Supabase Cloud project

```bash
# One-time setup
npx supabase login
npx supabase link --project-ref <your-project-ref>

# Push every migration in ./migrations (idempotent CREATE IF NOT EXISTS
# statements, so safe to re-run)
npx supabase db push
```

### Against a local Supabase (optional)

```bash
npx supabase start
npx supabase db reset   # applies all migrations fresh
```

## Regenerating TypeScript types

Whenever the schema changes:

```bash
npx supabase gen types typescript --project-id <your-project-ref> \
  > src/lib/supabase/types.ts
```

Until the first codegen run, `src/lib/supabase/types.ts` is maintained by
hand and mirrors these migrations.

## Conventions

- Every business table has a `user_id uuid` column for RLS (SAD §2.2).
- String enum-ish columns use `CHECK (status in (...))` instead of PG enums —
  adding a new value is a single migration with no type juggling.
- `updated_at` is maintained by a trigger (`set_updated_at`) wired per table.
- Service-role code bypasses RLS (used for webhooks + cron only).
- Storage paths follow `<user_id>/<subpath>` so a single policy per bucket
  suffices.
