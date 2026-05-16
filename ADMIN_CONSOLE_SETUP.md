# Founder Console Setup

Phase 1 of the Founder Console is shipped. This document walks through the **one-time activation steps** needed to actually use it.

**Time budget:** 5 minutes.
**Risk:** zero — every change is reversible with a one-line SQL.

---

## 1. Apply migration 0019

The console depends on three new tables (`admin_actions`, `admin_notes`, `platform_settings`), one view (`admin_user_overview`), and one Postgres role (`admin_readonly`).

### Production / staging

```bash
supabase db push
```

### Manual (Supabase SQL editor)

If you prefer not to use the CLI:

1. Supabase dashboard → **SQL editor** → **New query**.
2. Paste the contents of `supabase/migrations/0019_admin_console.sql`.
3. Click **Run**.

### Verify

```sql
select count(*) from public.admin_actions;
select count(*) from public.admin_notes;
select count(*) from public.platform_settings;
select count(*) from public.admin_user_overview;
select rolname from pg_roles where rolname = 'admin_readonly';
```

All five queries should succeed.

---

## 2. Promote yourself to admin

The console gates access via `auth.users.raw_app_meta_data -> 'role'`. This is **service-role-only** mutable, so the only way to set it is via SQL — which is the feature (no "promote admin" button to forget about).

### Steps

1. Supabase dashboard → **SQL editor** → **New query**.
2. Run, **replacing the email**:

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
where email = 'YOUR_FOUNDER_EMAIL@stackivo.me';
```

3. Verify:

```sql
select email, raw_app_meta_data -> 'role' as role
from auth.users
where email = 'YOUR_FOUNDER_EMAIL@stackivo.me';
```

Expected output: `role` column shows `"admin"`.

### To revoke

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = 'former_admin@stackivo.me';
```

---

## 3. Refresh your session

The admin bit is read from the JWT, which is cached in your auth cookie until the next refresh.

1. Log out of Stackivo entirely.
2. Log back in.

Your new JWT will carry `app_metadata.role = "admin"`.

---

## 4. First visit

1. Navigate to `https://stackivo.me/admin` (or your local dev URL).
2. You should land on the Now page with five sections:
   - Revenue
   - Pipeline
   - Comms & Security
   - What broke (last 24h alerts)
   - Your last 10 actions

If you see a 404 instead, the role bit didn't land correctly. The 404 is intentional: the console returns 404 (not 403) to non-admins so the surface is indistinguishable from a missing page.

---

## 5. What's in Phase 1

| URL | Page | State |
| --- | --- | --- |
| `/admin` | Now page (single-screen morning standup) | live |
| `/admin/users` | List of all users with filters + pagination | live, read-only |
| `/admin/users/[id]` | User detail (profile, subscription, timelines) | live, read-only |
| `/admin/audit` | Append-only log of every admin action | live |

**Every page is read-only in Phase 1.** Visiting a user detail page records a `user.read` row in `admin_actions` for DPDP data-access support.

---

## 6. What ships in subsequent phases

| Phase | Surface | ETA after Phase 1 |
| --- | --- | --- |
| 2 | View-as · password reset · suspend · refund · comp plan · subscriptions · emails · security · notifications/broadcast · Cmd+K v1 | 4–5 days |
| 3 | SQL editor · invoice/contract/file inspection · support inbox · `admin_notes` inline · Cmd+K v2 · embedded PostHog | 3–4 days |
| 4 | WebAuthn MFA · CSP tightening · typed-confirm modals · audit export · DPDP data export · Playwright smoke tests | 3–4 days |

---

## 7. Troubleshooting

### I get a 404 at `/admin` even after promoting myself

- Did you log out + log back in? The role lives in the JWT, cached until refresh.
- Run the verify query in §2 to confirm the value is `"admin"` (quoted JSONB string).

### The Now page shows all zeros

- Expected on a fresh database. Sign up a test user, trigger a test email/payment, and the dashboard will populate.
- On real data, check `select count(*) from public.admin_user_overview;` — if zero, the view's lateral join is misbehaving.

### `/admin/users/[id]` 404s

- The `id` must be `auth.users.id` (matches `user_profiles.id`). Soft-deleted users whose profile row was scrubbed will 404 by design.

### The audit log is empty

- Until you perform a write (Phase 2+) OR visit a user detail page (logs `user.read`), the audit log is empty.

---

## 8. Security notes

- **`admin_readonly`** is `NOLOGIN` — it's a role-grant target only, used by Phase 3's SQL editor.
- **All admin tables are RLS-enabled with no authenticated policy** — only the service-role client can touch them.
- **Middleware + server-component double-check** — both the edge middleware and the `(admin)` route group call `requireAdmin()` so a misconfigured middleware does not leak the surface.
- **Non-admins see 404, not 403** — consistent with the security posture of hiding the surface.
- **The `rls_guard_miss` security event fires** on any authenticated non-admin who reaches `requireAdmin()`. Watch `select count(*) from public.security_events where kind = 'rls_guard_miss';` — should be 0 in steady state.

---

## 9. Rollback

If anything goes wrong, the entire console can be turned off by reverting migration 0019 (drops the tables + view + role) or by removing the role bit from your `auth.users` row. The middleware will then 404 every `/admin/*` route.

---

## 10. Phase 2 — operational actions (now live)

Phase 2 adds the action surface on top of the Phase-1 read-only views.

### New pages

| URL | What it does |
| --- | --- |
| `/admin/subscriptions` | Active / Trialing / Past due / Cancelled tabs with live counts |
| `/admin/subscriptions/[id]` | Subscription detail + cancel + manual refund actions |
| `/admin/emails` | Delivery-log filterable feed + suppression list with inline remove + manual add |
| `/admin/security` | `security_events` filtered by severity, kind, request_id, user_id |
| `/admin/notifications` | Broadcast composer + recent broadcast log |

### New user-detail actions (right-hand panel)

All of these write to `admin_actions` automatically:

| Action | Tier | What it does |
| --- | --- | --- |
| **View as** | routine | Sets a 1-hour `stk_admin_view_as` cookie. Reads work; writes are blocked until you exit. |
| **Send password reset** | sensitive | `auth.admin.generateLink({ type: "recovery" })`. User receives Supabase recovery mail. |
| **Force email verify** | sensitive | Marks `email_confirmed_at` for users with broken inboxes. |
| **Suspend** | sensitive | Sets `auth.users.banned_until` ~100 years out. |
| **Unsuspend** | sensitive | Clears the ban. Appears only when the user is currently suspended. |
| **Comp plan** | sensitive | Manual entitlement override. Refuses to overwrite a live Razorpay-managed subscription. |
| **Soft-delete user** | destructive | Scrubs PII, cancels subscription, adds email to suppressions, suspends auth account. Activity history (invoices, payments, contracts) preserved for tax retention. |

### Action tier reference

| Tier | Guard |
| --- | --- |
| **routine** | One click, audited. |
| **sensitive** | Typed confirmation (admin types the user's email). |
| **destructive** | Typed confirmation + 10-second cooldown (admin types literally `SEND` for broadcast or the user's email for soft-delete). |

### Command palette (Cmd+K)

Hotkeys:
- **Cmd+K** / **Ctrl+K** — toggle palette
- **/** — open palette (when no input field is focused)

Search supports:
- **Email or full-name substring** → matching users (top 15)
- **Exact UUID** → user + subscription lookup in parallel
- **32-char hex** → security event by `request_id` (one-click jump to a full trace)

The palette also offers **Go to** (every nav item) and **Recipes** (one-click jumps to common filtered views: alerts, failed deliveries, past-due subs).

### View-as caveats

Important things to know:

- The cookie lasts **1 hour** and is **httpOnly** — you can't fake it from devtools.
- Reads inside `/admin/*` still resolve through the service-role client, scoped server-side to the view-as id.
- **Every write through the console** is refused by `assertNotViewAs()` while the cookie is set. The yellow banner reminds you across every admin page.
- Exit is the same in both desktop and mobile — click the banner's "Exit" button (`POST /api/admin/view-as/stop`).

### Verifying the view-as audit trail

```sql
select kind, target_id, created_at
from public.admin_actions
where kind in ('user.view_as.start', 'user.view_as.stop')
order by created_at desc
limit 10;
```

You should see paired start/stop rows for every view-as session you've initiated.

### Refund flow (important)

The "Record manual refund" action **does not call Razorpay**. The intended flow is:

1. **Razorpay dashboard** → issue the actual refund (or via Razorpay's API).
2. **Founder Console** → `/admin/subscriptions/[id]` → Record manual refund — paste the Razorpay refund id, amount, reason.
3. Console writes a negative-amount `billing_payments` row with `status='refunded'` and marks the original payment row refunded too — so MRR + admin user-overview math stays consistent.

The audit trail in `admin_actions` references the original payment id; the Razorpay refund id sits in `metadata.razorpay_refund_id`.

### Broadcast (destructive)

The broadcast composer inserts one `notifications` row per matched user. Currently audience filters are: **All users**, **Free plan only**, **Pro plan only**, **Business plan only**.

A typed `SEND` confirm + 10-second cooldown is required because there is **no undo**. The action is audited under kind `notification.broadcast` with the title and audience.

### Phase 2 verification checklist

After deploying Phase 2:

- [ ] `/admin/subscriptions` opens and tabs show non-zero counts (assuming you have at least one subscription).
- [ ] `/admin/subscriptions/[id]` shows the user's payments + Razorpay events.
- [ ] `/admin/emails` lists deliveries; filter by `status=failed` works.
- [ ] `/admin/security` shows events; clicking a request-id chip filters the list.
- [ ] `/admin/notifications` renders the broadcast composer.
- [ ] **Cmd+K** opens the palette anywhere in `/admin/*`.
- [ ] Typing 2+ chars surfaces user hits within ~200ms.
- [ ] Pasting a 32-char hex (e.g. from a request `x-request-id` header) jumps to that security trace.
- [ ] Starting view-as from a user detail page lands you on `/dashboard` with the yellow "Viewing as…" banner pinned at top.
- [ ] Attempting any console write while view-as is active throws "Writes are disabled while viewing as another user."
- [ ] `select kind, success from public.admin_actions order by created_at desc limit 20;` shows live audit entries.

### Phase 2 rollback

Each action can be individually disabled by commenting out the export in `@/src/features/admin/actions.ts` and redeploying. The audit log is append-only — past actions remain visible in `/admin/audit` regardless.

Full Phase 2 rollback: revert `@/src/features/admin/actions.ts`, the action sidebars, and the command palette wiring. Phase 1 pages keep working unchanged.

---

## 11. Phase 3 — long-tail surfaces (now live)

Phase 3 closes the operational coverage gap by adding entity inspection, an SQL escape hatch, internal notes, embedded analytics, and a thin support inbox.

### Apply migration 0020

Before using `/admin/query`:

```bash
supabase db push
```

Or paste `@/supabase/migrations/0020_admin_query.sql` into the Supabase SQL editor.

Verify:

```sql
select pg_get_functiondef('public.admin_run_readonly_query(text)'::regprocedure) is not null;
```

Should return `true`. The function is SECURITY DEFINER and locked down to the service role.

### New pages

| URL | What it does |
| --- | --- |
| `/admin/invoices` | List with status filter + invoice-number search |
| `/admin/invoices/[id]` | Read-only detail: items, deliveries, notes |
| `/admin/contracts` | List with status filter + title search |
| `/admin/contracts/[id]` | Read-only detail: signatures, deliveries, public link, notes |
| `/admin/files` | Filterable file inventory with size + storage total |
| `/admin/support` | Thin inbox — last 50 delivery failures (likely complaints) |
| `/admin/query` | SQL editor over the `admin_readonly` role (30s timeout) |
| `/admin/analytics` | Embedded PostHog dashboard (URL via settings) |
| `/admin/flags` | Embedded PostHog feature flags (URL via settings) |
| `/admin/settings` | Platform-wide KV settings with inline editor |

### Admin notes

Every detail page now embeds an `AdminNotesPanel`:

- Plain-text only, up to 4000 chars per note.
- Pin / unpin moves a note to the top.
- Edit / delete are inline, no separate page.
- Every CRUD lands in `admin_actions` with kind `system.note.{create,update,delete}`.

Currently wired on `/admin/users/[id]`, `/admin/invoices/[id]`, `/admin/contracts/[id]`. To add the panel to any new detail page:

```tsx
import { listAdminNotes } from "@/features/admin/queries";
import { AdminNotesPanel } from "@/components/admin/admin-notes";

const notes = await listAdminNotes("subscription", subscriptionId);

<AdminNotesPanel
  targetType="subscription"
  targetId={subscriptionId}
  notes={notes}
/>
```

### SQL editor

`/admin/query` runs through `public.admin_run_readonly_query(p_sql text)`.

Guarantees:
- Only `SELECT`, `WITH`, `EXPLAIN` accepted (defensive check in the function).
- Runs as `admin_readonly` role → no write privileges anywhere.
- 30-second `statement_timeout`.
- Every run audited to `admin_actions` with the first 2000 chars of the query.
- Result UI shows up to 500 rows; tighten `LIMIT` to see deeper slices.

Six saved queries shipped:
- Signups in last 24h
- Unverified > 7d
- MRR snapshot
- Failed deliveries (24h)
- Security alerts (7d)
- Top revenue users

### Settings + analytics + flags

`platform_settings` is now a real KV store with five documented keys:

| Key | Default | Effect |
| --- | --- | --- |
| `maintenance_mode` | `false` | Renders a banner on marketing pages (consume in customer code as needed). |
| `public_signups_enabled` | `true` | Toggle to disable signup during incidents. |
| `email_live_mode_override` | `null` | Force-disable outbound email even when env says live. |
| `posthog_dashboard_url` | `""` | Embedded into `/admin/analytics` iframe. |
| `posthog_feature_flags_url` | `""` | Embedded into `/admin/flags` iframe. |

To enable analytics:

1. PostHog → Dashboards → pick the founder dashboard → **Share** → enable public link.
2. Copy the URL.
3. `/admin/settings` → `posthog_dashboard_url` → paste → type the key to confirm → Save.
4. Reload `/admin/analytics`.

### Cmd+K v2

Substring search now spans **users + invoices + contracts** in parallel. The first 8 user hits + 5 invoice + 5 contract hits, capped at 15 total. Exact UUID still resolves to user OR subscription. 32-char hex still jumps to the security trace by request id.

Recipes added:
- Open overdue invoices
- Open recent admin activity

### Phase 3 verification checklist

After deploying Phase 3:

- [ ] Migration 0020 applied; `public.admin_run_readonly_query` returns rows for a sample query like `select 1 as ok`.
- [ ] `/admin/query` runs the default saved query and shows rows.
- [ ] `/admin/query` rejects `update users set ... `with a clear error message.
- [ ] `/admin/invoices`, `/admin/contracts`, `/admin/files` load and render results.
- [ ] `/admin/support` renders without error (empty inbox is OK).
- [ ] `/admin/settings` lists the five known keys and the values match the defaults if unset.
- [ ] After saving `posthog_dashboard_url`, `/admin/analytics` iframes the URL.
- [ ] On any detail page, adding a note → it appears immediately; pinning + deleting work.
- [ ] Cmd+K finds invoices by number and contracts by title.
- [ ] `select count(*) from public.admin_actions where kind in ('query.sql.run', 'system.note.create');` increments as you use these features.

### Phase 3 rollback

- SQL editor: drop the route — the function can stay or be `drop function`d.
- Settings: drop `/admin/settings` route; `platform_settings` rows stay but become inert.
- Notes: remove `AdminNotesPanel` from detail pages and drop the actions exports; existing rows in `admin_notes` are preserved.
- Iframes (analytics/flags): drop the routes; settings unaffected.

---

## 12. Phase 4 — hardening (now live)

Phase 4 raises the security floor so the console is safe to use in production indefinitely.

### Apply migration 0021

```bash
supabase db push
```

Or paste `@/supabase/migrations/0021_admin_exports.sql` into Supabase SQL editor. Verify both buckets:

```sql
select id, public from storage.buckets
where id in ('admin-exports', 'user-exports');
```

Both should appear with `public=false`.

### Enroll MFA (mandatory in production)

`requireAdmin()` now enforces AAL2 (TOTP-verified session) whenever `NODE_ENV=production`. Non-AAL2 admin sessions redirect to `/admin/mfa` automatically.

**One-time setup:**

1. Log in as the admin in production.
2. Navigate to `/admin/mfa`.
3. Click **Start TOTP enrollment** — scan the QR with 1Password / Authy / Google Authenticator / Bitwarden / any standards-compliant TOTP app.
4. Enter the current 6-digit code in the verify field. Toast confirms.
5. **Log out and log back in.** Supabase will prompt for the 6-digit code; the new session is AAL2 and the full console unlocks.

After enrollment, every fresh login requires the 6-digit code. Existing sessions continue to work until they expire.

**Local development bypass:** the AAL2 check skips when `NODE_ENV !== 'production'` so local testing without a real TOTP device still works. The MFA page is still reachable for enrollment testing.

**Lockout safety net:** an admin who loses their only factor can be unblocked from the Supabase SQL editor:

```sql
delete from auth.mfa_factors where user_id = '<admin uuid>';
```

This clears the factor list; the admin can re-enroll on their next visit to `/admin/mfa`.

### Stricter CSP for `/admin/*`

Middleware now adds these admin-only response headers:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://api.qrserver.com;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.ingest.sentry.io;
  frame-src 'self' https://app.posthog.com https://eu.posthog.com https://us.posthog.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

`'unsafe-inline'` on script-src is required by Next.js's runtime bootstrap. The remaining tightening (no remote scripts, no object/base/form leaks, no clickjacking) blocks the realistic threat model.

### Email receipts on destructive actions

Two destructive-tier actions now send the admin an email receipt **on success**:

- `user.delete_soft` — subject `[Stackivo Console] Soft-deleted <email>`
- `notification.broadcast` — subject `[Stackivo Console] Broadcast: <title>`

Receipts:
- Are fire-and-forget — a delivery failure does NOT roll back the action.
- Skip themselves when `EMAIL_LIVE_MODE` is false (no inbox spam during dev).
- Go from the `support@stackivo.me` sender to the admin's own email.

### Hourly audit export (tamper-evidence)

`/api/cron/admin-export` should be called by an external cron service at HH:05 every hour. It:

1. Pulls every `admin_actions` row from the previous full hour.
2. Serialises to JSONL.
3. Uploads to `admin-exports/YYYY/MM/DD/HH.jsonl` via the service-role storage client.

The bucket is **private** and has **no authenticated RLS policy**, so only the service role can read the archive. Restore / forensic review is via the Supabase Storage dashboard or a server-side script signed against the service role.

Auth: same `Authorization: Bearer $CRON_SECRET` pattern as `/api/cron/monitor`. The 404 fallback applies if `CRON_SECRET` isn't set.

Verify after an hour of production traffic:

```sql
-- Manual check by listing the bucket contents:
select name, created_at
from storage.objects
where bucket_id = 'admin-exports'
order by created_at desc
limit 5;
```

### DPDP user-data export action

A new sensitive-tier action on every user detail page:

- **Generate export** — bundles every owned row across 14 tables into a single JSON file, uploads to `user-exports/<user_id>/<timestamp>.json`, returns a **24-hour signed URL**.

On success the URL opens in a new tab automatically (also persists in `admin_actions.metadata`). Forward the link to the user via their preferred channel; after 24h the link expires and you can regenerate.

Tables included: `user_profiles`, `clients`, `projects`, `invoices`, `invoice_items`, `contracts`, `contract_signatures`, `files`, `notifications`, `activity_events`, `billing_payments`, `billing_events`, `time_entries`, `subscriptions`.

### Playwright admin smoke tests

A minimal smoke suite lands in `e2e/admin/smoke.spec.ts`:

1. Non-authenticated `/admin` doesn't leak surface chrome.
2. Admin reaches the Now page with the canonical section headings.
3. Cmd+K opens the palette.

**Setup (one-time):**

```bash
npm install
npm run test:e2e:install        # installs Chromium
```

**Required env to run the suite:**

```bash
E2E_ADMIN_EMAIL=founder@stackivo.me
E2E_ADMIN_PASSWORD=<that admin's password>
# Optional: target a deployed environment instead of localhost
E2E_BASE_URL=https://stackivo.me
```

**Run:**

```bash
npm run test:e2e
```

The suite **skips itself** when the env vars are absent — safe to run on a fresh checkout.

### `runAdminAction()` enforcement

A small Node script (`scripts/verify-admin-actions.mjs`) scans `src/features/admin/actions.ts` and refuses if any exported `adminXxx` function performs a write (`.insert / .update / .delete / .upsert`) without wrapping it in `runAdminAction(...)`.

Run on demand:

```bash
npm run verify:admin-actions
```

Wire into CI / pre-commit for permanent enforcement. The script exits with code 1 on violation and prints the offending function names.

### Phase 4 verification checklist

- [ ] Migration 0021 applied; both buckets exist with `public=false`.
- [ ] `/admin/mfa` reachable; enrollment + verify succeeds end-to-end.
- [ ] After logout / login, the admin gets the 6-digit prompt and lands on AAL2.
- [ ] Devtools → Network → admin response includes the stricter CSP header.
- [ ] Performing a soft-delete in production sends an email receipt to the admin within ~30s.
- [ ] After 1 hour of admin activity, `admin-exports/YYYY/MM/DD/HH.jsonl` exists with rows.
- [ ] `/admin/users/[id]` shows a **Generate export** action; clicking opens a working signed URL.
- [ ] `npm run verify:admin-actions` exits 0.
- [ ] `npm run test:e2e` skips cleanly without env, runs cleanly with creds.
- [ ] `select count(*) from public.admin_actions where kind = 'user.data_export';` increments per export.

### Phase 4 rollback

- MFA enforcement: remove the `aal2` check block in `@/src/features/admin/server.ts`. Existing factors stay enrolled but no longer required.
- CSP: drop the `Content-Security-Policy` set in `middleware.ts` for `/admin/*`. Global headers (configured in `next.config.ts`) still apply.
- Email receipts: comment out the `sendAdminReceipt(...)` calls inside the destructive actions.
- Hourly export: stop the external cron call; old files stay in the bucket.
- DPDP export: remove the action export from `actions.ts` and the form block in `user-actions.tsx`.
- Playwright + verify script: delete `e2e/`, `playwright.config.ts`, `scripts/verify-admin-actions.mjs`, and the related npm scripts.

Each rollback is independent — Phase 4 hardening is composed of orthogonal pieces.

