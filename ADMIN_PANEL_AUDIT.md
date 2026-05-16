# Founder Console — Architecture Audit & Implementation Plan

**Document type:** Strategic design for review. No code shipped.
**Scope:** Internal operations cockpit for Stackivo.
**Budget:** 14–20 working days, 4 phases.

---

## 0. Reframing: "Founder Console," not "Admin Panel"

The brief asks for an admin panel. That framing produces a CRM-shaped product designed for ops reps. You don't have ops reps. You have *one person who built the system*. That changes every tradeoff:

| "Admin panel" thinking | "Founder console" thinking |
| --- | --- |
| Breadth: cover every table with a screen | Depth: cover the 20 things that matter, fast |
| Permission matrices, role hierarchies | One flat admin bit; add RBAC only when second admin exists |
| CRUD-first | Action-first; the verb matters more than the noun |
| Every entity gets a UI | Most entities have no screen; Cmd+K + SQL escape hatch suffice |
| Designed first | Observed first (logs/Sentry), UI added only where SQL is too slow |

**This document designs the cockpit.** URL path is `/admin` (conventional), but the internal language is "the console."

---

## 1. Executive summary

### Current state
- Every user owns their own data. No org/team/role concept.
- No admin surface — you currently operate via Supabase Studio + raw SQL.
- Strong signal layer already in place: `activity_events`, `billing_events`, `delivery_logs`, `email_suppressions`, `security_events`, structured logger, Sentry, PostHog, `/api/health`, cron monitor.
- Service-role admin client exists at `@/src/lib/supabase/admin.ts` — the correct primitive for admin reads/writes.

### Recommended target state
1. Single route group `@/src/app/(admin)/admin/...` inside the existing Next.js app.
2. Authorization: `auth.users.app_metadata.role = 'admin'`. One bit, service-role-managed, JWT-checked.
3. Three surface layers:
   - **"Now" page** — single-screen morning standup (95% of sessions end here).
   - **Resource pages** — Users, Subscriptions, Emails, Security, Files, Invoices, Contracts.
   - **Cmd+K** — primary action surface; tables are secondary.
4. **View-as mode** instead of impersonation. Reads work; writes never inherit identity.
5. Every admin write flows through `runAdminAction()` → auto-audited to `admin_actions`.
6. SQL escape hatch (read-only role) for the long tail.
7. Mobile-first (you will be paged at 2am from your phone).

### Explicitly deferred
- Multi-tenant org/workspace model (no second user yet).
- RBAC framework (no second admin yet).
- Custom support ticketing (use email + thin inbox view).
- Custom feature flags (PostHog provides this free).
- Custom analytics warehouse (Vercel Analytics + PostHog cover 95% at this stage).
- Founder-paging beyond Slack (Slack is enough until paid headcount).

---

## 2. Load-bearing architecture decisions

### 2.1 — Same app, separate route group
Use `@/src/app/(admin)/admin/...`. Reject a separate `admin.stackivo.me` app (doubles deploy surface, fragments types, duplicates Supabase wiring). Reject mixing into `(dashboard)` (RLS-bound and service-role-bound surfaces must not share layout — one missed guard leaks customer data).

### 2.2 — `app_metadata.role = 'admin'` is the only auth signal
`user_metadata` is user-mutable from the client SDK → unsafe. `app_metadata` is service-role-only → tamper-proof and JWT-embedded, so zero DB hops to verify. A single string field is correct until there's a second admin needing different scopes.

```ts
// @/src/features/admin/server.ts (to build)
export async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = (user.app_metadata as { role?: string })?.role;
  if (role !== "admin") {
    await recordSecurityEvent({ kind: "rls_guard_miss", severity: "alert",
      metadata: { surface: "admin", attempted_user: user.id } });
    notFound(); // 404, not 403 — don't confirm the surface exists
  }
  return user;
}
```

Set the bit manually for the founder account via SQL:
```sql
update auth.users
set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data,'{}'::jsonb), '{role}', '"admin"')
where email = 'founder@stackivo.me';
```

### 2.3 — View-as mode, not impersonation
True impersonation (issuing a session for another user) is high-risk and unnecessary. Instead:

- Admin clicks "View as Jane" → server starts a **read-only view session** by setting a signed cookie `admin_view_as=<user_id>` + cookie `admin_actor=<admin_id>`.
- Server components in admin routes resolve queries through `getViewAsClient()` which uses the service-role client but constrains every query by `user_id = view_as_id`.
- A persistent banner shows "Viewing as Jane Doe — you cannot write."
- All Supabase **write** paths in admin code call `assertNotViewAs()` and refuse.
- Exit: clears both cookies.

Writes on behalf of users always require an explicit, named action (e.g., "Refund subscription", "Resend invoice email") that is logged separately. No accidental "I clicked through and updated her invoice" path.

### 2.4 — Every admin write is automatically audited
Single primitive wraps every mutation:

```ts
export async function runAdminAction<T>(
  kind: AdminActionKind,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const admin = await requireAdmin();
  const start = Date.now();
  try {
    const result = await fn();
    await recordAdminAction({
      actor_id: admin.id, kind, target_type: targetType, target_id: targetId,
      success: true, duration_ms: Date.now() - start, metadata,
    });
    return result;
  } catch (err) {
    await recordAdminAction({
      actor_id: admin.id, kind, target_type: targetType, target_id: targetId,
      success: false, duration_ms: Date.now() - start,
      metadata: { ...metadata, error: String(err) },
    });
    throw err;
  }
}
```

There is **no path** for an admin write that doesn't pass through this wrapper. Lint rule enforces it.

### 2.5 — Cmd+K is the primary interface, tables are secondary
The founder knows what they want before they open the page. Optimize for typing, not clicking. Every action surface is reachable in ≤ 3 keystrokes via the command palette. Tables exist for browsing, but the muscle-memory operating mode is `Cmd+K → "refund alex" → Enter`.

### 2.6 — SQL escape hatch for the long tail
A "Query" page hosts a SQL editor that runs against a **read-only Supabase role** with timeouts capped at 30s. Every query is logged to `admin_actions` with the query text. This is intentional: 80% of one-off ops questions don't need a UI; an SQL textbox does.

### 2.7 — Mobile-first layouts
You will get paged at 2am. Most admin tasks need to be doable from a phone with one thumb. Every list view has a card layout; every detail view stacks vertically. Critical actions (refund, suppress, suspend) work from mobile.

### 2.8 — One denormalized read view per resource
Stops N+1s in admin tables. Example: `admin_user_overview` joins `user_profiles` + active subscription + invoice count + last_login_at + total_revenue_paise + suppression count, served as a single Postgres view. Tables read the view, not 6 separate queries.

---

## 3. Module-by-module design

### 3.1 — `/admin` ("Now" page)
**Purpose:** Single-screen morning standup. Open this, scan it, close it.

**Above the fold (desktop) / first 3 cards (mobile):**
- **Revenue today** — MRR, ΔMRR week-over-week, new paid users, churn (count).
- **Health pulse** — `/api/health` status, cron last-run status, last Sentry issue count (24h), open security alerts (24h).
- **What broke** — top 5 most recent `severity='alert'` security_events + Sentry issues new in last 24h, with click-through.

**Below the fold:**
- **Pipeline** — signups (24h), trial-ending-soon, past_due subscriptions.
- **Communications** — email failure rate (24h), suppressions added today, support inbox count.
- **Recent admin activity** — last 10 entries from `admin_actions` so a second admin (future) is visible.

**Data:** All from existing tables + observability stack. New code: one server component that fans out 8 queries in parallel.

### 3.2 — `/admin/users`
**List view:** virtualized table (or card list on mobile) of `admin_user_overview`. Columns: name, plan, MRR, signups, last seen, suppressions, "actions" menu.

**Filters:** plan, signup date range, last_seen range, has_active_subscription, has_suppression, country.

**Detail page `/admin/users/[id]`:**
- Profile snapshot (read-only).
- Subscription state — current plan, billing events timeline, next renewal, manual override.
- Activity timeline — `activity_events` for this user.
- Security events — filtered `security_events` rows.
- Delivery log — emails sent to / on behalf of this user.
- Internal notes — `admin_notes` (CRUD).
- Actions sidebar: View as, Reset password (Supabase admin API), Force email verify, Suspend (set `auth.users.banned_until`), Soft-delete data, Refund subscription, Comp pro for N days.

### 3.3 — `/admin/subscriptions`
Tables for Active, Trialing, Past Due, Cancelled. Detail view shows full `billing_events` history per subscription. Manual actions: comp plan, force-cycle, refund (records to billing_events, doesn't call Razorpay — manual reconciliation), cancel.

### 3.4 — `/admin/emails`
Wraps `delivery_logs` + `email_suppressions`. Filters: status, kind, time. Action: remove suppression with a 1-click "are you sure" confirm. Per-row inspection shows raw provider message id + Brevo dashboard deep link.

### 3.5 — `/admin/invoices` / `/admin/contracts` / `/admin/files`
Read-mostly views into entity tables. Detail view shows full lifecycle (issued → sent → viewed → paid for invoices; share-link views per file). No editing — admin can only inspect. Manual action: "resend share link" (regenerate token).

### 3.6 — `/admin/security`
Wraps `security_events`. Default filter: severity='alert' last 7 days. Click row → JSON dump of metadata + correlated rows by `request_id`. Cmd+K action: "find by request id" jumps directly.

### 3.7 — `/admin/audit`
Wraps `admin_actions` (the table the console writes to itself). Append-only. Filterable by actor, target, kind, success. This is the first thing you check during an incident: "what did I do in the last 24h that might have caused this."

### 3.8 — `/admin/support`
Thin inbox view. Sources:
- Failed delivery_logs above a threshold per user (likely complaint).
- `feedback` table writes if you add a feedback widget (deferred to phase 3).
- Manual entries when users email `support@stackivo.me` — initially you read those in Zoho directly; eventually plumb Brevo's inbound parse webhook.

Detail view: lets you compose a reply that goes out through Brevo's `triggerEmail` helper. Reply also persisted to support thread.

### 3.9 — `/admin/notifications`
Wraps `notifications` table for inspection. Action: "send platform-wide announcement" pre-fills a draft that gets queued to every user. Rate-limited and confirmation-gated. This is the dangerous one — protect with a typed-confirmation modal ("type SEND to confirm").

### 3.10 — `/admin/analytics`
Iframes PostHog dashboards (cheap, free, no maintenance). The "build an analytics warehouse" instinct is wrong at this stage; PostHog and Vercel Analytics handle ~95% of what a founder needs. Only build native views if PostHog can't answer it.

### 3.11 — `/admin/flags`
Iframes PostHog Feature Flags page. Same reasoning. The code already initializes PostHog; flag evaluation is a one-liner addition when you need it.

### 3.12 — `/admin/settings`
Platform-level toggles: `EMAIL_LIVE_MODE` override (kill switch), maintenance mode banner (env var or DB row), CSP report-only flip, public signups enabled, etc. Stored in a single `platform_settings` table (KV shape: key + value JSONB + updated_by + updated_at).

### 3.13 — `/admin/query`
SQL editor → read-only role with 30s statement timeout. Every query logged. Pre-saved queries for common ops questions ("invoices issued today", "users without email verified after 7 days"). Use `@uiw/react-codemirror` or `monaco-editor` for the input.

### 3.14 — Cmd+K command palette
Triggered globally with Cmd+K (or `/` on mobile keyboards). Powered by `cmdk` (already installed). Routes:
- Navigation: "users", "subs", "emails" → goto page.
- Actions: "refund <user>", "suspend <email>", "view as <name>", "remove suppression <email>".
- Lookups: "find request <id>", "find invoice <number>", "find user <email>".
- Recipes: "open last 24h security alerts", "open today's signups".

Implementation: a single registry of commands, each with `{ id, label, hint, run, requires }`. Fuzzy search via `cmdk`.

### 3.15 — Global admin search
Cmd+K with no query mode → renders top 5 of: matching users (by email/name), matching invoices (by number), matching request ids (last 1000). Powered by a single `admin_search()` Postgres function returning a UNION.

### 3.16 — Internal admin notes (`admin_notes`)
Sticky-note style. Attachable to any user, subscription, or invoice. Rendered inline on every relevant detail page. Markdown supported. Pinnable. No threading — keep it light.

### 3.17 — Mobile considerations
- Every page tests at 375×667 (iPhone SE) before merge.
- Bottom-anchored "Actions" sheet on mobile detail views.
- Cmd+K accessible via a persistent FAB on mobile.
- Tables collapse to card lists below 768px.

---

## 4. Database design

### 4.1 — New tables
```sql
-- 0019_admin_console.sql

-- Append-only audit of every admin write
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  kind text not null,             -- 'user.refund', 'email.suppression.remove', etc.
  target_type text not null,      -- 'user', 'subscription', 'invoice', 'email'
  target_id text,                  -- nullable for system-level actions
  success boolean not null,
  duration_ms integer not null,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);
create index on admin_actions (created_at desc);
create index on admin_actions (actor_id, created_at desc);
create index on admin_actions (target_type, target_id, created_at desc);
alter table public.admin_actions enable row level security;
-- No authenticated SELECT policy. Service role only.

-- Internal notes attachable to any entity
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  target_type text not null,
  target_id text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on admin_notes (target_type, target_id, pinned desc, created_at desc);
alter table public.admin_notes enable row level security;

-- Platform settings KV store
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
```

### 4.2 — New views
```sql
-- Denormalized user overview. Backing table for /admin/users list.
create view public.admin_user_overview as
select
  up.id,
  up.full_name,
  up.email,
  au.created_at as signed_up_at,
  au.last_sign_in_at,
  au.email_confirmed_at,
  au.banned_until,
  sub.plan,
  sub.status as subscription_status,
  sub.current_period_end,
  (select count(*) from invoices i where i.user_id = up.id) as invoice_count,
  (select coalesce(sum(amount_paise),0) from billing_events
   where user_id = up.id and kind = 'payment.captured') as total_revenue_paise,
  (select count(*) from email_suppressions where lower(email) = lower(up.email)) as suppression_count
from user_profiles up
left join auth.users au on au.id = up.id
left join lateral (
  select plan, status, current_period_end
  from subscriptions where user_id = up.id
  order by created_at desc limit 1
) sub on true;
```
Performance note: this is a view, not a materialized view. At < 100k users it runs in < 50ms with the existing indexes. Convert to materialized when it crosses 100ms p50.

### 4.3 — Read-only role for SQL editor
```sql
create role admin_readonly nologin;
grant usage on schema public to admin_readonly;
grant select on all tables in schema public to admin_readonly;
alter default privileges in schema public grant select on tables to admin_readonly;
-- Statement timeout enforced per session in the SQL editor route handler.
```

### 4.4 — `admin_actions.kind` enum
A controlled vocabulary. Examples:
```
user.view_as.start          user.view_as.stop
user.suspend                user.unsuspend
user.password_reset
user.email_verify_force
user.delete_soft
subscription.refund         subscription.comp        subscription.cancel
email.suppression.remove    email.send_test
invoice.share_link.regen
notification.broadcast
settings.update
query.sql.run
```

---

## 5. Auth + permission model

### 5.1 — Single bit, service-role managed
- `auth.users.app_metadata.role`. Values: `null` (regular user) or `'admin'`.
- Set / unset via SQL only. No UI for promotion. Friction is the feature.

### 5.2 — Layered enforcement
Defense in depth — all three layers active simultaneously:

1. **Middleware:** `/admin/*` path requires JWT containing `app_metadata.role = 'admin'`. Redirect with 404 otherwise (don't reveal surface).
2. **Server component:** `requireAdmin()` called at the top of every admin server component + route handler. Belt-and-braces in case middleware is bypassed.
3. **Database:** RLS on `admin_actions`, `admin_notes`, `platform_settings` accepts service-role only. Authenticated admin reads still go through service-role client.

### 5.3 — Session model
- Admin and regular sessions are **the same Supabase session**. No second login.
- Admin status is a property of the user, not of the session.
- "Log out of admin" doesn't exist — admin logs out fully or stays admin.

### 5.4 — Sensitive action protection
Three tiers:

- **Routine** (view as, remove suppression): one-click, audited.
- **Sensitive** (refund, suspend, broadcast notification): typed-confirmation modal ("type the user's email to confirm"). Records to `admin_actions` regardless of confirm.
- **Destructive** (delete user data, mass operations): typed-confirmation + 10-second cooldown timer + emails the admin a receipt of what they did.

---

## 6. UX/UI architecture

### 6.1 — Layout
```
┌─────────────────────────────────────────────┐
│  [Cmd+K]  Now · Users · Subs · ...  [Avatar]│  ← top bar
├──────────┬──────────────────────────────────┤
│ Sidebar  │ Page content                     │
│ (collap- │                                  │
│  sible)  │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
                                  [FAB Cmd+K]  ← mobile only
```

### 6.2 — Information density
- 14px base font, not the 16px of the customer app. Founders read more, not bigger.
- Monospace for IDs / amounts / timestamps. Sans for prose.
- Tables: 32px row height, no zebra. Hover reveals action menu.
- Color is functional: green=ok, amber=warn, red=alert. Otherwise neutral.

### 6.3 — Persistent state
- View-as banner pinned to top across all admin routes when active.
- Maintenance mode banner if `platform_settings.maintenance_mode = true`.
- Last admin action toast persists 5 seconds after every write ("Refunded ₹999 to alex@…  · Undo").

### 6.4 — Components to add to the design system
- `<AdminPageHeader title actions />`
- `<AdminTable columns rows onRowAction />`
- `<AdminDetailGrid sections />`
- `<ConfirmModal danger label onConfirm />`
- `<JsonViewer value />` — collapsible tree for metadata fields.
- `<TimelineEvent kind at actor metadata />` — used in user / subscription / security pages.
- `<CommandPalette commands />` — wraps `cmdk`.

### 6.5 — Performance targets
- `/admin` Now page: ≤ 1.2s p95 server render time. Achievable because all queries are indexed and fanned out in parallel.
- Detail pages: ≤ 800ms p95.
- Cmd+K open → first result: ≤ 100ms (client-side fuzzy search over preloaded command + entity index).

---

## 7. Operational tooling

Use, don't build:

| Need | Tool | Cost | Why this over building |
| --- | --- | --- | --- |
| Analytics dashboards | PostHog (already wired) | Free | Funnels, retention, replay all included |
| Feature flags | PostHog Feature Flags | Free | Native to SDK already in app |
| Error tracking | Sentry (already wired) | Free | 5k events/mo on free tier |
| Uptime monitoring | UptimeRobot | Free | 50 monitors free |
| Log retention / search | Better Stack (optional) | $0–25 | 3-day free retention sufficient at this stage |
| Status page | Better Stack Status | Free tier | Auto-syncs with uptime monitors |
| Internal docs / runbook | This repo's `/docs` folder | Free | Source-of-truth lives next to code |
| SQL editor for ad-hoc | Native in console + Supabase Studio fallback | Free | Don't build Metabase — overkill |
| Support inbox | Zoho Mail + thin in-app view | Free | Inbox semantics already solved |
| Founder-paging | Slack incoming webhook (already wired) | Free | Reliable, mobile push |

**Things explicitly not adopted:**
- Retool — vendor lock-in, slow, expensive past free tier.
- Metabase / Grafana — overkill until you have a data team.
- Forest Admin / AdminJS — opinionated CRUD shapes that fight Supabase RLS.
- Custom data warehouse — premature; PostHog → BigQuery export is a one-click toggle when ready.

---

## 8. Security considerations

### 8.1 — Threat model
- **Threat 1: Founder account credential theft.** Mitigation: WebAuthn / TOTP MFA mandatory for any user with `app_metadata.role = 'admin'`. Add to `requireAdmin()` — refuses session without `aal2`.
- **Threat 2: Admin XSS / cookie theft.** Mitigation: admin route group sets stricter CSP than the customer app (no inline scripts, no eval, no external script srcs).
- **Threat 3: CSRF on write actions.** Mitigation: all admin writes go through server actions which Next.js protects with origin check; double-submit cookie pattern for the few REST endpoints (SQL editor, view-as toggle).
- **Threat 4: Audit log tampering.** Mitigation: `admin_actions` has no UPDATE/DELETE policy; service role can write only via the `recordAdminAction()` helper. Optionally export hourly to S3/R2 for tamper-evidence (phase 4).
- **Threat 5: Accidental destructive action.** Mitigation: typed-confirmation modals + 10s cooldown + email receipts on the destructive tier.
- **Threat 6: View-as leak.** Mitigation: separate cookie, separate client builder (`getViewAsClient`), explicit assertion on every write. Banner is mandatory chrome — can't be dismissed.

### 8.2 — Audit completeness
Every admin write logs to `admin_actions`. Every admin read of sensitive data (full user profile, email content, payment details) logs to `admin_actions` with `kind: '<resource>.read'`. **Reads are auditable too** — at this stage, surveillance discipline is cheap and proves DPDP compliance later.

### 8.3 — Secrets handling in console
- Razorpay / Brevo secrets never displayed. UI shows "configured · last rotated 2026-04-12" only.
- Service role key never exposed to the browser. Admin pages are 100% server components for sensitive fields.
- SQL editor blocks `select * from auth.users` style queries that include `encrypted_password` column via a whitelist of safe `SELECT` patterns. (Phase 4 hardening; phase 1 just trusts the read-only role to lack permissions.)

### 8.4 — DPDP / GDPR alignment
- Every admin read of user data is logged → supports data-access-request fulfillment.
- "Soft-delete user" admin action triggers the existing 30-day retention sweep + scrubs PII columns immediately.
- Admin can export a user's data (JSON dump from all owned tables) via one action → covers data portability requirement.

---

## 9. Implementation roadmap

### Phase 1 — Foundation (3–4 days)
**Goal: Stop using Supabase Studio for daily ops.**

- [ ] Migration 0019: `admin_actions`, `admin_notes`, `platform_settings` + `admin_user_overview` view + `admin_readonly` role.
- [ ] `@/src/features/admin/server.ts`: `requireAdmin()`, `runAdminAction()`, `recordAdminAction()`, `assertNotViewAs()`.
- [ ] `@/src/app/(admin)/admin/layout.tsx`: gated layout with top bar + sidebar.
- [ ] Middleware: protect `/admin/*` with role check.
- [ ] `/admin` Now page (the most important screen; build it first).
- [ ] `/admin/users` list + detail (read-only — no actions yet).
- [ ] `/admin/audit` view over `admin_actions`.
- [ ] Manual SQL to promote founder account to admin.

**Done when:** founder opens `/admin` in the morning and sees what matters without touching Supabase Studio.

### Phase 2 — Operational actions (4–5 days)
**Goal: Run the business from the console.**

- [ ] User detail actions: View as, password reset, force verify, suspend, soft-delete, refund subscription, comp plan.
- [ ] `/admin/subscriptions` list + detail + manual ops.
- [ ] `/admin/emails` over `delivery_logs` + suppression list + "remove suppression" action.
- [ ] `/admin/security` over `security_events`, filter by severity, request-id deep link.
- [ ] `/admin/notifications` — list + broadcast (with typed-confirmation).
- [ ] Cmd+K v1: navigation + top 10 actions.
- [ ] Mobile pass on every page.

**Done when:** every routine ops task you currently do via SQL has a 1-keystroke path.

### Phase 3 — Long-tail + observability glue (3–4 days)
**Goal: Reduce friction on the 20% case.**

- [ ] `/admin/query` — SQL editor over `admin_readonly` role, saved queries.
- [ ] `/admin/invoices`, `/admin/contracts`, `/admin/files` — read-mostly inspection.
- [ ] `/admin/support` — thin inbox over delivery_logs + manual feedback table.
- [ ] `/admin/analytics`, `/admin/flags` — embedded PostHog.
- [ ] `/admin/settings` — `platform_settings` UI, including kill switches.
- [ ] Cmd+K v2: entity search + "find by request id" + recipes.
- [ ] `admin_notes` inline on every detail page.

**Done when:** no operation requires opening Supabase Studio anymore.

### Phase 4 — Hardening (3–4 days)
**Goal: Production-grade safety.**

- [ ] WebAuthn / TOTP MFA enforcement for admin accounts.
- [ ] CSP tightening for admin route group.
- [ ] Typed-confirmation modals on all destructive actions.
- [ ] Email receipts to admin on destructive actions.
- [ ] Hourly `admin_actions` export to object storage for tamper-evidence.
- [ ] DPDP data-export action.
- [ ] Lint rule enforcing all admin writes go through `runAdminAction()`.
- [ ] Playwright admin smoke tests for the critical paths (refund, suspend, view-as).

**Done when:** an external auditor would sign off on the admin surface.

---

## 10. Founder workflow optimizations

### 10.1 — Morning routine
1. Open `/admin` → 15s scan of Now page.
2. If anything red, Cmd+K → the deep link.
3. Else close tab.

Total: < 60s if nothing's wrong.

### 10.2 — User in trouble (support email lands)
1. Cmd+K → paste email → Enter (lands on user detail page).
2. Read activity timeline + recent security_events.
3. If they need a refund: Cmd+K → "refund {email}" → typed confirm → done. Whole flow < 30s.

### 10.3 — Incident response
1. Slack ping fires → click link → lands on cron monitor finding.
2. Each finding has a request_id → Cmd+K → "find request {id}" → joined timeline of logs + security_events + admin_actions.
3. Run remediation action from the timeline view.

### 10.4 — Daily / weekly habits
- **Daily:** scan Now page (1 min).
- **Weekly:** scan `/admin/audit` to remember what you did (5 min). Useful for memory + future-second-admin handoff.
- **Monthly:** review `/admin/analytics` PostHog funnels (15 min). Decide next product priorities.

### 10.5 — Notifications discipline
- Slack only for *actionable* events. Cron monitor + Sentry first-seen for new error type + UptimeRobot down.
- Everything else surfaces only when you open `/admin` proactively.
- Resist the temptation to add more push notifications. Pull > push for solo operators.

---

## 11. Scalability trajectory

### At 100 paid users
Everything in this document works unchanged.

### At 1,000 paid users
- Convert `admin_user_overview` to a materialized view, refreshed every 5 minutes.
- Add full-text index on `user_profiles.email + full_name` for Cmd+K search.
- Add Redis caching on the Now page (10-second TTL).

### At 10,000 paid users
- Promote PostHog → BigQuery export, build the first native dashboard in `/admin/analytics` for the top 2 questions PostHog can't answer in real time.
- Add a second admin role (`support`) with read-only + suppression-remove + comp-plan scopes.
- Add an admin-facing changelog page (auto-generated from `admin_actions` + git commits).

### At 100,000 paid users
- Spin out the support inbox into a real ticketing system (HelpScout, Zoho Desk).
- Move SQL editor to a dedicated tool (Hex, PopSQL).
- Re-evaluate whether the Founder Console should split into a real ops tool — by then you have ops headcount and the tradeoffs flip.

The point: **nothing in phase 1–4 needs rebuilding to get to 10,000 users.** That's the bar for a good architecture.

---

## 12. What to do next

1. **Read this document once.** Push back on anything you disagree with.
2. **Confirm the scope of phase 1.** That's the only commitment that matters today; phases 2–4 are sequenced but not contracted.
3. **Approve the migration shape** for `admin_actions` / `admin_notes` / `platform_settings`.
4. **Decide the founder console URL.** This document assumes `/admin` — change if needed before phase 1.

Once those four are confirmed, phase 1 is ~3–4 days of focused work and produces an immediate quality-of-life jump in how you operate Stackivo.

---

## Appendix A — Files this plan would create / modify

```
supabase/migrations/0019_admin_console.sql         [new]

src/features/admin/
  server.ts                                        [new]  -- requireAdmin, runAdminAction
  actions.ts                                       [new]  -- view-as toggle, sensitive actions
  view-as.ts                                       [new]  -- cookie helpers + client builder
  search.ts                                        [new]  -- global search server fn
  commands.ts                                      [new]  -- Cmd+K registry
  types.ts                                         [new]  -- AdminActionKind etc.

src/app/(admin)/admin/
  layout.tsx                                       [new]
  page.tsx                                         [new]  -- Now page
  users/page.tsx, [id]/page.tsx                    [new]
  subscriptions/page.tsx, [id]/page.tsx            [new]
  emails/page.tsx                                  [new]
  invoices/page.tsx, contracts/page.tsx, files/page.tsx  [new]
  security/page.tsx                                [new]
  audit/page.tsx                                   [new]
  notifications/page.tsx                           [new]
  support/page.tsx                                 [new]
  analytics/page.tsx, flags/page.tsx               [new, iframe shells]
  settings/page.tsx                                [new]
  query/page.tsx                                   [new]

src/components/admin/                              [new dir, ~10 components]

middleware.ts                                      [modify: add /admin/* gate]
src/lib/supabase/types.ts                          [modify: AdminActionRow etc.]

docs/RUNBOOK.md                                    [new, optional]
```

Roughly 35–45 new files for the complete phased delivery, with phase 1 covering ~15 of them.

---

## Appendix B — Things deliberately omitted from this design

A short list of "why isn't X in here" to head off second-guessing:

- **Per-feature permissions for the admin role.** Not needed until there's a second admin. Adds complexity for zero benefit today.
- **Configurable admin dashboard widgets.** The Now page should be opinionated. Configurability would dilute the "scan in 15 seconds" goal.
- **Live presence / "who else is in the admin panel."** You're the only admin. When the second admin arrives, add a single `<OnlineAdmins />` chip — that's it.
- **Customizable email templates from the admin UI.** Templates live in code (`src/features/email/`) as React components. Editing them in a UI invites typos and version-drift. Source-of-truth wins.
- **Webhook replay UI.** `/admin/query` + a saved query is sufficient. Add UI only if replay becomes weekly.
- **Background job runner UI.** You don't have background jobs beyond the one cron. When you add a job system (Inngest / Trigger.dev / pg-boss), it'll bring its own UI.
- **API key management UI.** No customer-facing API yet. Build when you ship a public API.
- **Webhook signing key rotation UI.** Annual rotation. Manual SQL is fine.

The principle in every case: **don't build until the pain is real.**
