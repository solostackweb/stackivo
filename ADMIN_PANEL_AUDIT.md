# Stackivo — Admin Panel Complete Flow Audit

> Generated: May 2026  
> Covers: `src/app/(admin)/`, `src/features/admin/`, `src/app/api/admin/`

---

## 1. Entry Point

### 1.1 URL
All admin routes live under `/admin/*`, grouped in the Next.js App Router route group `(admin)`.

### 1.2 Auth Gate — Two Layers

**Layer 1 — Middleware** (`src/lib/supabase/middleware.ts`)  
Every request refreshes the Supabase JWT via `getUser()` (not `getSession()` — re-validates against the server). This layer handles token rotation and passes the user through. It **does not** check the admin role — it only ensures the session cookie stays fresh.

**Layer 2 — Layout** (`src/app/(admin)/admin/layout.tsx`)  
Calls `requireAdmin()` on every navigation. This is the primary authorization gate.

### 1.3 `requireAdmin()` Logic (`src/features/admin/server.ts`)

```
1. getServerSupabase().auth.getUser()
   → no user → redirect("/login")

2. read user.app_metadata.role
   → role ≠ "admin" → recordSecurityEvent(kind: "rls_guard_miss", severity: "alert")
                     → notFound()  [404 not 403 — hides surface from attackers]

3. In production only:
   → readAal() → supabase.auth.mfa.getAuthenticatorAssuranceLevel()
   → aal ≠ "aal2" AND path doesn't start with "/admin/mfa"
   → redirect("/admin/mfa")
```

**How admin role is granted:** Set manually via SQL on `auth.users.raw_app_meta_data -> 'role' = 'admin'`. There is no UI to grant it.

---

## 2. Layout and Shell

`AdminShell` receives:
- `adminEmail` — the logged-in admin's email
- `viewingAs` — `{ id, name, email }` if a view-as session is active, else `null`

The layout resolves view-as state on every navigation by reading the `stk_admin_view_as` httpOnly cookie via `getViewAsUserId()`. If a UUID is found there, `getUserOverview(viewAsId)` fetches the target user's name/email for the banner.

---

## 3. All Pages

### `/admin` — "Now" Dashboard
**Purpose:** Morning standup view. 95% of admin sessions end here.  
**Data (parallel Promise.all):**
- `getRevenueSnapshot()` — payments captured today / 7d, active subs, past-due subs
- `getPipelineSnapshot()` — signups 24h / 7d, unverified >7d old, trialing ending in 3 days
- `getCommsSnapshot()` — email failures, suppressions, security events (24h counts)
- `getRecentAlerts(5)` — last 5 `security_events` with severity='alert'
- `getRecentAdminActivity(10)` — last 10 `admin_actions` rows
- `getSupportPulse()` — open support threads / Crisp signals

All queries run via `getAdminSupabase()` (service-role client, bypasses RLS).

---

### `/admin/users` — User List
**Purpose:** Search + filter all registered users.  
**Query:** `listUsers()` backed by `admin_user_overview` Postgres view (denormalized — one round trip).  
**Filters (URL params):**  
- `q` — free-text on email / full_name
- `plan` — free / pro / business / all
- `status` — active / trialing / past_due / canceled / paused / expired / all
- `account` — freelancer / portal_client / all
- `page` — 1-indexed, page size 25

---

### `/admin/users/[id]` — User Detail
**Purpose:** Full triage view for one user. Records a `user.read` audit row on every visit.  
**Data fetched:**
- `getUserOverview(id)` — profile snapshot, subscription, lifetime stats
- `getUserTimeline(id)` — latest 25 `activity_events`
- Security events for this user
- Recent delivery logs (email history)
- Recent billing payments
- `listAdminNotes(...)` — sticky notes attached to this user
- `listSupportThreadsForUser(id)` — Crisp/Zoho threads
- `getUserChurnSignals(id)` — churn risk badges

**Write actions available (via `UserActions` component):**
- Password reset — `adminPasswordResetAction(userId)` → generates Supabase recovery link
- Force-verify email — `adminForceVerifyEmailAction(userId)`
- Suspend user — `adminSuspendUserAction({ userId, untilIso?, reason? })`
- Unsuspend user — `adminUnsuspendUserAction(userId)`
- Soft-delete user — `adminSoftDeleteUserAction({ userId, reason? })` (scrubs PII, cancels sub, bans auth, suppresses email, fans out to Crisp + Zoho)
- Export user data — `adminExportUserDataAction({ userId, reason? })` (DPDP compliance — returns 24h signed URL to `user-exports` storage bucket)
- Comp plan — `adminCompPlanAction({ userId, plan, days, reason? })`
- **Start view-as session** — form posting to `/api/admin/view-as/start`
- Admin notes — create / update / delete via `adminCreateNoteAction`, `adminUpdateNoteAction`, `adminDeleteNoteAction`

---

### `/admin/subscriptions` — Subscription List
**Purpose:** Billing overview with status tabs.  
**Query:** `listSubscriptions({ status, page, pageSize })` — tabs: Active / Trialing / Past due / Cancelled / All.  
Page size: 25.

---

### `/admin/subscriptions/[id]` — Subscription Detail
**Purpose:** Inspect one subscription + take actions. Records `subscription.read` audit row.  
**Data:** `getSubscriptionDetail(id)` — subscription row + linked user + last 25 `billing_events` + last 25 `billing_payments`.  
**Write actions:**
- Cancel — `adminCancelSubscriptionAction({ subscriptionId, immediately, reason? })`
- Record manual refund — `adminRecordRefundAction({ userId, paymentId, amountPaise?, razorpayRefundId?, reason? })`

---

### `/admin/invoices` — Invoice List
**Purpose:** Read-only invoice search.  
**Query:** `listInvoices({ q, status, page, pageSize })`.  
**Status filters:** draft / sent / viewed / paid / overdue / partially_paid / all.

---

### `/admin/invoices/[id]` — Invoice Detail
**Purpose:** Full invoice view — items, payment attempts, delivery logs, GST breakdown, portal link.  
Read-only. Admin notes panel available.

---

### `/admin/contracts` — Contract List
**Purpose:** Read-only contract search.  
**Status filters:** draft / sent / viewed / signed / declined / expired / all.

---

### `/admin/contracts/[id]` — Contract Detail
**Purpose:** Contract view with signature info.  
Read-only. Admin notes panel available.

---

### `/admin/emails` — Email Delivery + Suppressions
**Purpose:** Two stacked sections.

**Delivery log** — `listEmails({ status, q, page, pageSize })` from `delivery_logs` table.  
Status tabs: all / delivered / failed / bounced / blocked.  
Each row links to the Brevo dashboard if `provider_message_id` is present.

**Suppression list** — `listSuppressions()` (last 100 rows).  
Actions:  
- Remove suppression — `adminRemoveSuppressionAction(email)`
- Add suppression — `adminAddSuppressionAction(email, reason)` — reasons: hard_bounce / soft_bounce_repeat / complaint / unsubscribe / invalid / manual

---

### `/admin/files` — File Inventory
**Purpose:** Storage footprint monitor.  
**Query:** `listFiles({ q, page, pageSize: 50 })`.  
Shows file type, size in human-readable format, upload time, linked user. Useful for spotting users nearing storage caps.

---

### `/admin/notifications` — Broadcast Composer
**Purpose:** Send a platform-wide in-app notification.  
**Form** (via `BroadcastForm` component) → `adminBroadcastNotificationAction({ type, title, message?, targetPlan? })`.  
Types: announcement / incident / maintenance.  
Target: all / free / pro / business.  
Inserts in chunks of 1,000 rows to avoid hammering Postgres.  
**Gated by TypedConfirmModal** — admin must type "SEND" to confirm.  
Sends an admin receipt email after completion.

Recent broadcasts shown below the form (derived from `notifications` table grouping).

---

### `/admin/security` — Security Events
**Purpose:** `security_events` table viewer.  
**Filters:** severity (alert / warn / info), kind, user_id, request_id.  
Default: last 7 days.  
Request-id is clickable — filters to all events sharing that trace ID.  
`JsonViewer` expands `metadata` JSONB inline.

**Recorded event kinds:**
- `auth_login_failed`, `auth_signup_failed`, `auth_ratelimit_tripped`
- `auth_password_reset_requested`
- `rls_guard_miss` — non-admin tried to reach `/admin/*`
- `webhook_signature_invalid`, `webhook_replay_detected`
- `storage_prefix_mismatch`
- `cron_monitor_alert`
- `suppression_hit`

---

### `/admin/audit` — Admin Actions Log
**Purpose:** Append-only forensic log of every admin operation.  
**Query:** `admin_actions` table, descending, page size 50.  
The Now page already surfaces the last 10; this page goes deeper.  
`JsonViewer` expands `metadata` JSONB inline.  
Every audit row includes: `actor_id`, `kind`, `target_type`, `target_id`, `success`, `duration_ms`, `request_id`, `metadata`.

---

### `/admin/analytics` — Embedded PostHog Dashboard
**Purpose:** Product analytics without rebuilding them in-app.  
Reads `platform_settings.posthog_dashboard_url`.  
If set → full-height `<iframe>` of the PostHog public dashboard link.  
If not set → setup instructions pointing to `/admin/settings`.

---

### `/admin/flags` — Embedded PostHog Feature Flags
**Purpose:** Feature flag management via PostHog.  
Reads `platform_settings.posthog_feature_flags_url`.  
Same iframe pattern as `/admin/analytics`.

---

### `/admin/settings` — Platform Settings (Kill Switches)
**Purpose:** KV store for global config. All writes are `adminSetPlatformSettingAction({ key, value })` — audited under `settings.update` kind, gated by TypedConfirmModal.

**Known setting keys:**

| Key | Default | Purpose |
|-----|---------|---------|
| `maintenance_mode` | `false` | Shows banner on marketing pages |
| `public_signups_enabled` | `true` | Toggle signup form |
| `email_live_mode_override` | `null` | Kill switch for outbound email |
| `free_plan_client_limit` | `3` | Max clients on free tier |
| `referral_reward_months` | `1` | Pro months granted per referral |
| `posthog_dashboard_url` | — | PostHog public dashboard URL |
| `posthog_feature_flags_url` | — | PostHog feature flags URL |

---

### `/admin/support` — Support Inbox
**Purpose:** Thin inbox for support triage.  
V1 sources: `delivery_logs` with status in (failed / bounced / blocked).  
Also shows Crisp + Zoho thread counts from `listSupportThreads()`.  
Each row links to the user detail page so the founder jumps straight to context.

---

### `/admin/query` — SQL Editor
**Purpose:** Read-only escape hatch for ad-hoc queries.  
Uses the `admin_readonly` Postgres role. Statement timeout: 30 seconds.  
Only `SELECT`, `WITH`, `EXPLAIN` are allowed.  
Every run is audited to `admin_actions` with the query text (first 2,000 chars) in metadata.  
Rendered via `SqlRunner` client component.

---

### `/admin/mfa` — MFA Enrollment + Step-Up
**Purpose:** TOTP enrollment page for the admin account.  
Reachable before AAL2 is satisfied (the MFA check inside `requireAdmin()` skips this specific path to avoid infinite redirect).  
Calls `getMfaStatus()` then renders `MfaEnrollFlow`.  
In production: admin is redirected here from any other `/admin/*` page if `currentLevel !== "aal2"`.  
In non-production: MFA gate is bypassed so local dev works without a real TOTP device.

---

## 4. API Routes

### `POST /api/admin/view-as/start`
**Body:** `application/x-www-form-urlencoded` with `userId=<uuid>`  
**Flow:**
1. Calls `startViewAsAction(userId)`
2. `startViewAsAction` → `runAdminAction()` → validates UUID → sets `stk_admin_view_as` cookie (httpOnly, 1-hour TTL) → audits `user.view_as.start`
3. Returns `303 → /dashboard` (admin now sees the user's dashboard)

### `POST /api/admin/view-as/stop`
**Flow:**
1. Calls `stopViewAsAction()`
2. Deletes `stk_admin_view_as` cookie → audits `user.view_as.stop` via the low-level `recordAdminAction()` primitive (bypasses `runAdminAction()` to avoid the view-as block)
3. Returns `303 → Referer` (if same origin) else `→ /admin/users`

---

## 5. View-As System

**Cookie:** `stk_admin_view_as` — httpOnly, SameSite=Lax, Secure in production, 1-hour TTL.  
**Start:** Admin clicks "View as user" on the user detail page → form posts to `/api/admin/view-as/start` → cookie set → admin lands on `/dashboard` in the user's context.  
**Reads while view-as active:** Admin layouts and pages call `getViewAsUserId()` to detect the cookie. RLS-bypassing admin queries (`getAdminSupabase()`) can optionally scope to the impersonated user.  
**Writes while view-as active:** Every write action goes through `runAdminAction()`, which calls `assertNotViewAs()` first — throws immediately if the cookie is set. View-as is **strictly read-only**.  
**Stop:** Banner in `AdminShell` has a "Stop viewing as" button → form posts to `/api/admin/view-as/stop` → cookie deleted → back to admin users page.

---

## 6. Audit System

**Table:** `admin_actions`  
**Written by:** `recordAdminAction()` or `runAdminAction()` (wraps every write).  
**Never blocks the action:** audit failures are logged + swallowed, never re-thrown.  
**Request correlation:** `x-request-id` header captured per row for cross-system tracing.

### All `AdminActionKind` values

| Category | Kind |
|----------|------|
| User | `user.view_as.start`, `user.view_as.stop`, `user.read`, `user.password_reset`, `user.email_verify_force`, `user.suspend`, `user.unsuspend`, `user.delete_soft`, `user.data_export` |
| Subscription | `subscription.read`, `subscription.comp`, `subscription.refund`, `subscription.cancel` |
| Email | `email.suppression.add`, `email.suppression.remove` |
| Notifications | `notification.broadcast` |
| Settings | `settings.update` |
| Notes | `system.note.create`, `system.note.update`, `system.note.delete` |

---

## 7. Write Safety Model

All admin writes flow through `runAdminAction()`, which enforces in this exact order:

```
1. requireAdmin()         — re-verify role at call site (not just layout)
2. assertNotViewAs()      — refuse write if view-as cookie is set
3. body(actor)            — execute the mutation
4. recordAdminAction()    — audit success OR failure (never skipped)
5. re-throw on error      — so the caller can surface the message to the UI
```

Destructive-tier actions (soft-delete, broadcast, platform settings) are additionally gated by a `TypedConfirmModal` in the UI that requires the admin to type a specific phrase (e.g., "SEND", "DELETE") before the form is submitted.

---

## 8. Exit Points

| Path | How |
|------|-----|
| Normal exit | Admin closes browser / navigates to `/dashboard` manually |
| Session expiry | Supabase JWT expires (middleware catches on next request) → `requireAdmin()` → redirect to `/login` |
| View-as exit | POST `/api/admin/view-as/stop` → back to `/admin/users` |
| MFA downgrade | If AAL drops to aal1 mid-session → next page load → `requireAdmin()` → redirect to `/admin/mfa` |
| Role revoked | Remove `role: admin` from `auth.users.app_metadata` via SQL → next page load → `requireAdmin()` → 404 + security event |

---

## 9. Data Flow Summary

```
Browser request to /admin/*
        │
        ▼
Middleware (middleware.ts)
  └─ updateSession() → refreshes Supabase JWT cookie
        │
        ▼
(admin)/admin/layout.tsx
  ├─ requireAdmin() ──→ role check → MFA check
  ├─ getViewAsUserId() ──→ reads stk_admin_view_as cookie
  └─ getUserOverview(viewAsId) if cookie set
        │
        ▼
   Page Server Component
  ├─ requireAdmin() (again, defense-in-depth on detail + write pages)
  ├─ data queries via getAdminSupabase() [service-role, bypasses RLS]
  └─ renders page with action components
        │
        ▼
   Write Action (Server Action or form → API route)
  └─ runAdminAction()
       ├─ requireAdmin()
       ├─ assertNotViewAs()
       ├─ body() → mutation via getAdminSupabase()
       └─ recordAdminAction() [audit row, fire-and-forget]
```

---

## 10. Security Properties

- **404 not 403** for unauthorized access — hides the admin surface from enumeration
- **Double auth** — role checked in both layout and each write action
- **MFA (AAL2)** — required in production; TOTP via Supabase
- **View-as is read-only** — `assertNotViewAs()` blocks all mutations
- **View-as cookie is httpOnly** — client JS cannot forge or read it
- **All writes audited** — every action lands in `admin_actions` regardless of success or failure
- **Soft-delete only** — no hard deletes; billing history preserved for tax retention
- **DPDP data export** — `adminExportUserDataAction` bundles all user data, uploads to `user-exports` bucket with 24h signed URL
- **Email suppression fan-out** — soft-delete propagates to Crisp + Zoho for DPDP compliance
- **Security events** — `rls_guard_miss` recorded for any non-admin hitting `/admin/*`
