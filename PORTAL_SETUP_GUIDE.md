# Client Portal — Setup Guide

This guide walks you through configuring everything that ships in the
**Phase 0a (invoice payment restoration) + Phase 1 (Client Portal MVP)**
release. Total real-time setup is roughly **45 minutes**, most of which
is waiting on third-party providers (Razorpay KYC, R2 bucket
provisioning, DNS).

---

## Table of contents

1. [Overview of what shipped](#1-overview-of-what-shipped)
2. [Database migration](#2-database-migration)
3. [Cloudflare R2 — file storage](#3-cloudflare-r2--file-storage)
4. [Razorpay — invoice payment integration](#4-razorpay--invoice-payment-integration)
5. [Environment variables checklist](#5-environment-variables-checklist)
6. [Vercel cron jobs](#6-vercel-cron-jobs)
7. [Email senders & domain auth](#7-email-senders--domain-auth)
8. [Smoke tests](#8-smoke-tests)
9. [Operational notes](#9-operational-notes)
10. [Known follow-ups](#10-known-follow-ups)

---

## 1. Overview of what shipped

**Phase 0a — Invoice payment restoration**

- `invoices.send` now sets status to `sent` (not `paid`); receipts are
  only emailed AFTER the client pays.
- New per-freelancer Razorpay credentials in `user_profiles`
  (encrypted via pgcrypto).
- Public invoice page (`/i/<token>`) embeds Razorpay Checkout for the
  client; signature is verified server-side and the invoice flips to
  `paid` only when verification passes.
- Auto-receipt email with a fresh PDF attached.
- New daily cron that flips overdue invoices and sends polite
  reminders at days 1, 7, and 14 past due date.
- Settings → Payments page where the freelancer connects/disconnects
  their Razorpay key pair.

**Phase 1 — Client Portal**

- New schema: `portals`, `portal_members`, `portal_invitations`,
  `portal_files`, `portal_messages`, `portal_activity`,
  `portal_storage_usage`, `portal_notification_outbox`,
  `portal_contracts`, `portal_invoices`.
- Freelancer dashboard at `/dashboard/portal` to create / manage portals.
- Client-facing workspace at `/portal/<id>` with attached contracts,
  invoices (pay in place via the existing `/i/` flow), R2 file
  upload/download, and a comments thread.
- Email-based invitations with one-time SHA-256-hashed tokens.
- Plan-gated behind the `clients.portal` feature flag (Pro + Business).

---

## 2. Database migration

Apply the new migration:

```bash
npx supabase db push
```

This applies (in order):

1. `0023_invoice_payments.sql` — Razorpay credentials + payment
   attempts + encryption RPCs.
2. `0024_client_portal.sql` — every `portal_*` table, trigger, and RLS
   policy.

**Encryption key for invoice payment secrets.**
Migration `0023` reads the symmetric key from the `app.invoice_payment_secret_key`
Postgres GUC. The default is fine for development. For production:

```sql
-- Run once, in production, with a 32-byte random key.
ALTER DATABASE postgres SET app.invoice_payment_secret_key TO '<your-32-byte-base64-key>';
```

> Rotating this key requires re-encrypting every existing
> `razorpay_key_secret_enc` row. Treat the key like a static prod secret.

**Sanity check.** Open Supabase SQL editor and run:

```sql
SELECT count(*) FROM information_schema.tables WHERE table_name LIKE 'portal_%';
-- Expected: 10 rows.
```

---

## 3. Cloudflare R2 — file storage

Portal file uploads go directly to R2 from the browser. Vercel function
bandwidth is never used for file bytes.

### 3.1 Create the bucket

1. Sign in to <https://dash.cloudflare.com>.
2. **R2 → Create bucket** → name it e.g. `stackivo-portal-files`.
3. Default location: **Automatic**.
4. Skip public access settings — we mint short-lived presigned URLs
   instead.

### 3.2 Mint API credentials

1. **R2 → Manage R2 API Tokens → Create API Token**.
2. **Permissions:** Object Read & Write.
3. **Specify bucket:** scope it to the bucket created above (defence in
   depth — even if the key leaks, only this bucket is exposed).
4. **TTL:** Forever.
5. Copy the **Access Key ID** and **Secret Access Key**. Cloudflare
   shows the secret only once.

### 3.3 Find your account ID

It's on the right sidebar of the R2 overview page. 32-char hex string.

### 3.4 (Optional) Public CDN

If you want clean download URLs (`https://files.stackivo.in/...`)
instead of long presigned ones:

1. Bucket → **Settings → Public Access → Enable**.
2. Set up a Cloudflare Workers route or custom domain pointing to the
   bucket.
3. Set `R2_PUBLIC_BASE_URL=https://files.stackivo.in` in your env.

When `R2_PUBLIC_BASE_URL` is set, our code returns the public URL for
downloads. Without it, downloads use 5-minute presigned URLs (fine for
private workflows).

### 3.5 CORS for browser uploads

R2 needs a CORS rule allowing PUT from your app origin. Add via the
bucket's **Settings → CORS Policy**:

```json
[
  {
    "AllowedOrigins": ["https://app.stackivo.in", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Replace the production origin with your real domain. Without this, the
browser PUT will be blocked by CORS.

---

## 4. Razorpay — invoice payment integration

Stackivo never holds client money. Each freelancer connects their **own**
Razorpay account; we sign orders on their behalf and verify the payment
signature with their secret. Funds settle directly into their bank
account.

### 4.1 As Stackivo (platform-level)

Already configured for subscription billing in the existing
`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` envs. No new platform-level
Razorpay setup is needed for invoice payments.

### 4.2 As a freelancer (each user does this themselves)

1. Sign in to <https://dashboard.razorpay.com>.
2. **Account & Settings → API Keys** → generate a Key Id + Key Secret.
3. In Stackivo: **Settings → Payments**.
4. Toggle "Test mode" if pasting test keys; turn off for live keys.
5. Paste both, click **Connect**.

The settings page calls the test endpoint
(`GET /v1/customers?count=1`) once to verify the keys before saving
`razorpay_account_status='connected'`. The secret is encrypted at rest
with pgcrypto.

> **Webhooks are NOT required** for invoice payments — we use Razorpay's
> client-side `handler` callback + server-side HMAC verification. This
> sidesteps the per-tenant webhook problem entirely.

### 4.3 Razorpay test cards (sandbox)

When test mode is on, use:

| Card                | Number                 | OTP    |
| ------------------- | ---------------------- | ------ |
| Visa, success       | 4111 1111 1111 1111    | 123456 |
| Mastercard, failure | 5104 0600 0000 0008    | 123456 |
| UPI, success        | success@razorpay       | n/a    |

---

## 5. Environment variables checklist

Add to `.env.local` (dev) and your production secret store (Vercel env).
See `.env.example` for the canonical list.

**Required for Client Portal file uploads:**

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=          # optional; only if you set up the CDN
```

**Required for the overdue cron:**

```
CRON_SECRET=                  # already exists; re-use the same value
```

**Already set** (no changes needed):

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Stackivo-platform keys for
  subscription billing. Per-freelancer invoice keys are stored in the DB.
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` — used for invoice receipts and
  portal invitations.
- `NEXT_PUBLIC_APP_URL` — used to build invite-accept URLs.

**No env var = graceful degrade** for these:

- R2 unset → file upload UI hidden + amber notice rendered. Everything
  else (contracts, invoices, comments) still works.
- `R2_PUBLIC_BASE_URL` unset → falls back to presigned GET URLs.

---

## 6. Vercel cron jobs

The new overdue-invoice cron is registered in `vercel.json`:

```jsonc
{
  "path": "/api/cron/invoices-overdue",
  "schedule": "30 3 * * *"   // 09:00 IST daily
}
```

Verify in **Vercel Dashboard → Settings → Cron Jobs**.

The cron is idempotent:

- Marking an already-overdue invoice has no effect.
- Reminder emails use `idempotencyKey="invoice-reminder:<id>:d<N>"` so a
  re-run on the same day cannot duplicate a reminder.

To smoke-test locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/invoices-overdue
```

---

## 7. Email senders & domain auth

The portal invitation goes out from `share@stackivo.me`. The sender's
`reply-to` is set to the freelancer's profile email so client replies
land in the freelancer's inbox, not Stackivo's.

**SPF / DKIM / DMARC:**
Already configured for the existing senders. No changes for portals.

**New email templates** (live in `src/features/email/templates.ts`):

- `renderPortalInviteEmail` — sent on `invitePortalMemberAction`.

**New `DeliveryKind` values** registered in `src/lib/supabase/types.ts`:

- `portal_invite`
- `portal_digest` (reserved for the future digest worker; not yet wired)

---

## 8. Smoke tests

After deploy, walk through these in order. They cover both shipped
phases.

### 8.1 Invoice flow (Phase 0a)

1. **Connect Razorpay test keys** at Settings → Payments.
2. Create a draft invoice with line items.
3. **Send** the invoice — recipient's inbox shows email with PDF +
   "Pay invoice" link. Status in dashboard = **Sent**.
4. Open the public link. Page shows PDF preview + Razorpay Checkout
   panel.
5. Pay using the Visa test card (`4111 1111 1111 1111`).
6. Razorpay modal closes → page shows green "Payment received" state.
7. Within ~2s the invoice in the dashboard flips to **Paid** and the
   client's inbox receives a receipt PDF.
8. Force-refresh the public page — it now shows "This invoice has been
   paid".

### 8.2 Overdue cron (Phase 0a)

1. SQL: `update invoices set due_date = current_date - 8 where id = '<id>';`
2. Trigger the cron locally (see §6).
3. Invoice status flips to **Overdue**, freelancer gets an in-app
   notification, and the client receives a reminder email (8 days
   overdue triggers the day-7 reminder).

### 8.3 Portal create + invite (Phase 1)

1. **Sign in as the freelancer** (Pro plan or higher).
2. Visit `/dashboard/portal` → click **New portal** → name it
   "Acme Co. — Brand redesign".
3. On the detail page, **Invite** a client via email.
4. Open that email in another browser / incognito. Click "Accept
   invitation" → sign in (or sign up).
5. You're redirected into `/portal/<id>` with the role `client`.
6. As the client, post a comment. As the freelancer, refresh — the
   comment is visible in the same thread.

### 8.4 Portal files (Phase 1)

1. As the freelancer, upload a 2 MB image. Watch the `Uploading…`
   spinner → file appears in the list.
2. As the client, click the file → it downloads via a presigned URL.
3. As the client, delete the file you uploaded yourself (you cannot
   delete the freelancer's uploads — server-side guard).

### 8.5 Portal contracts + invoices (Phase 1)

1. As the freelancer, attach an existing contract to the portal (use
   the link to `/dashboard/contracts`, copy the contract id, then call
   the action via the SQL editor for now — UI for in-portal "attach"
   picker is a Phase-1.1 polish item).

   ```sql
   insert into portal_contracts (portal_id, contract_id, added_by)
   values ('<portal-id>', '<contract-id>', '<freelancer-user-id>');
   ```

2. Refresh the freelancer detail page → contract appears under
   **Contracts** with an "Open" button.
3. As the client, the same contract is visible. Clicking "Open" opens
   the existing `/c/<token>` signing flow.
4. Sign the contract → portal activity feed shows
   `contract.signed`.
5. Repeat for an invoice via `portal_invoices`. Pay from the portal
   → activity shows `invoice.paid`.

---

## 9. Operational notes

### 9.1 RLS-first defence in depth

Every portal table has RLS policies. The application code ALSO calls
`requirePortalAccess()` before any read/write — never trust RLS alone.
A regression in either layer is caught by the other.

### 9.2 Storage quota enforcement

The R2 presign endpoint does a SOFT check against the freelancer's
plan-level `storage_bytes` cap. The COMMIT endpoint does a HARD check
against the on-disk size returned by `HeadObject`. If the COMMIT fails
quota, the orphaned R2 object is deleted on a best-effort basis.

A periodic GC sweep for orphaned objects (uploads where COMMIT never
fires) is **not yet implemented**. Risk is low because presigned PUT
URLs expire in 5 minutes — orphans accumulate at most a few KB/day
during normal use.

### 9.3 Member revocation

`portal_members.revoked_at = now()` is the single source of truth.
Once set:

- RLS instantly excludes the row.
- Active session cannot read portal data on next request.
- Any in-flight presigned URLs expire in <5 min.

JWTs are NOT invalidated — the membership row is the gate.

### 9.4 Soft-delete grace period

`portals.deleted_at` is set on delete. The 30-day GC cron that purges
files + R2 objects is **flagged as a Phase-2 follow-up**. For now,
deleted portals are simply hidden from listings.

---

## 10. Known follow-ups

These were intentionally deferred from the MVP:

1. **In-portal "attach contract / invoice" picker UI.** Currently the
   freelancer clicks through to `/dashboard/contracts` or
   `/dashboard/invoices` to attach. Adding a modal picker on the
   portal detail page is ~80 LOC.
2. **Portal storage usage purge cron.** When a portal is hard-deleted,
   we currently leave R2 objects behind. Add a daily cron that walks
   `portals.deleted_at < now() - 30d` and `deleteObject()`s every
   `r2_key` for those portals, then `delete from portals` for real.
3. **Notification digest worker.** `portal_notification_outbox` rows
   are inserted but never drained — no email digests yet. Plan: a
   cron every 30 min that batches per-recipient.
4. **Realtime presence / typing indicators.** Out of scope for MVP.
   Use Supabase Realtime channels keyed on `portal:<id>` when added.
5. **Custom portal branding (logo + colour scheme).** Schema supports
   `brand_color` only. Adding `brand_logo_r2_key` + a Business-tier
   feature flag is the natural next step.
6. **PWA manifest for `/portal/*`.** A separate `manifest.json` so
   clients can "Add to home screen" their portal as a standalone app.
7. **Payment webhook fallback.** We rely on the client-side `handler`
   callback. If the user closes the tab AT the exact moment Razorpay
   captures the payment, the invoice stays "Sent" until manually
   reconciled. Adding a per-tenant webhook URL + secret is a hardening
   pass worth doing once volumes grow.

---

## Where things live (cheat-sheet)

| Thing                       | Path                                                              |
| --------------------------- | ----------------------------------------------------------------- |
| Migration                   | `supabase/migrations/0024_client_portal.sql`                      |
| Server module               | `src/features/portals/server.ts`                                  |
| Server actions              | `src/features/portals/actions.ts`                                 |
| Routes constants            | `src/features/portals/routes.ts`                                  |
| Unified portal view         | `src/features/portals/components/portal-view.tsx`                 |
| Create-portal dialog        | `src/features/portals/components/create-portal-button.tsx`        |
| Freelancer index page       | `src/app/(dashboard)/dashboard/portal/page.tsx`                   |
| Freelancer detail page      | `src/app/(dashboard)/dashboard/portal/[id]/page.tsx`              |
| Client layout               | `src/app/(portal)/layout.tsx`                                     |
| Client index                | `src/app/(portal)/portal/page.tsx`                                |
| Client portal page          | `src/app/(portal)/portal/[id]/page.tsx`                           |
| Invitation accept           | `src/app/(portal)/portal/accept/page.tsx`                         |
| File presign route          | `src/app/api/portals/[portalId]/files/presign/route.ts`           |
| File commit route           | `src/app/api/portals/[portalId]/files/commit/route.ts`            |
| File download route         | `src/app/api/portals/[portalId]/files/[fileId]/download/route.ts` |
| Overdue cron                | `src/app/api/cron/invoices-overdue/route.ts`                      |
| Invoice send action (fixed) | `src/features/invoices/delivery.ts`                               |
| Public invoice page         | `src/app/(public)/i/[token]/page.tsx`                             |
| Razorpay verify action      | `src/features/invoices/public-payment-actions.ts`                 |
| R2 client                   | `src/lib/r2/client.ts`                                            |
| Razorpay user-account helpr | `src/features/billing/razorpay/user-account.ts`                   |

---

**Done.** When all green-checked, you're production-ready for the
combined Phase 0a + Phase 1 release.
