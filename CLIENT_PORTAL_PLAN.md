# Client Portal — Production Planning Document

> Status: **Planning, not yet implemented**
> Owner: solo founder
> Target user: existing Pro-tier Stackivo customers + their clients
> Last updated: 2026-05-14

---

## 0. Executive summary (one page)

**What we're building.** A dedicated, premium-feeling, focused workspace where a freelancer's client can log in, **act on what's in front of them** — sign contracts, pay invoices, download files, leave comments — without needing email or WhatsApp. The portal is a *surface for action*, not a passive viewer.

**What we're NOT building.** Not Slack, not ClickUp, not Notion. No real-time chat in MVP. No multi-project Kanban. No video calls. No "team channels." If it doesn't make a single freelancer-client relationship feel more professional, it's out of scope.

**The three big architectural calls.**

1. **Storage: Cloudflare R2.** 10 GB free, **zero egress fees**, S3-compatible. Strictly better than Supabase Storage / Backblaze / S3 for our specific shape (clients downloading files often).
2. **Messaging: comments-only, no realtime.** Persistent threaded comments per portal, polled on load, refreshed on tab focus. Notifications via existing Resend + in-app bell. Realtime is a Phase 3 upgrade, not MVP.
3. **Auth: clients reuse Supabase Auth.** Each client is a real Supabase user with `role='client'` in `app_metadata`. Reuses our entire auth stack. Cheap, secure, RLS-friendly.

**Plan gating.** Pro plan only. Hard quotas: 5 portals, 5 GB total portal storage, 3 active client logins per portal. New "Studio" tier later for those who outgrow it.

**Solo-founder feasibility.** ✅ Plausible in 4–6 focused weeks. Combined release (invoice-flow restoration + portal MVP) ships in ~18 working days. No new infrastructure to operate beyond Cloudflare R2 (hands-off). The interactive surfaces *reuse* the restored Razorpay invoice-payment pipeline + existing contract signing flow — no duplicate legally/financially sensitive code paths.

**Prerequisite: Invoice flow restoration (Phase 0a).** Auditing the codebase before this plan shipped revealed the existing `sendInvoiceAction` is misbehaving — it marks every sent invoice `paid` immediately and emails a receipt-style template. The proper send-as-due → public payment page → webhook-marks-paid → auto-receipt pipeline is **missing or collapsed**. We restore it as Phase 0a (~6 working days), which then becomes the engine the portal's "Pay invoice in-portal" feature plugs into. Decision (locked): ship 0a + portal together as a single "Stackivo Portals" launch.

**Risks that worry me most.** (1) Storage cost runaway from clients downloading large files — mitigated by R2's $0 egress + hard quotas. (2) Auth-context bug in the in-portal contract/invoice actions that lets a wrong user sign or pay — mitigated by reusing the *restored* Phase 0a payment core + the existing signing core unchanged + e2e Playwright tests covering the sign + pay + revoked-mid-action paths. (3) Combined release blast radius — mitigated by feature-flagging the portal at the route layer so 0a can be hot-fixed independently if anything regresses.

---

## 0a. Prerequisite — Invoice flow restoration

This section is *self-contained* — the work below ships regardless of the portal and is a pure bug-fix + feature-restoration on the existing invoice subsystem. The portal's "Pay invoice in-portal" feature in §6b plugs into this engine, not a parallel one.

### 0a.1 Current state (the bug)

`@/src/features/invoices/delivery.ts` exposes a single `sendInvoiceAction` whose behaviour is:

1. Renders the email body using `renderInvoicePaidEmail` — the **paid-receipt** template.
2. Sends to client with PDF attached.
3. On successful dispatch, sets `invoices.status = 'paid'` and `sent_at = now()`.
4. Writes an activity row titled "Paid invoice X emailed".

**Net effect:** every invoice you send is treated as already-paid, regardless of whether the client has paid. The activity log + notifications + dashboard counts are all wrong by design.

What's missing:
- A "send-as-due" path that emails the invoice with a "Pay now" link and **does not** mark it paid.
- A working `/i/[token]` public payment page (the route exists but returns `notFound()`).
- Razorpay integration scoped to *client invoices* (Razorpay is currently wired only for Stackivo's own subscription billing).
- A webhook handler that flips `invoices.status='paid'` on Razorpay payment success.
- An auto-receipt email triggered from that webhook.
- Status-transition activity ("Acme paid invoice INV-007").

The schema already supports the right model — `public_token`, `payment_status`, `payment_link`, `payment_method`, `payment_reference`, `payment_amount`, `payment_recorded_at`, `paid_at`, `viewed_at`, `sent_at` all exist on `invoices`. **The repair is application-level.**

### 0a.2 Target flow

```
Freelancer → "Send invoice" → status: sent (not paid)
                ↓
        Client receives email with /i/[token] link + PDF attached
                ↓
        Client opens /i/[token] → status: viewed (first-time only)
                ↓
        Client clicks "Pay ₹X now" → Razorpay checkout
                ↓
        Razorpay webhook fires payment.captured (notes.invoice_id)
                ↓
        Webhook handler: status=paid, paid_at=now,
                         payment_amount, payment_reference,
                         activity log, notify freelancer
                ↓
        Auto-receipt email sent to client with paid PDF attached
```

Three actor entry points, one shared state machine. The portal's in-portal pay flow (§6b) hooks in at "Razorpay checkout" — same downstream pipeline.

### 0a.3 New & repaired surfaces

| Component | Action |
| --- | --- |
| `sendInvoiceAction` in `delivery.ts` | **Rename** to `sendInvoiceReceiptAction` (preserve as the "thank you for paying" path). |
| `sendInvoiceDueAction` (new) | Send invoice as `sent` (not paid). Email uses new `renderInvoiceDueEmail` template with the `/i/[token]` payment link. |
| `renderInvoiceDueEmail` (new) | Email template: amount, due date, line summary, prominent "Pay ₹X" CTA → `/i/[token]`, plain-text fallback. |
| `/i/[token]/page.tsx` | Replace stub. Render invoice (line items, totals, GST split, business info), Razorpay button, download-PDF link. Tracks `viewed_at` on first load. |
| `createInvoicePaymentOrder()` server action | Creates a Razorpay order against an `invoices` row. Reuses the existing Razorpay SDK helper but writes to invoice tables (not subscription tables). Sets `notes.invoice_id` for webhook routing. Idempotent on `payment_reference`. |
| `markInvoicePaidFromWebhook()` | Called from the Razorpay webhook handler when `payment.captured` carries `notes.invoice_id`. Updates status, fires receipt email, records activity, fires notification. |
| Webhook handler at `@/src/app/api/billing/razorpay/webhook/route.ts` | Branch on `notes.invoice_id` vs `notes.subscription_id`. Reuses existing signature-verification helper. |
| `markInvoicePaidManualAction` | Existing flow stays — for offline payments the freelancer can mark paid manually. |
| Overdue cron | New nightly job: invoices where `due_date < now() AND status='sent'` → `status='overdue'` + freelancer notification. |

### 0a.4 Idempotency & safety

- Razorpay webhook may fire multiple times for the same payment (network retries). Handler checks `payment_reference IS NULL OR payment_reference != event.id` before mutating. If already-paid, no-op.
- Manual mark-as-paid + webhook race: serialise via `UPDATE ... WHERE status != 'paid' RETURNING *`. First writer wins.
- Receipt email is fired *only* on the transition `sent → paid` or `viewed → paid`, never on `paid → paid`. Implemented as a side-effect of the conditional update — no double receipts.
- Test flag `INVOICE_PAYMENTS_TESTMODE` env: if set, signs orders with Razorpay test keys and labels emails "[TEST]" so we don't ship a half-broken receipt to a real client during dev.

### 0a.5 Per-Pro-user payment account

Razorpay currently has a single Stackivo-owned account collecting subscription payments. **Client invoices need to settle into the freelancer's account, not ours.** Two paths:

- **Path A — Stackivo as merchant of record (collect-and-disburse).** Simpler integration, but we'd be on the hook for tax + payouts + KYC. Not viable for a solo founder.
- **Path B — Freelancer connects their own Razorpay account (recommended).** Each freelancer pastes their Razorpay key/secret in `/dashboard/settings/billing`. We sign orders with their keys. Stackivo never holds client money.

**Decision:** Path B. Phase 0a includes a settings page where the freelancer enters their Razorpay credentials. Stackivo stores them encrypted (Supabase pgcrypto) per-user. Webhook URL is unchanged; we route incoming events by `account_id` lookup → user → invoice.

This is the only way Phase 0a is viable for a solo founder — we cannot become a money-holder.

### 0a.6 Day-by-day deliverables

| Day | Deliverable |
| --- | --- |
| 0a-1 | DB migration: add `user_profiles.razorpay_key_id`, `razorpay_key_secret_enc`, `razorpay_account_status`. Settings UI for the freelancer to paste + verify Razorpay credentials. |
| 0a-2 | `sendInvoiceDueAction` + `renderInvoiceDueEmail` + rename of legacy receipt action. Update all dashboard call sites. Activity + notification copy fixed. |
| 0a-3 | `/i/[token]` public page: render invoice, totals, "Pay now" button, download-PDF link, viewed_at tracking. |
| 0a-4 | `createInvoicePaymentOrder()` server action + Razorpay checkout button on `/i/[token]`. End-to-end test in Razorpay test mode. |
| 0a-5 | Webhook branch for `notes.invoice_id` → `markInvoicePaidFromWebhook()` → status flip + activity + notification + auto-receipt email with paid PDF. Idempotency verified. |
| 0a-6 | Overdue cron, polish, e2e Playwright covering create → send-as-due → view → pay (test mode) → receipt arrives → status=paid in dashboard. Settings page UX hardened (test-mode toggle, "Verify keys" button). |

### 0a.7 Open question for Phase 0a

- **PDF "PAID" stamp on the receipt.** Phase 0a treatment: simple top-right red "PAID" overlay added to the existing `InvoicePdf` component. Phase 2 (post-portal): proper paid-receipt PDF with a separate header. Acceptable to ship 0a with the simple stamp.

---

## 1. Product scope definition

### 1.1 Job-to-be-done

> "I'm a freelancer juggling 4 clients across email, WhatsApp, Drive, and Stackivo invoices. I look unprofessional. My clients lose files. I waste 30 minutes a week on 'where's that thing you sent?' My clients don't trust where their data lives."

The portal solves *exactly* that. Nothing more.

### 1.2 In-scope behaviour (the 80%)

| Capability | Freelancer side | Client side |
| --- | --- | --- |
| Auth | Existing Stackivo login | Email + password OR magic link |
| Portal creation | One per client | N/A — invite-only |
| File sharing | Upload, organise, delete | View, download, upload |
| **Contracts (interactive)** | Send to portal, see signing status | **View, sign in-portal**, download signed PDF |
| **Invoices (interactive)** | Send to portal, see payment status | **View, pay in-portal via Razorpay**, download receipt |
| Comments | Reply, mention | Reply, mention |
| Activity feed | "Asha uploaded design-v2.pdf"; "Acme signed the SOW" | Same, scoped |
| Notifications | Email digest + in-app bell | Email per event + in-app bell |
| Mobile / PWA | Yes (existing PWA shell extended) | Yes |
| Revoke access | Per-client toggle, instant | N/A |

### 1.3 Out-of-scope (explicit, ruthless)

- **Multi-user freelance teams.** One owner per portal. Agency/team support = separate future phase.
- **Realtime chat / typing indicators / presence.** Comments only. No "online now" dot.
- **Per-project portals.** One portal per *client* in MVP. Multiple projects show as sections, not separate workspaces.
- **Public share links.** Files are accessed by logged-in clients only. (Phase 3 if asked for.)
- **Approvals / e-sign / signoffs.** Defer to Phase 2. Approvals can be modelled as a comment with a button later.
- **Video / voice calls / screen recordings.** Use Loom links if needed.
- **Custom domain / white-label.** Phase 4 (Studio tier).
- **Mobile native app.** PWA is the answer.
- **Multiple clients per portal.** Schema supports it via `portal_members`, but UI ships with 1:1 first.

### 1.4 Success metrics

- ≥ 30% of Pro customers create at least one portal in first 90 days.
- ≥ 50% of clients invited log in at least once.
- < 1% of portals exceed storage quota in first 6 months (signal that quotas are sized right).
- Portal-attributed Pro upgrades > 10% of Pro upgrades within 6 months.

---

## 2. MVP vs future features

### Phase 1 — MVP (target: ~13 working days)

1. Database schema (portals, members, files, messages, activity, attachments).
2. Freelancer can create a portal, invite a client by email.
3. Client receives email, sets password, lands on `/portal/<id>`.
4. File upload to R2 with signed URLs (drag-drop, ≤ 25 MB per file MVP).
5. **Contracts: interactive.** Freelancer attaches a contract to the portal; client opens it inline (reusing the existing `/c/<token>` signing component) and signs. Status updates in both views in real-time on next refresh.
6. **Invoices: interactive.** Freelancer attaches invoices; client clicks "Pay now" inline, Razorpay checkout opens, payment status updates. Reuses existing public invoice + Razorpay flow.
7. Threaded comments (one thread per portal in MVP).
8. Notification: email + in-app bell on file uploaded, comment posted, contract signed, invoice paid.
9. Activity feed (server-rendered list, last 50 events).
10. Plan gate: Pro-only. Hard quotas enforced server-side.
11. Revoke access toggle. Hard delete on portal deletion (with 30-day grace).

### Phase 2 — Activation polish (1–2 weeks after Phase 1 ships)

11. **Per-project sections** within a portal (not separate portals — sections grouping files / comments / invoices).
12. **Approvals**: freelancer attaches "Awaiting approval" tag to a file or message. Client clicks ✓ or ✗. Records in activity feed.
13. **Onboarding tour** for first-time clients (one-time tooltip walkthrough).
14. **Bulk file upload**, ZIP download of folders.
15. **Brand customisation** (logo + accent colour on portal home).

### Phase 3 — Scale & polish (1+ month later)

16. Lightweight realtime via Supabase Realtime (presence + new-message broadcast).
17. Per-portal share links (`/p/<token>`) for one-off public deliverables.
18. Mobile push (PWA push API + VAPID).
19. File preview (PDF inline, images inline) — currently via download.

### Phase 4 — Monetisation expansion

20. Studio tier with: unlimited portals, 50 GB storage, 10 clients/portal, custom domain, white-label.
21. Storage add-on packs (₹199 / 25 GB / month).
22. Per-portal analytics for the freelancer ("Client opened invoice 3 times").

---

## 3. UX architecture

### 3.1 URL structure

```
/dashboard/portals                  # Freelancer: list of all portals
/dashboard/portals/new              # Freelancer: create portal
/dashboard/portals/[id]             # Freelancer's view of a specific portal

/portal                             # Client: list of all portals they belong to
/portal/[id]                        # Client: their portal home
/portal/[id]/files
/portal/[id]/contracts                 # List of attached contracts with status pills
/portal/[id]/contracts/[contractId]    # Inline signing surface (reused component)
/portal/[id]/invoices                  # List of attached invoices with status pills
/portal/[id]/invoices/[invoiceId]      # Inline invoice + "Pay now" Razorpay button
/portal/[id]/comments
/portal/[id]/activity
```

The `/portal/*` route group has its own layout: minimal nav, no Stackivo product chrome, no marketing footer. The freelancer's `/dashboard/portals/[id]` view uses the standard dashboard chrome + a "Switch to client view" preview button.

### 3.2 Information architecture (client view)

```
Top: Project name + Freelancer name + brand colour bar
Tabs:  Overview · Files · Invoices · Contracts · Comments · Activity
Right: Storage used (X / Y GB)  ·  Last activity badge
```

Hierarchy is FLAT. No nested folders. No sub-pages. One scroll = one job.

### 3.3 Mobile

- Tabs collapse into a top sheet.
- File upload via system file picker (`<input type=file>`), no fancy drop zone.
- Comments use existing mobile-optimised input.
- PWA installable from `/portal/[id]` after first visit.

### 3.4 Design language

Inherit Stackivo's existing premium-but-restrained design system. The portal is **deliberately calmer than the dashboard** — fewer KPI cards, more whitespace. Lean into "this client looks at this maybe weekly."

---

## 4. Architecture diagram (text)

```
┌─────────────────┐         ┌─────────────────┐
│  Freelancer UI  │         │   Client UI      │
│  (/dashboard/*) │         │   (/portal/*)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └─────────┬─────────────────┘
                   │  Next.js (Vercel)
                   │
         ┌─────────▼──────────┐
         │  Server Actions /  │
         │  API Route Handlers│
         └─────────┬──────────┘
                   │
       ┌───────────┼───────────────────────┐
       │           │                       │
┌──────▼──┐  ┌─────▼───────┐  ┌────────────▼────┐
│Supabase │  │ Supabase    │  │ Cloudflare R2   │
│  Auth   │  │ Postgres    │  │ (file storage)  │
│         │  │ (data + RLS)│  │ presigned URLs  │
└─────────┘  └──────┬──────┘  └────────┬────────┘
                    │                   │
                    │                   ▼
                    │          ┌─────────────────┐
                    │          │ Cloudflare CDN  │
                    │          │ (free, in front │
                    │          │  of R2)         │
                    │          └─────────────────┘
                    ▼
            ┌──────────────┐
            │ Resend       │ (existing transactional email)
            │ + PostHog    │ (existing analytics)
            └──────────────┘
```

**No new operational layer.** No queue, no Redis, no WebSocket server, no Lambda, no separate microservice. Every box already exists or is a managed-no-ops add-on.

---

## 5. Authentication & authorization

### 5.1 Client identity

**Decision: clients are real Supabase Auth users with `app_metadata.role = 'client'`.**

Rationale:
- Reuses every line of auth code (login, password reset, email verification, MFA).
- RLS policies can read `auth.jwt() ->> 'role'` directly.
- Future Studio tier ("client logs in via SSO") just adds another auth provider — no new identity model.
- Failure mode: a client tries to "sign up" as a freelancer. Mitigation: `/signup` checks `app_metadata.role` and rejects clients (they can't self-promote).

Rejected alternatives:
- **Magic-link only** (no password): too fragile when corporate clients have aggressive email filters. Used as a fallback, not the default.
- **Separate `client_users` table** (parallel auth): doubles the surface area, kills RLS reuse. Hard no.

### 5.2 Invitation flow

```
Freelancer clicks "Invite client" → enters email + name
  ↓
Server: insert pending portal_invitation row (token, expires=7d)
  ↓
Server: send invitation email via Resend with /portal/accept?token=...
  ↓
Client clicks link → sets password (or signs in if account exists) → portal_member row created → invitation marked accepted
```

Token is single-use, expires in 7 days, stored hashed (sha256) in DB. Re-invitable.

### 5.3 Authorization model

**Two principal types, two scopes.**

| Principal | Can access |
| --- | --- |
| Freelancer | Any portal where `portals.owner_user_id = auth.uid()` |
| Client | Any portal where `portal_members.user_id = auth.uid() AND revoked_at IS NULL` |

Enforced at three layers (defence in depth):
1. **Server actions** — explicit `requirePortalAccess(portalId, role?)` guard before any read/write.
2. **Postgres RLS** — every portal_* table has `USING` clause referencing `auth.uid()` and the membership join.
3. **R2 access** — files only ever served via short-lived presigned URLs (5-minute TTL) issued by the server after the auth check.

### 5.4 Revocation

`portal_members.revoked_at = now()`. RLS instantly excludes the row. Active sessions cannot read; pending presigned URLs expire within 5 minutes. **No need to invalidate JWTs** — the membership row is the gate, not the token.

### 5.5 Edge cases

- **Client belongs to portals from multiple Stackivo freelancers.** Supported by design — `portal_members` is N:M.
- **Client deletes their account.** Soft-delete: their membership rows stay (with revoked_at) for 30 days for audit, then anonymised. Freelancer sees "Former client" placeholder.
- **Freelancer deletes the portal.** Hard-delete the portal + cascade members + R2 keys. 30-day grace period via `deleted_at` flag (not actually purged) before R2 cleanup batch job.

---

## 6. File storage architecture

### 6.1 The decision: **Cloudflare R2 + Cloudflare CDN in front**

**Why R2 wins for our shape:**

| Provider | Free storage | Egress (to client downloads) | API | Operational |
| --- | ---: | --- | --- | --- |
| **Cloudflare R2** | **10 GB** | **$0 forever** | S3-compatible | Hands-off, generous limits |
| Backblaze B2 | 10 GB | 3× monthly storage free, then $0.01/GB | S3-compatible | Hands-off |
| Supabase Storage | 1 GB (free tier) | Counts toward Supabase egress | Built-in | Hands-off but expensive at scale |
| AWS S3 | 5 GB (12 months only) | $0.09/GB | S3 | Heavy |
| UploadThing | 2 GB | Bundled but capped | Easy DX | Vendor-locked, expensive |

The clinching factor is **egress**. A client portal is a download-heavy workload — clients open the same PDF 3-4 times. With S3 / Supabase, every re-download costs money. With R2, **download traffic is free for the lifetime of the file**. That's a structural cost moat.

Cloudflare CDN sits in front of R2 (free, automatic via custom domain binding) → globally fast file delivery, especially for image/PDF previews.

### 6.2 Upload flow (presigned PUT)

```
1. Client picks file → JS computes file hash + size
2. POST /api/portals/[id]/files/sign with name+size+mime
3. Server: validate quota, validate mime, validate size limit (25 MB MVP),
           generate R2 key = `portals/{portal_id}/{uuid}-{filename}`,
           return presigned PUT URL (10-min TTL)
4. Client: PUT direct to R2 (no server bandwidth used)
5. Client: POST /api/portals/[id]/files/commit with R2 key + size
6. Server: insert portal_files row, update portal_storage_usage,
           emit activity event, send notifications
```

**Critical:** the server NEVER proxies file uploads — direct browser → R2 PUT. Vercel function memory + execution time stays cheap.

### 6.3 Download flow (presigned GET)

```
1. Client clicks "Download X.pdf"
2. GET /api/portals/[id]/files/[fileId]/download
3. Server: auth check + RLS check
4. Server: generate presigned GET URL (5-min TTL) via Cloudflare CDN domain
5. 302 redirect to that URL
```

CDN URL means the file is served from edge, not from R2 directly → fast + free.

### 6.4 Quota enforcement

`portal_storage_usage` table holds `total_bytes` and `file_count` per portal. Updated transactionally with file insert/delete (Postgres trigger). Hard cap: server checks before issuing presigned URL. Soft warning at 80%.

Plan-level cap: sum of `total_bytes` across all portals owned by user must be ≤ plan limit (5 GB Pro, 50 GB Studio future). Computed on-demand from `portal_storage_usage` aggregate; cached on `user_profiles.lifetime_portal_bytes`.

### 6.5 Per-file limits

- MVP: 25 MB per file (covers 95% of design files, contracts, photos).
- Phase 2: 100 MB (multi-part upload required).
- MIME whitelist: PDF, images, common docs (DOCX, XLSX, PPTX), ZIP, plain text. Block executables, JS, HTML.
- Size enforced both at presign time (header) and at commit time (HEAD request to R2).

### 6.6 File lifecycle

| Event | What happens |
| --- | --- |
| Upload | Row inserted, R2 key created, activity event logged. |
| Download | Activity event logged (used for "Client opened X" Phase 3). |
| Delete (soft) | Row marked `deleted_at`, R2 key kept for 30 days. |
| Delete (hard, batch) | Nightly job purges R2 keys where `deleted_at < now() - 30 days`. |
| Portal deleted | Cascade soft-delete all files. R2 keys purged on the same 30-day cycle. |
| User deleted | All owned portals soft-deleted on the same path. |

### 6.7 Security

- **Antivirus**: out of scope MVP. Phase 2: ClamAV via Cloudflare Worker, or skip and rely on browser sandbox.
- **Public access**: never. Even "share links" Phase 3 use signed URLs with longer TTL.
- **Encryption**: R2 server-side AES-256 by default. TLS in flight.
- **CORS**: presigned URLs scoped to `stackivo.me` and `portal.stackivo.me` (or whatever portal subdomain we choose).

### 6.8 What if R2 fails?

R2 is eventually consistent across regions, but for our usage (single-tenant uploads/downloads) it's strongly consistent. Cloudflare's R2 SLA is 99.9% (free) / 99.95% (paid). For a freelancer client portal, this is acceptable. If a freelancer reports a missing file, support flow opens a Cloudflare ticket. We don't need a multi-cloud fallback at MVP.

---

## 6b. Interactive surfaces architecture (contracts + invoices)

The portal's defining promise is *action*, not viewing. Two action surfaces ship in MVP: contract signing and invoice payment. Both reuse code already in production for our public token-based flows (`/c/<token>` for contract signing, `/i/<token>` for invoice payment).

### 6b.1 Design principle: reuse, don't rebuild

We already have (or are restoring in Phase 0a):
- ✅ A complete contract signing flow in `@/src/features/contracts/public-actions.ts` and the `/c/<token>` page (existing, untouched).
- 🛠️ The proper send-as-due → public payment → webhook → auto-receipt invoice pipeline (built in Phase 0a — see §0a). The `/i/<token>` page + `createInvoicePaymentOrder()` + webhook handler are the engine.

Building separate signing/payment UIs *inside* the portal would mean two copies of legally and financially sensitive code. **Hard no.** Instead:

- **Contracts:** the portal renders the *same* signing component used at `/c/<token>`, but skips the token-only auth path because the client is already authenticated as a `portal_member`. Authorization comes from portal membership, not the token.
- **Invoices:** the portal renders the same Razorpay checkout component used at `/i/<token>`. Same `createInvoicePaymentOrder()` server action, same webhook, same `markInvoicePaidFromWebhook()` confirmation logic, same auto-receipt fan-out. Only difference: auth is portal membership instead of token possession, and Razorpay's `notes.portal_id` is also set so the activity feed records "Acme paid via portal" vs "Acme paid via public link".

### 6b.2 Junction tables (link existing entities to portals)

```sql
CREATE TABLE portal_contracts (
  portal_id    uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  contract_id  uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  added_at     timestamptz DEFAULT now(),
  added_by     uuid NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY (portal_id, contract_id)
);

CREATE TABLE portal_invoices (
  portal_id    uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  invoice_id   uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  added_at     timestamptz DEFAULT now(),
  added_by     uuid NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY (portal_id, invoice_id)
);
```

The freelancer "attaches" an existing contract or invoice to a portal. The contract / invoice itself is unchanged — it just becomes visible to the portal's members.

### 6b.3 Authorization model — the critical bit

Existing `/c/<token>` and `/i/<token>` flows authenticate the *signer/payer* by **possession of the token**. In-portal, that's not how we want it — we want **portal membership** to be the auth signal so:
- Tokens never appear in browser URLs (no leaking via screenshare or paste).
- A revoked client immediately loses signing/payment capability.
- The audit trail reads "Asha (acme@…) signed via portal" rather than "anonymous via token".

Implementation:
- A new server action `signContractFromPortal({ portalId, contractId, signature })` — checks `requirePortalAccess(portalId, 'client')`, then internally calls the existing contract-signing path with a synthetic auth context that records the actual `auth.uid()` as the signer.
- Same for invoices: `payInvoiceFromPortal({ portalId, invoiceId })` — issues a Razorpay order scoped to the authenticated portal member, not via the public token.

The token-based public flows continue to work in parallel for clients who never set up a portal — no breaking changes to the existing system.

### 6b.4 Status sync

Contract and invoice status (`signed_at`, `paid_at`) lives in the existing tables. The portal reads these directly via joins. No duplication. When status changes:

1. Existing webhook / signing handler fires (no change).
2. A trigger or after-insert hook writes a `portal_activity` row of type `contract.signed` / `invoice.paid` if the entity is attached to any portal.
3. Notifications fan out as usual (email + in-app bell).

This is the cleanest design: the portal is an *observer* of the underlying contract/invoice domain, not a parallel implementation.

### 6b.5 UI / UX pattern

```
/portal/[id]/contracts                # List of attached contracts with status pills
/portal/[id]/contracts/[contractId]   # Inline signing surface (reuses existing component)

/portal/[id]/invoices                 # List of attached invoices with status pills
/portal/[id]/invoices/[invoiceId]     # Inline invoice + "Pay now" Razorpay button
```

For both, the page is **server-rendered with the existing component embedded** — no iframe, no popup. Just a route inside `/portal/*` that mounts the same React component our public flows already use, wrapped in a portal-aware auth guard.

After signing or paying, the user lands back on `/portal/[id]/contracts` (or `/invoices`) with a fresh status. The activity feed records the event. The freelancer's dashboard updates on next refresh. No realtime needed — the action itself is the page navigation.

### 6b.6 Edge cases

- **Client signs a contract while access is being revoked.** Last-write-wins; the signing transaction checks `revoked_at IS NULL` at the moment of insert. If revoked first, the client gets a "Access revoked" page on next request.
- **Razorpay webhook arrives after client closes the portal tab.** Standard flow — webhook updates `invoices.paid_at`; the next portal page load sees the green "Paid" pill. Email confirmation already fires from the existing webhook handler.
- **Contract was already signed via public link before being attached.** Portal renders it as "Signed on <date>" — no signing UI, just download.
- **Same contract attached to multiple portals.** Schema allows it (rare, but possible if the freelancer has overlapping clients on a single SOW). Status is shared since it's one underlying contract.

### 6b.7 Why this is the *right* shape, not just convenient

A passive portal (read-only contracts/invoices with "click here to sign elsewhere") fails the core promise. Every "click here" is a context switch — the moment we lose the client to a separate domain or email link, the portal's value evaporates. Keeping signing + paying *inside* the portal is what makes the freelancer look professional and turns "I'll do it later" into "let me sign it now while I'm here."

It's also the cheapest possible way to ship a "premium feature" — we're not building new flows, we're giving existing flows a unified home.

---

## 7. Messaging architecture

### 7.1 Decision: **comments-first, no realtime in MVP.**

Reasoning:
- A client visits the portal maybe 2–3 times per project. They don't need typing indicators.
- A freelancer wants asynchronous, deliberate communication, not "ping me back!" Slack vibe.
- Real-time WebSockets cost operational complexity + monthly $$ on most managed services. Supabase Realtime is free at our scale but every connection is a vector for bugs.
- Comments + email notifications + in-app bell **already feels professional** for this use case (see Notion comments, Figma comments — neither is "realtime" in the chat sense, both are excellent).

### 7.2 Data model

```
portal_messages (
  id uuid PK,
  portal_id uuid FK,
  parent_id uuid NULL FK self,  -- threading (1 level deep)
  author_id uuid FK auth.users,
  body text NOT NULL,           -- markdown subset (bold, italic, link, code)
  attachments jsonb NULL,       -- [{file_id, name}, ...]
  created_at timestamptz,
  edited_at timestamptz NULL,
  deleted_at timestamptz NULL
)
```

One thread per portal in MVP. Threading is supported by the schema (`parent_id`) but deferred from UI to Phase 2 to keep mental model tiny.

### 7.3 Refresh strategy

- On page load: fetch last 50 messages.
- On tab focus: refetch (cheap, Postgres can do thousands/sec).
- After posting: optimistic insert + refetch.
- **No polling timer.** Don't burn battery / quota.
- Phase 3: subscribe to Supabase Realtime channel `portal:<id>` for INSERT events. ~10 lines of code at upgrade time.

### 7.4 Notifications

- **Email** via existing Resend on every message *to the OTHER party*. Throttled: at most one email per recipient per portal per 5 minutes (digest the rest).
- **In-app bell** already exists in Stackivo nav — extend its event types to include `portal.message.created`, `portal.file.uploaded`, etc.
- **No SMS, no push notifications** in MVP. Push is Phase 3.

### 7.5 Mentions & permissions

- `@<name>` autocomplete shows portal members only.
- Mentioned user gets an *additional* email regardless of throttle.
- Soft moderation: any party can edit/delete their own messages within 15 minutes; afterwards "edited" history stored.

### 7.6 Why this scales

At 1,000 active portals × 5 messages/week = 5,000 inserts/week → trivial for Postgres. No pre-emptive sharding. Storage: 1 KB avg × 5,000 = 5 MB/week → free-tier indefinitely.

---

## 8. Notification system

We already have an in-app notification bell + Resend integration. Extend, don't rebuild.

### 8.1 Event types

| Event | Recipient | Email? | In-app? |
| --- | --- | --- | --- |
| `portal.invited` | Client | Yes | N/A (no account yet) |
| `portal.message.created` | Other party | Yes (throttled) | Yes |
| `portal.file.uploaded` | Other party | Yes (digested) | Yes |
| `portal.file.downloaded` | Freelancer | No (Phase 3 toggle) | Yes |
| `portal.contract.attached` | Client | Yes | Yes |
| `portal.contract.signed` | Freelancer | Yes (immediate, never throttled) | Yes |
| `portal.invoice.attached` | Client | Yes | Yes |
| `portal.invoice.viewed` | Freelancer | No | Yes |
| `portal.invoice.paid` | Freelancer | Yes (immediate, never throttled) | Yes |
| `portal.access.revoked` | Client | Yes | N/A (lost access) |

### 8.2 Throttling / digesting

- Per-portal, per-recipient, per-channel: ≤ 1 email per 5 minutes. Bundle queued events into one digest email.
- Implementation: a tiny `notification_outbox` table + a Postgres-cron job (Supabase Edge Function on a 2-min schedule) that drains it.

### 8.3 Preferences

Phase 1: hard-coded (sensible defaults).
Phase 2: per-portal, per-event-type toggles in client settings.

---

## 9. Activity feed

`portal_activity` table records every meaningful event. It's the source of truth for both the in-portal "Recent activity" list AND the digest emails.

```
portal_activity (
  id uuid PK,
  portal_id uuid FK,
  actor_id uuid FK auth.users,
  type text NOT NULL,        -- enum: file.uploaded, message.posted, ...
  payload jsonb NOT NULL,    -- type-specific
  created_at timestamptz
)
```

Append-only. Indexed on `(portal_id, created_at DESC)`. Capped retrieval: last 200 events per portal in UI; full history queryable for export (Phase 3).

This single table also unifies the "notification" model — every notification fan-out reads from `portal_activity`.

---

## 10. PWA architecture

We already ship a PWA shell. To extend:

1. Add `/portal/manifest.json` with portal-specific name, icon, scope = `/portal/`.
2. Service worker cache strategy:
   - **Network-first** for `/portal/[id]/messages` (always want freshest).
   - **Cache-first with revalidation** for files index, invoice list.
   - **Cache-only** for the app shell + branding.
3. Hide the existing PWA install prompt on `/portal/*` if the user is anon (they're already in an invitation flow). Show a portal-specific install prompt 3 days after first portal visit.
4. iOS: add the meta tags for "Add to Home Screen" with portal name + icon.
5. Notification permission: deferred to Phase 3.

**No native app.** PWA is the answer for the next 2 years. If a client demands native, they're not our customer.

---

## 11. Monetization & plan gating

### 11.1 Tier structure

| Tier | Portals | Storage (total) | Clients/portal | File size cap |
| --- | --- | --- | --- | --- |
| **Free** | **0** (cannot use feature) | — | — | — |
| **Pro** | 5 | **5 GB** | 3 | 25 MB |
| **Studio** (Phase 4) | Unlimited | 50 GB | 10 | 100 MB |

Storage is a soft barrier (warn at 80%) and a hard one (cannot upload at 100%). Number of portals is hard from day 1.

### 11.2 Upgrade triggers

- Free user clicks "Add client portal" → modal: "Client portals are a Pro feature. [See pricing]".
- Pro user hits 5 portals → "You've reached your portal limit. Studio tier is coming — [join waitlist]."
- Pro user hits 80% storage → in-portal banner + email: "You're using 4.1 GB / 5 GB."

### 11.3 Cost protection

The 5 GB Pro cap × theoretical 100% R2 storage cost ($0.015/GB-month) = $0.075/month per maxed-out Pro user, with **zero egress**. Total infra cost per Pro user including Supabase + Vercel allocation: probably < ₹15/month at scale. Pro is ₹499/month → **97% gross margin** even on storage-heavy users.

### 11.4 Why not a per-portal price?

- Friction: every "I want to add another client" is a billing decision.
- Cost protection is already strong (R2 free egress).
- Bundle pricing is psychologically cleaner: "Pro = 5 portals" reads as a feature, not a meter.

### 11.5 Studio tier hint (Phase 4)

When Pro users start asking for more portals or more storage with regularity (probably 3–6 months in), introduce Studio at ~₹1,499/month: unlimited portals, 50 GB, 10 clients per portal, custom domain, white-label.

### 11.6 Storage add-on (Phase 4 alternative)

Optional: ₹199 / 25 GB / month, available on Pro and Studio. Captures heavy-storage outliers without forcing them to a higher base tier.

---

## 12. Security & privacy

### 12.1 Tenant isolation

Three layers of defence (assume each could fail):

1. **App layer**: every server action calls `requirePortalAccess(portalId)` before any DB read/write. No exceptions, audited via grep + ESLint custom rule.
2. **DB layer**: RLS on every `portal_*` table with policies referencing `auth.uid()`.
3. **Storage layer**: R2 keys prefixed by `portals/{portal_id}/...`. Presigned URLs are issued only after app-layer auth. No bucket-level public reads.

### 12.2 Client revocation

Single source of truth: `portal_members.revoked_at`. Once set, the client:
- Cannot read `portal_*` rows for that portal (RLS).
- Cannot generate new presigned URLs.
- Pending presigned URLs (max 5-min TTL) expire quickly.
- Sees a "Access revoked" page if they try to load the portal.

### 12.3 Audit log

Every privileged action (portal create/delete, member invite/revoke, file delete) writes to `portal_activity` with `type='audit.*'`. Surface in the freelancer's "Activity" tab + a downloadable CSV (Phase 2).

### 12.4 GDPR / DPDP (India) compliance

- Data residency: Supabase region (currently EU/US — pick AP-South-1 for India users on launch). R2 is multi-region by default (not user-pickable on free), document this in privacy policy.
- Right to deletion: client account deletion cascades to membership rows. Freelancer's portal + uploaded files retained (freelancer's data).
- DPA: Cloudflare and Supabase both publish standard DPAs — link from `/privacy`.

### 12.5 Invitation safety

- Tokens stored hashed (sha256) in DB.
- Single-use, 7-day expiry.
- Email-only delivery (no public token URL ever exposed in app UI).
- Rate-limit invitation issuance: max 10/hour per freelancer.

### 12.6 What we are NOT promising

- No SOC 2 (not at our scale yet — wait until $50k MRR).
- No HIPAA (not in our user persona).
- No on-prem.
- No legal hold / e-discovery.

---

## 13. Database schema (concrete)

```sql
-- 1. Portals
CREATE TABLE portals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id),
  name            text NOT NULL,                    -- "Acme Co. — Brand redesign"
  brand_color     text DEFAULT '#6366F1',           -- Phase 2
  status          text NOT NULL DEFAULT 'active',   -- active | archived | deleted
  created_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX ON portals (owner_user_id) WHERE deleted_at IS NULL;

-- 2. Portal members
CREATE TABLE portal_members (
  portal_id       uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  role            text NOT NULL CHECK (role IN ('owner', 'client')),
  invited_at      timestamptz DEFAULT now(),
  joined_at       timestamptz,
  revoked_at      timestamptz,
  PRIMARY KEY (portal_id, user_id)
);
CREATE INDEX ON portal_members (user_id) WHERE revoked_at IS NULL;

-- 3. Pending invitations (pre-account)
CREATE TABLE portal_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id       uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  email           citext NOT NULL,
  token_hash      text NOT NULL,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX ON portal_invitations (token_hash);
CREATE INDEX ON portal_invitations (portal_id, accepted_at);

-- 4. Files
CREATE TABLE portal_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id       uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  uploaded_by     uuid NOT NULL REFERENCES auth.users(id),
  r2_key          text NOT NULL UNIQUE,
  name            text NOT NULL,
  size_bytes      bigint NOT NULL,
  mime_type       text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX ON portal_files (portal_id, created_at DESC) WHERE deleted_at IS NULL;

-- 5. Messages
CREATE TABLE portal_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id       uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES portal_messages(id),
  author_id       uuid NOT NULL REFERENCES auth.users(id),
  body            text NOT NULL,
  attachments     jsonb,
  created_at      timestamptz DEFAULT now(),
  edited_at       timestamptz,
  deleted_at      timestamptz
);
CREATE INDEX ON portal_messages (portal_id, created_at DESC) WHERE deleted_at IS NULL;

-- 6. Activity (also feeds notifications)
CREATE TABLE portal_activity (
  id              bigserial PRIMARY KEY,
  portal_id       uuid NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES auth.users(id),
  type            text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX ON portal_activity (portal_id, created_at DESC);

-- 7. Storage usage (denormalised cache, kept in sync via trigger)
CREATE TABLE portal_storage_usage (
  portal_id       uuid PRIMARY KEY REFERENCES portals(id) ON DELETE CASCADE,
  total_bytes     bigint NOT NULL DEFAULT 0,
  file_count      int NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now()
);

-- 8. Notification outbox (digest worker drains this)
CREATE TABLE portal_notification_outbox (
  id              bigserial PRIMARY KEY,
  recipient_id    uuid NOT NULL REFERENCES auth.users(id),
  portal_id       uuid REFERENCES portals(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  scheduled_for   timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX ON portal_notification_outbox (recipient_id, scheduled_for) WHERE sent_at IS NULL;
```

### RLS policies (sketch)

```sql
-- Portals: owner OR active member
CREATE POLICY portal_select ON portals FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM portal_members m
      WHERE m.portal_id = portals.id AND m.user_id = auth.uid() AND m.revoked_at IS NULL
    )
  );

-- Portal_members: only members of that portal can see other members
CREATE POLICY pm_select ON portal_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portal_members m
      WHERE m.portal_id = portal_members.portal_id AND m.user_id = auth.uid() AND m.revoked_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM portals p WHERE p.id = portal_members.portal_id AND p.owner_user_id = auth.uid())
  );

-- (similar select/insert/update/delete policies for files, messages, activity)
```

Inserts/updates always also gated by **app-layer** `requirePortalAccess()` — never trust RLS alone.

---

## 14. Infrastructure stack (recommended)

| Layer | Service | Plan | Why |
| --- | --- | --- | --- |
| App hosting | **Vercel** | Hobby → Pro | Already on it. Edge functions for presigned URLs. |
| Database | **Supabase Postgres** | Free → $25 Pro | Already on it. RLS reuse. |
| Auth | **Supabase Auth** | Free | Already on it. Reuse for clients. |
| Object storage | **Cloudflare R2** | Free 10 GB / $0 egress | NEW. Replaces Supabase Storage for portals. |
| CDN | **Cloudflare** | Free | In front of R2 via custom domain. |
| Email | **Resend** | Free 3k/mo → $20 | Already on it. |
| Realtime (Phase 3) | **Supabase Realtime** | Free 200 conc. | Already in stack. |
| Cron | **Supabase Edge Functions + pg_cron** | Free | For digest worker, R2 cleanup. |
| Analytics | **PostHog** | Free 1M events/mo | Already on it. |
| Error tracking | **Sentry** | Free 5k events/mo | Already on it. |

**No new vendors required for MVP except R2.** Operational footprint stays small.

### Cost projection

| Stage | Pro customers | Storage used | Monthly infra cost |
| --- | ---: | ---: | ---: |
| Launch | 0–10 | < 1 GB | **₹0** (all free tiers) |
| Early traction | 50 | ~25 GB | **~₹100** (R2 above 10 GB) |
| Growth | 200 | ~100 GB | **~₹600** |
| Scale | 1,000 | ~500 GB | **~₹3,500** + Supabase Pro $25 |

At 200 paying Pro users (~₹1L MRR from Pro alone), portal infra is < 1% of revenue. **Excellent unit economics.**

---

## 15. Scalability strategy

### Read scaling
- Postgres handles tens of thousands of portals trivially. Indexes on `(portal_id, created_at DESC)` and `(owner_user_id)` and `(user_id)` cover all hot reads.
- Add Supabase read replica only at > 10k MAU.

### Write scaling
- File uploads bypass our servers (direct browser → R2). Vercel function load is presigned-URL issuance + DB inserts. Both are sub-millisecond.

### Storage scaling
- Per-portal cap (5 GB) bounds tenant growth.
- Per-account cap (5 GB Pro / 50 GB Studio) bounds total exposure.
- Nightly purge of soft-deleted files prevents zombie storage cost.

### Realtime scaling (Phase 3)
- Supabase Realtime free tier: 200 concurrent connections. At ~5% of paying Pro users active concurrently, that supports 4,000 paying users before any upgrade. Generous.

### What does NOT scale
- The notification digest worker is a single Edge Function on a 2-minute cron. At ~10k events/min it would buckle. We're nowhere near that. Move to a queue (e.g. Cloudflare Queues, also free tier) only if/when we cross 1M events/month.

---

## 16. Operational complexity analysis

### What's added by this feature

| New thing | Complexity | Mitigation |
| --- | --- | --- |
| R2 bucket | Low — set & forget | One IAC migration on day 1, never touch again |
| Presigned URL service | Medium — security-critical | Single tested helper, code-reviewed |
| Client auth flow | Low — reuses existing | Reuse existing forms, just add `role` checks |
| Digest worker | Low — one cron | Logs to PostHog, alerts via Sentry |
| New routes (`/portal/*`) | Medium — own layout | Reuse existing UI primitives |
| **Two-sided UI (freelancer + client)** | Highest | Mitigation below |

### Two-sided UI mitigation

The single biggest cost for a solo founder is maintaining two UIs forever. Mitigations:

1. **Shared component library.** File list, message thread, activity feed — single component, role-aware props. Build once.
2. **Role-aware page templates.** A single `/portal/[id]` page. Server component reads role and renders permissions-aware sub-tree. No duplicate routes.
3. **One-way design rule.** Client view is *always* a strict subset of freelancer view. If a feature exists on the client side, the freelancer can also do it. This keeps the mental model "client view = freelancer view minus admin actions."

### Operational rituals

- **Weekly**: glance at R2 storage dashboard. Cloudflare alerts if approaching $5/month.
- **Monthly**: review portal storage outliers (top 5 portals by GB). Spot-check for abuse.
- **Per-incident**: Sentry alert → triage → fix. No on-call.

### Solo-founder feasibility verdict

**Yes, with discipline.** The architectural calls (R2, no realtime, comments-only, role-aware single UI) are deliberately chosen to minimise long-term operational drag. Phase 1 is achievable in 2 weeks of focused work.

---

## 17. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
| --: | --- | --- | --- | --- |
| 1 | Storage cost runaway | Medium | High | R2 + hard quotas + nightly purge |
| 2 | Client confused by UX | High | Medium | Onboarding tour Phase 2; one-page IA in MVP |
| 3 | Auth misconfiguration leaks data | Low | Catastrophic | RLS + app guards + e2e tests on permissions |
| 4 | Realtime FOMO / customer asks for chat | Medium | Low | Phase 3 path is well-defined; say "not yet" with confidence |
| 5 | R2 outage | Low | Medium | Acceptable for our SLA tier; pages render gracefully |
| 6 | Quota arguments ("I need more storage!") | High | Low | Stripe-style upgrade flow + storage add-on Phase 4 |
| 7 | Two UIs become unmaintainable | Medium | High | Single role-aware page tree, shared components |
| 8 | Invitation emails go to spam | High | Medium | Resend's domain auth + clear sender + plain-text fallback |
| 9 | Client portal becomes feature creep magnet | High | High | Public scope doc; `Phase 1 = MVP. Saying no = freedom.` |
| 10 | Privacy / compliance complaint | Low | High | Explicit DPA links, data deletion flow, residency note |
| 11 | Auth-context bug in `signContractFromPortal` / `payInvoiceFromPortal` lets a wrong user sign or pay | Low | **Catastrophic** (legal validity, payment integrity) | (a) Reuse existing signing core unchanged. (b) Single auth-resolution helper. (c) e2e Playwright tests covering sign + pay + revoked-mid-action paths. (d) Webhook idempotency on Razorpay side already in place. |

---

## 18. Implementation phases (recommended)

### Combined release timeline

Phase 0a + Phase 0b + Phase 1 ship as **one launch** ("Stackivo Portals — with proper invoice payments"). Total: ~18 working days.

### Phase 0a — Invoice flow restoration (~6 working days)

Detailed spec in §0a. Day-by-day:

| Day | Deliverable |
| --- | --- |
| 0a-1 | Razorpay-credentials migration + freelancer settings UI (paste + verify keys). |
| 0a-2 | `sendInvoiceDueAction` + `renderInvoiceDueEmail` + rename of legacy receipt action. |
| 0a-3 | `/i/[token]` public payment page (replaces 404 stub). |
| 0a-4 | `createInvoicePaymentOrder()` + Razorpay checkout button + test-mode toggle. |
| 0a-5 | Webhook branch + `markInvoicePaidFromWebhook()` + auto-receipt with paid PDF. |
| 0a-6 | Overdue cron, polish, full e2e Playwright (create → send → view → pay → receipt). |

### Phase 0b — Pre-flight (½ day)

- Set up Cloudflare R2 bucket + custom domain (`files.stackivo.me`).
- Create R2 access keys; add to Vercel env (`R2_ACCESS_KEY_ID`, `R2_SECRET`, `R2_BUCKET`, `R2_PUBLIC_HOST`).
- Subdomain locked: portal at `/portal/*` (same domain).

### Phase 1 — Portal MVP (target: ~12 working days, with buffer)

Day 9 and Day 10 are lighter than the original plan because Phase 0a builds the full payment + receipt engine. Portal-side invoice pay is now a thin auth-translation wrapper over `createInvoicePaymentOrder()` rather than a full Razorpay integration.

| Day | Deliverable |
| --- | --- |
| 1 | DB migration (10 tables incl. `portal_contracts`, `portal_invoices` junctions + RLS policies + seed data). |
| 2 | R2 helper (`@/lib/r2/client.ts`) — presign PUT/GET, key conventions, MIME whitelist. |
| 3 | `requirePortalAccess` guard + role-aware layout + `/portal` route group. |
| 4 | Portal CRUD (`/dashboard/portals`, `/dashboard/portals/new`). |
| 5 | Invitation flow (token, email, accept page). |
| 6 | File upload UI + storage usage tracking + quota enforcement. |
| 7 | File list + download flow + ZIP fallback for multi-file. |
| 8 | Attach contract to portal + `/portal/[id]/contracts` list view. |
| 9 | **In-portal contract signing** — `/portal/[id]/contracts/[contractId]` mounts the existing `/c/[token]` signing component with `signContractFromPortal` auth-translation action. Status sync via existing trigger. |
| 10 | Attach invoice to portal + `/portal/[id]/invoices/[id]` mounts the existing `/i/[token]` payment component with `payInvoiceFromPortal` auth-translation action (Razorpay `notes.portal_id` set for attribution). |
| 11 | Comments UI + activity feed + in-app bell + digest worker (cron). All `portal.*` events incl. `contract.signed` / `invoice.paid` reuse Phase 0a notifications. |
| 12 | Plan gate, polish pass, end-to-end Playwright tests (full create-portal → invite → upload → comment → sign → pay-via-portal happy path). |

### Phase 2 — Activation polish (5 days)

- Approvals flow.
- Per-project sections.
- Brand customisation.
- Onboarding tour for clients.
- Bulk operations.

### Phase 3 — Realtime + push (5 days)

- Supabase Realtime channel for messages + activity.
- Web push (PWA) with VAPID keys.
- File previews (PDF.js, image inline).

### Phase 4 — Studio tier (3 days + pricing changes)

- Plan upgrades + Razorpay product.
- Custom domain support.
- Storage add-on packs.
- Per-portal analytics for freelancer.

---

## 19. Decisions (locked 2026-05-14)

| # | Decision | Resolution |
| --: | --- | --- |
| 1 | URL strategy | **`/portal/*` on main domain.** Reuse cookies, auth, PWA. |
| 2 | Branding footer | **"Powered by Stackivo" subtle footer on all Pro portals.** Removed on Studio (Phase 4) as a paid differentiator. Acts as a free viral acquisition channel — every client is a future Stackivo prospect. |
| 3 | Invitation email sender | **`"Asha (Stackivo) <portals@stackivo.me>"`.** We control SPF/DKIM. Personal name surfaces; trust signal preserved. No per-freelancer domain verification. |
| 4 | Multi-client per portal in MVP UI | **No.** Schema supports N:M (future-proof). MVP UI shows "invite the client" — single client per portal. Multi-client invite added in Phase 2 if asked for. |
| 5 | Plan grandfathering | **Included in Pro at no extra charge.** Every existing + new Pro user gets 5 portals / 5 GB / 3 clients. Pro retention move + clear upgrade reason for free users. Studio (Phase 4) raises caps. |

---

## 20. What I'd ship first if I had to demo in 5 days

If we wanted a hyper-aggressive 1-week proof rather than the 2-week MVP:

- Drop comments. Replace with "send a note" form that emails the other party.
- Drop in-app notifications. Just emails.
- Drop activity feed. Just "Last updated X".
- Drop mobile polish.
- Drop quotas (manual review for first 5 portals).

Result: portal create → invite → upload files → download files → email back-and-forth. Crap, but a working artifact you can show to your first 3 design partners. Then iterate from real feedback.

I don't recommend this unless you have a specific demo deadline. The full Phase 1 is more honest.

---

## 21. Success criteria (revisited, concrete)

- ✅ A Pro user can invite their first client in < 5 minutes.
- ✅ A client can log in, see their portal, download a file in < 90 seconds from email click.
- ✅ Total infra cost at 100 paying users < ₹500 / month.
- ✅ Zero RLS leakage in security audit.
- ✅ ≥ 30% Pro adoption in 90 days.

---

*End of plan. Ready for your sign-off, then implementation.*
