# Stackivo — Support System Manual Setup

> Companion to `ADMIN_CONSOLE_SETUP.md`. The codebase wiring is done; this guide walks you through the **vendor account creation and configuration** needed to bring the support system fully online.
>
> **Time required:** 90–120 minutes total. You can stop after Step 1 (Crisp) and have a working chat experience; everything else is incremental.

---

## What's already wired in code

| Capability | File(s) | Behaviour without setup |
| --- | --- | --- |
| **Crisp chat widget** | `@/src/features/support/crisp-provider.tsx` | Hidden — no script injected when `NEXT_PUBLIC_CRISP_WEBSITE_ID` is unset |
| **Floating Support button** | `@/src/features/support/support-button.tsx` | Hidden — mounted via dashboard layout but only renders affordances when env is set |
| **`/help` page** | `@/src/app/(dashboard)/help/page.tsx` | Always works; FAQ links show a "KB not published" hint when `NEXT_PUBLIC_ZOHO_DESK_HELP_URL` is unset |
| **Bug-report form** | `@/src/features/support/bug-report-form.tsx` + `actions.ts` | Falls back to email-via-Brevo to `support@stackivo.me` when Zoho Desk isn't configured |
| **Crisp webhook** | `@/src/app/api/webhooks/crisp/route.ts` | Returns 404 when `CRISP_WEBHOOK_SECRET` is unset |
| **Zoho Desk webhook** | `@/src/app/api/webhooks/zoho-desk/route.ts` | Returns 404 when `ZOHO_DESK_WEBHOOK_SECRET` is unset |
| **Admin merged inbox** | `@/src/app/(admin)/admin/support/page.tsx` | Always works; shows empty thread state until webhooks fire |
| **Per-user support history** | `@/src/components/admin/user-support-threads.tsx` | Empty state on user detail until threads land |
| **Churn-signal badges** | `@/src/components/admin/user-churn-badges.tsx` | Hidden when no signals |
| **Support pulse on Now page** | `@/src/app/(admin)/admin/page.tsx` | Renders zeros |
| **Cancel-flow chat interstitial** | `@/src/features/billing/components/cancel-subscription-button.tsx` | Hides the green "Chat with founder" panel when Crisp isn't configured |
| **Soft-delete fan-out** | `@/src/features/admin/actions.ts` (Crisp + Zoho delete) | Skipped silently when API credentials are missing |

> **Everything below is configuration-only.** No further code changes are required.

---

## Step 0 — Apply migration 0022

```bash
supabase db push
```

Or paste `@/supabase/migrations/0022_support_threads.sql` into Supabase **SQL editor**.

Verify:

```sql
select count(*) from public.support_threads;     -- 0
select tablename from pg_indexes
where tablename = 'support_threads';             -- 3 rows
```

The table holds zero data until webhooks start firing — that's expected.

---

## Step 1 — Crisp Live Chat (≈ 25 min)

### 1a. Create the Crisp account

1. Go to **https://app.crisp.chat/initiate/signup/**.
2. Sign up with your founder email (use `support@stackivo.me` if you want chat replies to feel "from support").
3. When prompted for a workspace name, use **Stackivo**.
4. **Skip** the "Install widget on your website" step — we install it ourselves via env var.
5. **Skip** importing contacts.

### 1b. Grab the website ID

1. Crisp dashboard → **Settings** (top-right cog) → **Setup Instructions**.
2. Copy the value at the very top: `Your Website ID is [a long uuid-like string]`.

Set in your environment (Vercel + local):

```
NEXT_PUBLIC_CRISP_WEBSITE_ID=<that uuid>
```

Redeploy. The widget appears on every authenticated page within ~30 seconds.

### 1c. Polish the widget

In Crisp dashboard:

| Setting | Value | Why |
| --- | --- | --- |
| **Settings → Website settings → Appearance** → Color | Match `bg-foreground` of your brand | Makes the widget feel native |
| **Settings → Website settings → Appearance** → Position | Bottom-right | Same side as our `<SupportButton/>` |
| **Settings → Website settings → Availability** → Hours | Set to your timezone (Asia/Kolkata) and waking hours | Shows green "online" only when you can answer |
| **Settings → Website settings → Availability** → Off-hours response | Type: "I'm offline. Leave a message and I'll reply within ~12 hours." | Sets expectation honestly |
| **Settings → Website settings → Chat** → Auto-reply | "Hi 👋 I'm Jaksh, founder of Stackivo. I usually reply within a few hours during waking hours (IST). What can I help with?" | Solo-founder transparency |
| **Settings → Plugins** → MagicReply AI | Enable | Free on Crisp; cuts your reply time by ~60% |
| **Settings → Workspace → Members** | Just you | Already done |

### 1d. Install the Crisp mobile app

iOS: https://apps.apple.com/app/crisp/id1043364574
Android: https://play.google.com/store/apps/details?id=im.crisp.client

Sign in with the same account. Enable **push notifications**. This is your support inbox.

### 1e. Configure the webhook (so threads sync into the admin console)

1. Generate a 32-char shared secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set in Vercel + local: `CRISP_WEBHOOK_SECRET=<that hex>`. Redeploy.
3. Crisp dashboard → **Settings → Plugins → Marketplace → Build a private plugin**:
   - Name: `Stackivo Console Sync`
   - Description: `Mirrors conversation metadata into our admin console.`
   - Production scopes: tick `website:conversation:initiated`, `website:conversation:read`, `website:conversation:state`, `website:people:read`, `website:people:write`.
4. Inside the plugin → **Webhooks** tab → **Subscribe to a new webhook**:
   - Endpoint: `https://stackivo.me/api/webhooks/crisp`
   - Authentication header: `X-Crisp-Signature` ← Crisp computes the HMAC for you using your **plugin secret**. **Set Crisp's plugin secret to the same value** as `CRISP_WEBHOOK_SECRET`.
   - Subscribed events: `message:received`, `message:send`, `session:set_state`, `session:set_email`.
5. Click **Subscribe**.

Verify with the Crisp test button (from the webhook UI). If green, you're done.

### 1f. (Optional) REST API credentials for soft-delete fan-out

Only needed if you want **DPDP "right to be forgotten"** to also delete the user's chat history when you soft-delete them.

1. Same plugin → **API Tokens** → **Generate new token**.
2. Copy the **identifier** + **key** values.
3. Set:
   ```
   CRISP_API_IDENTIFIER=<identifier>
   CRISP_API_KEY=<key>
   ```
4. Redeploy.

The soft-delete admin action automatically calls `DELETE /v1/website/{id}/people/profile/{email}` and logs the result.

### 1g. Onboarding outbound campaign (free, 5 min)

Crisp dashboard → **Campaigns → Create new** → **Outbound message**.

| Field | Value |
| --- | --- |
| Trigger | `User session segment is "app"` AND `User is on website for less than 1 day` |
| Message | "Hi 👋 First day on Stackivo? What brought you here? Reply with one line — I read every message." |
| Send delay | 30 minutes after first session |

Save + activate. ~10–15% of new users reply. Every reply is goldmine product feedback.

---

## Step 2 — Zoho Desk free tier (≈ 30 min)

### 2a. Create the Zoho Desk account

1. Go to **https://www.zoho.com/desk/** → **Sign up free**.
2. Use the **same Zoho account** that owns `support@stackivo.me`. Zoho Desk auto-detects the existing email and offers to wire it up.
3. **Choose data centre:** match your Zoho Mail region (likely IN — `desk.zoho.in`). Note this — it determines `ZOHO_DESK_API_BASE`.
4. Workspace name: `Stackivo`.

### 2b. Connect the support inbox

1. Zoho Desk → **Setup** (top-right cog) → **Channels → Email → Add Email**.
2. Choose **Zoho Mail** (since `support@stackivo.me` already runs there).
3. Authorise → pick `support@stackivo.me`.
4. Department: leave as the default (you'll capture its ID below).

Test: send an email **from a personal address** to `support@stackivo.me`. It should appear as a ticket in Zoho Desk within ~30 seconds.

### 2c. Set up the help-center custom domain

1. Zoho Desk → **Setup → Channels → Help Center → Domain Mapping**.
2. Add `help.stackivo.me`.
3. Zoho gives you a CNAME target — add it in your DNS provider:
   ```
   help.stackivo.me  CNAME  help-stackivo.zohodesk.com.
   ```
4. Wait 5–15 min for DNS + Zoho's auto-provisioned cert.
5. Set in Vercel + local:
   ```
   NEXT_PUBLIC_ZOHO_DESK_HELP_URL=https://help.stackivo.me
   ```
6. Redeploy.

The `/help` page now deep-links into your live KB articles.

### 2d. Write the first 5 KB articles

Zoho Desk → **Knowledge Base → Add article**. Write these in priority order:

1. **How do I cancel my subscription?** — slug: `cancel-subscription`
2. **Why was I charged?** — slug: `why-was-i-charged`
3. **Get a GST tax invoice** — slug: `gst-invoice`
4. **Reset my password** — slug: `reset-password`
5. **Plan comparison: Free vs Pro vs Business** — slug: `plan-comparison`

(The slugs above match the URLs hard-coded in `@/src/app/(dashboard)/help/page.tsx`. Use the same slugs to keep deep-links working.)

Mark all 5 as **Published** + **Public**.

### 2e. Mint a long-lived REST API access token (≈ 15 min)

This is the only fiddly bit. Zoho gates the Desk API behind OAuth, but the **Self-Client** flow lets you mint a token without building an OAuth dance.

1. Go to **https://api-console.zoho.in/** (or `.com` / `.eu` matching your region).
2. **Add Client → Self Client**.
3. Note the **Client ID** + **Client Secret** (you'll need them in step 4).
4. Switch to the **Generate Code** tab. Inputs:
   - **Scope:** `Desk.tickets.ALL,Desk.contacts.ALL,Desk.basic.READ,Desk.search.READ`
   - **Time duration:** 10 minutes
   - **Scope description:** `Stackivo Console support sync`
5. Click **Create**. Copy the auth code that appears (valid for 10 min only).
6. In a terminal:
   ```bash
   curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
     -d "grant_type=authorization_code" \
     -d "client_id=<your client id>" \
     -d "client_secret=<your client secret>" \
     -d "code=<the auth code from step 5>"
   ```
7. The response contains `access_token` (1h) and `refresh_token` (long-lived). Save both.
8. **Now refresh the access token** to get one valid for production. Whenever the token expires (every hour), refresh:
   ```bash
   curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
     -d "grant_type=refresh_token" \
     -d "refresh_token=<the refresh token>" \
     -d "client_id=<client id>" \
     -d "client_secret=<client secret>"
   ```

> **Operational note:** Zoho Desk REST tokens expire after 1h. For Phase 1, paste the latest token into Vercel manually whenever you mint a new one. For Phase 2 (when ticket volume justifies it), wire a tiny cron route that auto-refreshes hourly. Until then, the **email fallback path** in the bug-report form works without any Zoho API at all — Zoho is purely optional.

9. Find your **Org ID** at Zoho Desk → **Setup → Developer Space → API → API Authentication** (it's the long numeric value).
10. Find your **Department ID**: Zoho Desk → **Setup → General → Departments** → click your department → URL contains `?id=<numeric department id>`.

Set in Vercel + local:

```
ZOHO_DESK_ORG_ID=<numeric org id>
ZOHO_DESK_ACCESS_TOKEN=<latest 1h access token>
ZOHO_DESK_DEPARTMENT_ID=<numeric department id>
ZOHO_DESK_API_BASE=https://desk.zoho.in
```

Redeploy. The bug-report form now creates real Zoho Desk tickets instead of falling back to email.

### 2f. Configure the Zoho Desk → admin console webhook

1. Generate a 32-char shared secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set `ZOHO_DESK_WEBHOOK_SECRET=<hex>` in Vercel + local. Redeploy.
3. Zoho Desk → **Setup → Developer Space → Webhooks → New Webhook**:
   - Webhook name: `Stackivo Console Sync`
   - URL: `https://stackivo.me/api/webhooks/zoho-desk`
   - Method: `POST`
   - Body: leave default (Zoho sends a JSON envelope)
   - Authentication: **Custom header** → header name `X-Zoho-Desk-Token` → header value `<the secret from step 2>`
4. Under **Modules**, tick:
   - `Tickets` → operations: `Create`, `Update`, `Delete`, `Close`
5. Click **Save**.

Verify with Zoho's "Test Webhook" button. The route should return 200.

### 2g. Macros (canned replies — saves ~30% of typing)

Zoho Desk → **Setup → Macros → New Macro**. Create at minimum:

| Macro name | When to use | What it does |
| --- | --- | --- |
| **Acknowledge** | Within 1h of any new ticket | Sends "Got your message — looking into it now. Will reply with answer or update within ~4 hours." + sets status to `On Hold` |
| **Identity verification required** | Anyone asking for sensitive actions (refund, password reset, data export) | Sends a 6-digit verification code via Brevo; sets status `On Hold` |
| **Refund processed** | After issuing a Razorpay refund | Sends Razorpay refund confirmation + status `Resolved` |
| **Cancel reactivation offer** | When the user mentions cancelling | Offers a 50% discount for 3 months + status `On Hold` |

### 2h. Auto-tagging rules

Zoho Desk → **Setup → Automation → Workflows → New Rule**.

| Trigger | Tag | Why |
| --- | --- | --- |
| Subject or description contains "refund" | `at-risk-churn`, priority `High` | Surfaces in admin console churn-signal badge + Now-page support pulse |
| Subject or description contains "data loss" or "lost" | `data-loss`, priority `Urgent` | Critical |
| Subject or description contains "GST" or "GSTIN" or "tax invoice" | `compliance` | India SaaS specific |

---

## Step 3 — Mobile setup (5 min)

Install both apps on your phone. Both are free.

| App | iOS | Android |
| --- | --- | --- |
| **Crisp** | https://apps.apple.com/app/crisp/id1043364574 | https://play.google.com/store/apps/details?id=im.crisp.client |
| **Zoho Desk** | https://apps.apple.com/app/zoho-desk/id932216196 | https://play.google.com/store/apps/details?id=com.zoho.desk |

Sign in to both. Enable push notifications for new conversations and new tickets. **Mute everything else** — you only want pings for actual customer messages.

---

## Step 4 — Verification checklist

After all the above, run this end-to-end check:

### Customer side
- [ ] Open `https://stackivo.me` (logged out) — Crisp widget visible bottom-right.
- [ ] Log in → dashboard — Crisp widget AND `<SupportButton/>` (life-buoy icon) visible.
- [ ] Press `?` anywhere — support menu opens.
- [ ] Visit `/help` — FAQ articles deep-link to `help.stackivo.me`.
- [ ] Submit a bug report via `/help` form → toast confirms → ticket appears in Zoho Desk within 5s.
- [ ] Open chat → send a message → arrives in Crisp inbox + Crisp mobile push.

### Founder side
- [ ] `/admin/support` shows the new chat thread + Zoho ticket as rows in the merged feed.
- [ ] `/admin/users/[id]` for the user who tested shows the support history widget populated.
- [ ] `/admin` Now page → Support pulse card shows non-zero counts.
- [ ] Soft-delete the test user from `/admin/users/[id]` → confirm Crisp + Zoho both delete the contact (check vendor dashboards).

### Email fallback
- [ ] Temporarily unset `ZOHO_DESK_ACCESS_TOKEN` in Vercel → submit `/help` form → confirm an email arrives at `support@stackivo.me` from Brevo.
- [ ] Restore the token.

### DPDP soft-delete fan-out
- [ ] Soft-delete the test user → check `select * from public.admin_actions where kind='user.delete_soft' order by created_at desc limit 1` → metadata records the fan-out attempts.

---

## Step 5 — Daily workflow

### Morning (10 min)
1. Open Crisp mobile → resolve all chats received overnight.
2. Open Zoho Desk mobile → triage new tickets, send the **Acknowledge** macro on every NEW ticket within 1h.

### Throughout the day
- Crisp push notifications for new chats.
- Zoho Desk batched email digests (configure: Setup → My Preferences → Email Notifications → "Every 30 min").

### Weekly (30 min, Friday)
- Zoho Desk → Reports → top 3 ticket categories.
- `/admin/support` weekly trend.
- Pick **one** recurring "how-to" → write a KB article so it deflects next time.

---

## Step 6 — When to upgrade

The free tier carries you a long way. Hard triggers to upgrade:

| Symptom | Upgrade |
| --- | --- |
| > 50 chats/day | Crisp **Pro €25/mo** (helpdesk add-on, more shortcuts) |
| > 3 agents needed | Zoho Desk **Standard ₹800/agent/mo** (SLA policies, multiple departments) |
| > 30 KB articles + you want better search | Migrate KB to **Mintlify** (free) or **Docusaurus** (free OSS) |
| Token refresh fatigue | Wire `/api/cron/refresh-zoho-token` (10 lines + 1 cron entry) |
| You take on a contractor | Set up **Customer Satisfaction Surveys** (Zoho Desk Standard) |

---

## Step 7 — Security + privacy notes

| Concern | Mitigation in place |
| --- | --- |
| **DPA with Crisp** | Crisp signs DPAs on free tier — email `dpo@crisp.chat` to request |
| **DPA with Zoho** | Zoho Desk DPA is in their free-tier ToS (Indian company, India data residency available) |
| **Identity passing** | We send `email`, `nickname`, `user_id`, `plan` to Crisp — NEVER address, payment, GSTIN, etc. |
| **Webhook auth** | Both webhooks use shared secret + timing-safe compare; missing secret returns 404 |
| **PII in transcripts** | Crisp auto-redacts credit-card numbers; you train yourself to redact OTPs/keys before responding |
| **Right to be forgotten** | Soft-delete admin action automatically calls Crisp + Zoho delete APIs (when configured); failures logged but don't unwind |
| **CSP** | Admin surface CSP whitelists `app.crisp.chat` and `*.zohodesk.com` so iframes work; main app is unaffected |
| **In-transit** | TLS everywhere; both vendors use modern TLS 1.2+ |

---

## Step 8 — Troubleshooting

### Crisp widget doesn't appear
1. Verify `NEXT_PUBLIC_CRISP_WEBSITE_ID` is set in **the runtime that's serving the page** (Vercel Production, not just Preview).
2. Open devtools → Network → filter `client.crisp.chat/l.js` — you should see a 200.
3. If you see CSP errors, the admin CSP doesn't apply to dashboard pages — verify by visiting `/dashboard`.

### Crisp chats don't appear in `/admin/support`
1. Verify `CRISP_WEBHOOK_SECRET` is set on the deployment.
2. Crisp dashboard → your plugin → Webhooks → Logs → confirm 200 responses.
3. If 401: the plugin secret on Crisp's side doesn't match `CRISP_WEBHOOK_SECRET` — fix on Crisp.
4. If 404: `CRISP_WEBHOOK_SECRET` is unset on Vercel — set it and redeploy.
5. Check Supabase logs for `support.thread.upsert_failed`.

### Zoho Desk bug-report submissions return "Email is required"
This is the email-fallback path being hit because the Zoho call failed. Check:
1. Token is valid (1h expiry — Zoho returns 401 when expired).
2. `ZOHO_DESK_ORG_ID` matches the actual org.
3. `ZOHO_DESK_API_BASE` matches your data centre.

### Zoho ticket arrives but `support_threads` row doesn't appear
1. Zoho Desk → Setup → Webhooks → your webhook → check delivery log.
2. If the webhook is failing with 404: `ZOHO_DESK_WEBHOOK_SECRET` is unset on Vercel.
3. If 401: the `X-Zoho-Desk-Token` header value doesn't match `ZOHO_DESK_WEBHOOK_SECRET`.

### Soft-delete doesn't fan out
1. Verify both `CRISP_API_IDENTIFIER` + `CRISP_API_KEY` (Crisp) and `ZOHO_DESK_ACCESS_TOKEN` (Zoho) are set.
2. Run the action; check Supabase logs for `admin.soft_delete.crisp_fanout_failed` or `admin.soft_delete.zoho_fanout_failed`.

---

## Reference: env var summary

| Var | Used by | Required for | When unset |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CRISP_WEBSITE_ID` | client | Chat widget | Widget hidden |
| `NEXT_PUBLIC_ZOHO_DESK_HELP_URL` | client | KB deep-links from `/help` | "Browse help articles" link hidden |
| `CRISP_WEBHOOK_SECRET` | webhook route | Sync chats into admin console | Route returns 404 |
| `CRISP_API_IDENTIFIER` + `CRISP_API_KEY` | server | DPDP soft-delete fan-out | Fan-out skipped silently |
| `ZOHO_DESK_ORG_ID` + `ZOHO_DESK_ACCESS_TOKEN` + `ZOHO_DESK_DEPARTMENT_ID` | server | Bug-report → real ticket creation | Falls back to email-via-Brevo |
| `ZOHO_DESK_API_BASE` | server | Region routing | Defaults to `https://desk.zoho.in` |
| `ZOHO_DESK_WEBHOOK_SECRET` | webhook route | Sync tickets into admin console | Route returns 404 |

---

## Cost projection

| Stage | Monthly cost |
| --- | --- |
| **Phase 1** (Crisp free + Zoho Desk free + Brevo free) | **₹0** |
| **Phase 2** (≥ 50 chats/day → Crisp Pro €25) | **~₹2,250** |
| **Phase 3** (≥ 3 agents → Zoho Desk Standard ₹800/seat × 2 extra) | **~₹3,850** |

The free tier comfortably carries you to ~$50k ARR.

---

## What you do NOT need (and why)

| Skipped | Why |
| --- | --- |
| **Tawk.to** | "Powered by Tawk.to" branding kills credibility on a paid SaaS |
| **Intercom** | Starter is $74/mo; ROI is negative until $50k+ ARR |
| **Custom chat widget** | 200h to replicate 1% of Crisp |
| **Self-hosted Chatwoot** | Ops burden you don't have time for; Crisp Cloud is sufficient until paid scale |
| **Mintlify / Docusaurus today** | Zoho Desk KB ships free + integrated; only migrate when you have 30+ articles |
| **NPS / CSAT surveys** | Wait until month 12 — premature signal noise |
| **AI auto-responder beyond MagicReply** | MagicReply is free in Crisp + better than what you'd ship |

---

## Done

Once Steps 0 → 4 are complete:

- ✅ Customers have **chat + KB + email + bug form** access from every page.
- ✅ All conversations land in your phone via Crisp + Zoho mobile apps.
- ✅ Admin console shows a **merged inbox** + **per-user support history** + **churn-signal badges**.
- ✅ DPDP "right to be forgotten" propagates to vendors automatically on soft-delete.
- ✅ Cancel-flow has a **chat-first interstitial** to drive retention.
- ✅ Total monthly cost: **₹0**.

You're done. Ship it.
