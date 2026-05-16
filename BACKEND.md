# Stackivo — Backend foundation

This document is a map of the backend architecture introduced in this
checkpoint. For product + business context, defer to `docs/product/`.

## Source of truth

- **Tables, RLS pattern, storage buckets, routes** — SAD (`docs/product/stackivo_implementation_document_suite.md`) §1.5–§1.11, §2.1–§2.2.
- **Plan tiers, features, limits** — `src/features/subscription/plans.ts` (edit this file to change any plan behaviour).

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js App Router + TypeScript |
| Auth / DB / Storage / Realtime | Supabase |
| Multi-tenancy | Shared Postgres with RLS (`auth.uid() = user_id`) |
| Payments (deferred) | Razorpay |
| Transactional email (deferred) | Brevo |

## Directory map

```
.env.example                      # Env var reference
middleware.ts                     # Auth + route protection
supabase/
  README.md                       # How to push migrations
  migrations/
    0001_init_schema.sql          # Core tables
    0002_subscriptions.sql        # subscriptions + usage_counters + increment_usage()
    0003_rls_policies.sql         # RLS on every business table
    0004_storage_buckets.sql      # Buckets + per-user object policies
src/
  config/env.ts                   # Typed env, fails fast at import time
  lib/supabase/
    client.ts                     # Browser client (memoised)
    server.ts                     # RSC / route-handler / action client
    middleware.ts                 # updateSession() for middleware.ts
    admin.ts                      # Service-role client (server-only)
    types.ts                      # Database<> types (regen via `supabase gen types`)
    index.ts                      # Safe client-side barrel
  features/auth/
    routes.ts                     # Public / protected / auth-only route sets
    schemas.ts                    # Zod for signup/login/reset
    actions.ts                    # Server actions
    server.ts                     # getCurrentUser / requireUser (RSC)
    hooks/use-session.ts          # Client session hook
    components/                   # login / signup / forgot / reset / Google btn
  features/subscription/
    types.ts                      # PlanId, FeatureKey, UsageMetric, ModuleKey
    plans.ts                      # Plan catalogue (SOURCE OF TRUTH for plans)
    features.ts                   # Pure gating helpers
    server.ts                     # requireFeature / requireWithinLimit (RSC)
    usage.ts                      # incrementUsage (server-only)
    hooks/use-subscription.ts     # Client hook
    components/feature-gate.tsx   # <FeatureGate feature="..."/>
    index.ts                      # Safe client-side barrel
app/
  (auth)/
    login/page.tsx
    signup/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  auth/callback/route.ts          # OAuth + email-confirmation exchange
```

## Request lifecycle

1. **Every request** hits `middleware.ts`.
   - `updateSession()` refreshes Supabase cookies and surfaces the current `user`.
   - Unauthenticated access to `/dashboard/*` or `/admin/*` → redirect to `/login?next=<path>`.
   - Authenticated access to `/login`, `/signup`, etc. → redirect to `/dashboard`.
2. **Server Components / route handlers** call `getServerSupabase()`; queries run as the user (RLS enforced).
3. **Server Actions** validate input with Zod, call Supabase, and either `redirect()` or return a typed `ActionResult`.
4. **Client code** uses `getBrowserSupabase()` for live reads + realtime; never for writes that require service-role privilege.
5. **Webhooks / cron** use `getAdminSupabase()` (service role, bypasses RLS). The module is `server-only` to prevent leaks.

## Auth surface

| Flow | Entry point | Action |
|---|---|---|
| Signup (email + pwd) | `/signup` | `signupAction` → email confirmation link → `/auth/callback` |
| Login (email + pwd) | `/login` | `loginAction` → `redirect(next ?? /dashboard)` |
| Login (Google) | `/login` | `googleOAuthAction` → Supabase → `/auth/callback` |
| Forgot password | `/forgot-password` | `forgotPasswordAction` → reset link → `/reset-password` |
| Reset password | `/reset-password` | `resetPasswordAction` |
| Logout | any | `logoutAction` → `/login` |

The Google OAuth button is wired end-to-end. To activate it:
1. Supabase Dashboard → Authentication → Providers → enable Google.
2. Add the project URL `/auth/callback` as an authorised redirect.

## Subscription + feature gating

**Single source of truth:** `src/features/subscription/plans.ts`.
Every plan is a `PlanDefinition` with:

- `features` — binary capability flags (keys typed as `FeatureKey`).
- `limits` — monthly caps keyed by `UsageMetric` (`Infinity` = unlimited).
- `modules` — coarse-grained module access (keys typed as `ModuleKey`).

### Checking entitlements

| Context | Import | Helper |
|---|---|---|
| Server Component / action | `@/features/subscription/server` | `canUseFeature(key)` / `requireFeature(key)` / `requireWithinLimit(metric, delta)` |
| Client Component | `@/features/subscription` | `useSubscription()` → `canUse(key)` / `canAccess(module)` |
| Pure logic | `@/features/subscription` | `hasFeature(sub, key)` / `withinLimit(sub, metric, used, delta)` |
| UI wrap | `@/features/subscription` | `<FeatureGate feature="..." fallback={<UpgradeCard/>}>` |

### Usage tracking

Writes: `incrementUsage("invoices_created")` from `@/features/subscription/usage`
(server-only). Backed by `public.increment_usage()` SQL fn which upserts
a month-bucketed row in `usage_counters`.

Reads: `getUsageSnapshot("invoices_created")` returns a display-ready
`UsageSnapshot { used, limit, remaining, utilisation, exceeded }`.

Lapsed subscriptions (`canceled` / `expired`) collapse to `free`
entitlements via `effectivePlan()` — users keep read-only access without
a hard lockout.

## Extending this foundation

- **Add a plan**: append to `PLAN_ORDER` + add a `PlanDefinition` to `PLANS` + add `'new_plan'` to the `plan` CHECK constraint in a new migration.
- **Add a feature flag**: add to the `FeatureKey` union, set it on each plan that should get it. TypeScript will surface every existing call site.
- **Add a usage metric**: add to `UsageMetric`, add caps to every plan's `limits`. The `increment_usage()` SQL fn needs no changes — it's metric-agnostic.
- **Add a protected module**: add a `ModuleKey`, add to the `modules` array on each plan that grants it, and (if needed) reference it in nav guards.

## What is intentionally NOT implemented yet

- Invoice business logic (create / send / pay).
- Razorpay checkout + webhook handlers.
- Brevo transactional emails.
- Any mutation paths for `subscriptions` from the client (mutations flow through the service-role webhook handler only — to be built).
