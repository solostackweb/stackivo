# Observability Setup Playbook

This guide walks through every account, environment variable, and verification step needed to activate the observability stack shipped to the codebase. Follow sections in order — each one builds on the previous.

**Time budget:** 60–90 minutes end-to-end.
**Cost:** $0 (every service is on a generous free tier; no credit card required to start).

---

## 0. Before you start

You will need:

- Admin access to the **Vercel** project (to set env vars + log drain)
- Admin access to the **Supabase** project (to apply migration 0018)
- A Slack workspace (any) or skip section 5 to defer alerting
- A working email inbox to verify the new accounts

You will create accounts on:

| Service | Purpose | Free tier |
| --- | --- | --- |
| Sentry | Error + performance tracking | 5k errors / mo |
| PostHog | Product analytics + replay + flags | 1M events / mo |
| Better Stack | Log drain + retention (optional) | 1 GB / 3 days |
| UptimeRobot | Synthetic uptime checks | 50 monitors |
| Slack | Incoming webhook alerts | Free |

---

## 1. Apply the database migration

The `security_events` table backs every audit-trail write the new code does. **Without this, every server action that emits a security event will fail silently** (the helper swallows errors, but you'll have no audit history).

### Steps

1. Open the Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/migrations/0018_security_events.sql`.
3. Click **Run**.
4. Verify with:
   ```sql
   select count(*) from public.security_events;  -- should return 0
   ```

### Local development

If you use the Supabase CLI:

```bash
supabase db push
```

The migration is idempotent (`create table if not exists`) — safe to re-run.

---

## 2. Sentry — error tracking

### 2a. Create the project

1. Sign up at https://sentry.io (use the org name **stackivo** if available).
2. **Create a new project**:
   - Platform: **Next.js**
   - Alert frequency: *On every new issue*
   - Project name: **stackivo**
3. Skip the auto-wizard — the SDK is already integrated. Sentry will show a DSN at **Settings → Projects → stackivo → Client Keys (DSN)**. Copy it.

### 2b. Generate an auth token (only needed for source-map uploads)

1. **Settings → Account → API → Auth Tokens → Create New Token**
2. Scopes:
   - `project:releases`
   - `org:read`
3. Copy the token. It will only be shown once.

### 2c. Set Vercel environment variables

Vercel Dashboard → **Settings → Environment Variables**. Apply to **Production** + **Preview** unless noted:

| Key | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...@o....ingest.sentry.io/...` | DSN from step 2a — public-safe, included in client bundle |
| `SENTRY_AUTH_TOKEN` | `sntrys_...` | Build-time only. **Production + Preview only.** Do not check this into git. |
| `SENTRY_ORG` | `stackivo` | Your org slug from the URL |
| `SENTRY_PROJECT` | `stackivo` | Project name from step 2a |

### 2d. Verify

After your next deploy:

1. Open a logged-in dashboard route.
2. Open browser DevTools → **Network** → filter for `sentry`. You should see `POST` requests to `*.sentry.io/...`.
3. Trigger a deliberate error to test:
   - Visit `https://stackivo.me/api/cron/monitor` without the `Authorization` header → 401.
   - Sentry should capture the auth failure on subsequent paths IF a real exception fires.
4. Most reliable test: edit a server action temporarily to `throw new Error("sentry test")`, deploy, click through to it, then revert.
5. Check the Sentry dashboard — the event should appear within 30 seconds.

### 2e. Tune Sentry settings

- **Settings → Inbound Filters** → enable *Filter by Web Crawlers* + *Filter by Legacy Browsers*.
- **Settings → Data Scrubbers** → leave defaults; the project redactor already strips PII before events leave the app.
- **Settings → Releases** → Sentry auto-creates a release per commit thanks to `SENTRY_AUTH_TOKEN`.
- **Performance → Sample rate** → already set to `0.1` (10%) in code; raise/lower in `sentry.client.config.ts` and `sentry.server.config.ts` if needed.

---

## 3. PostHog — product analytics

### 3a. Create the project

1. Sign up at https://posthog.com.
2. **Important:** select **EU Cloud** (Frankfurt) for DPDP compliance with your Indian-issued data.
3. Create a project named **stackivo**.
4. **Settings → Project → API Keys** → copy the **Project API Key** (starts with `phc_...`).

### 3b. Set Vercel environment variables

| Key | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | Public client key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | EU region. Use `https://us.i.posthog.com` if you accidentally chose US Cloud |

Production + Preview both. (Local dev: leave unset to skip analytics during dev.)

### 3c. Configure the project

In the PostHog dashboard:

1. **Settings → Project → Autocapture** → **Disable**. The codebase emits explicit events; autocapture clutters the timeline and risks PII leaks.
2. **Settings → Project → Session Recording** → enable, then under **Privacy**:
   - **Mask all input fields** → on
   - **Block elements with class `[ph-no-capture]`** → on (we'll use this on signature pads + invoice item editors)
3. **Settings → Person Display Name** → set to `email_hash` (the property our server emits).
4. **Settings → Project → Cookieless tracking** → off (we use first-party cookies; DPDP-safe with the implicit-consent stance).

### 3d. Verify

After deploy:

1. Sign up a brand-new account on the deployed app.
2. PostHog **Activity → Events** → you should see:
   - `$pageview` on every page navigation
   - `auth.user.signed_up` on the signup completion
3. **People** → you should see one new person identified by their `auth.users.id`, with `email_hash` populated and no plaintext email.

### 3e. Build the three core funnels (recommended)

PostHog **Insights → New insight → Funnel**:

1. **Signup → first invoice**:
   - Step 1: `auth.user.signed_up`
   - Step 2: `auth.user.logged_in`
   - Step 3: `onboarding.flow.completed`
   - Step 4: `invoice.created`
2. **Trial → paid conversion**:
   - Step 1: `auth.user.signed_up`
   - Step 2: `billing.checkout.opened`
   - Step 3: `billing.subscription.activated`
3. **Invoice send → payment**:
   - Step 1: `invoice.sent`
   - Step 2: `invoice.share_link_viewed`
   - Step 3: `invoice.paid`

(Events 2/3 fire from existing call sites once you wire them in — see `src/lib/analytics/events.ts` for the catalogue.)

---

## 4. Slack — alert webhook

### 4a. Create the webhook

1. In Slack, create a channel named **#ops-alerts** (or use an existing private channel).
2. Open https://api.slack.com/apps → **Create New App → From scratch** → name **Stackivo Ops**.
3. **Incoming Webhooks** → toggle **On** → **Add New Webhook to Workspace** → select **#ops-alerts**.
4. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`).

### 4b. Set Vercel environment variable

| Key | Value | Environment |
| --- | --- | --- |
| `OPS_SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | **Production only** |

Leave unset for Preview/Development so non-prod environments don't spam your channel.

### 4c. Verify

You'll only see Slack messages when one of the cron probes finds a problem. To test the wiring without waiting for a real incident:

1. Insert a test row that satisfies the threshold:
   ```sql
   insert into public.security_events (kind, severity, metadata)
   values ('cron_monitor_alert', 'alert', '{"test": true}'::jsonb),
          ('cron_monitor_alert', 'alert', '{"test": true}'::jsonb),
          ('cron_monitor_alert', 'alert', '{"test": true}'::jsonb);
   ```
2. Manually trigger the cron:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://stackivo.me/api/cron/monitor
   ```
3. Slack should receive a message within seconds.
4. Clean up:
   ```sql
   delete from public.security_events where metadata->>'test' = 'true';
   ```

---

## 5. Cron secret

The `/api/cron/monitor` endpoint requires a Bearer token to prevent random callers from triggering it.

### Steps

1. Generate a random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set in Vercel (Production only):
   | Key | Value |
   | --- | --- |
   | `CRON_SECRET` | `<the random hex>` |

Vercel Cron auto-attaches this as `Authorization: Bearer <CRON_SECRET>` on every scheduled invocation when the env var exists. The schedule itself lives in `vercel.json` (already committed) and runs every 15 minutes.

### Verify

After your next deploy + 15 minutes:

- Vercel Dashboard → **your project → Settings → Cron Jobs** → you should see `/api/cron/monitor` listed.
- Click it → **Logs** → verify it ran and returned 200.

---

## 6. Better Stack log drain (optional)

Skip this if you're tight on budget — Vercel's built-in 14-day log retention is acceptable until you cross ~1k DAU.

### 6a. Create the source

1. Sign up at https://betterstack.com → **Logs**.
2. **Sources → Connect source → Vercel**.
3. Copy the **Source token** Better Stack provides.

### 6b. Configure Vercel

1. Vercel Dashboard → your project → **Settings → Log Drains → Add Log Drain**.
2. Type: **Better Stack**.
3. Paste the source token.
4. Apply to: **Production**.
5. Save.

### 6c. Verify

1. Trigger any request on the deployed app (visit the homepage).
2. Better Stack **Live tail** → you should see a JSON line within ~5 seconds.
3. Search by request id: `request_id:abc123` (use one from a real response's `x-request-id` header).

---

## 7. UptimeRobot — synthetic uptime

### Steps

1. Sign up at https://uptimerobot.com (free tier).
2. **Add New Monitor**:
   - Type: **HTTP(s)**
   - URL: `https://stackivo.me/api/health`
   - Friendly name: `stackivo-health`
   - Monitoring interval: **5 minutes**
   - Alert contacts: enable email + Slack (Slack via the webhook from section 4 — UptimeRobot has its own integration UI)
3. (Optional) Add second monitor for `https://stackivo.me/login` so you also catch frontend regressions, not just API health.

### Verify

- The monitor should flip to **Up** within one polling cycle (5 min).
- Test alert: temporarily pause your Vercel deployment for 5 minutes — UptimeRobot fires an email/Slack ping.

---

## 8. Brevo webhook (from email audit, included for completeness)

If you didn't complete this from the email audit:

1. Generate a random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set in Vercel (Production):
   | Key | Value |
   | --- | --- |
   | `BREVO_WEBHOOK_SECRET` | `<random hex>` |
3. Brevo Dashboard → **Transactional → Settings → Webhooks → Add a new webhook**:
   - URL: `https://stackivo.me/api/webhooks/brevo?token=<the random hex>`
   - Events: `delivered`, `hard_bounce`, `soft_bounce`, `blocked`, `invalid`, `spam`, `unsubscribed`, `opened`, `clicks`
4. Send a test email from Brevo → verify a row appears in `public.delivery_logs` with `status='delivered'`.

---

## 9. DNS for sender deliverability (from email audit)

Operational, not in code. Critical for inbox placement.

### 9a. SPF (TXT on `stackivo.me`)

```
stackivo.me   IN TXT   "v=spf1 include:spf.brevo.com include:zoho.in -all"
```

Replace `zoho.in` with `zoho.com` if your Zoho region is US.

### 9b. DKIM

- **Brevo:** Brevo Dashboard → **Senders, Domains & Dedicated IPs → Domains → Authenticate** → copy the exact TXT records Brevo shows → add to your DNS host.
- **Zoho:** Zoho Mail Admin Console → **Domains → Email Configuration → DKIM** → enable, copy TXT, add to DNS.

### 9c. DMARC (start in monitoring mode)

```
_dmarc.stackivo.me   IN TXT   "v=DMARC1; p=none; rua=mailto:dmarc@stackivo.me; ruf=mailto:dmarc@stackivo.me; fo=1; adkim=r; aspf=r"
```

After 2 weeks of clean aggregate reports, ramp to:

```
_dmarc.stackivo.me   IN TXT   "v=DMARC1; p=quarantine; pct=25; adkim=s; aspf=s; rua=mailto:dmarc@stackivo.me"
```

Then over a month: `pct=25` → `50` → `100` → `p=reject`.

---

## 10. Final environment variable inventory

After all sections, your Vercel **Production** environment should have these new keys:

```
NEXT_PUBLIC_SENTRY_DSN          = https://...@o....ingest.sentry.io/...
SENTRY_AUTH_TOKEN               = sntrys_...
SENTRY_ORG                      = stackivo
SENTRY_PROJECT                  = stackivo

NEXT_PUBLIC_POSTHOG_KEY         = phc_...
NEXT_PUBLIC_POSTHOG_HOST        = https://eu.i.posthog.com

OPS_SLACK_WEBHOOK_URL           = https://hooks.slack.com/services/...
CRON_SECRET                     = <random hex>

BREVO_WEBHOOK_SECRET            = <random hex>
```

**Preview** environment should NOT have `OPS_SLACK_WEBHOOK_URL` or `CRON_SECRET` (so non-prod env doesn't trigger alerts), but should have the Sentry + PostHog keys so preview traffic gets observed.

**Development** (`.env.local`) should leave all of these unset — every observability path no-ops gracefully when the env is empty.

---

## 11. Verification checklist

Run through this after deployment to confirm end-to-end. Each line should pass:

- [ ] **Migration applied:** `select count(*) from public.security_events` returns 0 (table exists, empty).
- [ ] **Health check:** `curl https://stackivo.me/api/health` returns `{ "ok": true, ... }`.
- [ ] **Request ID stamped:** any response has an `x-request-id` header (visible in DevTools → Network → Headers).
- [ ] **Sentry capturing:** force an error → it appears in Sentry within 60s with a clean stack trace (source maps resolved).
- [ ] **PostHog capturing:** sign up a fresh account → see `auth.user.signed_up` in PostHog within 60s.
- [ ] **Vercel Analytics:** Vercel Dashboard → Project → **Analytics** tab shows page views.
- [ ] **Vercel Speed Insights:** Vercel Dashboard → Project → **Speed Insights** tab shows real-user metrics within ~24h of traffic.
- [ ] **Cron monitor running:** Vercel → Cron Jobs → `/api/cron/monitor` shows 200 responses every 15 min.
- [ ] **Security events writing:** trigger a failed login → `select * from public.security_events where kind = 'auth_login_failed'` shows a row.
- [ ] **Brevo webhook landing:** send a test email → `select status from public.delivery_logs order by created_at desc limit 1` advances to `delivered`.
- [ ] **UptimeRobot polling:** monitor shows >99% uptime over its first 24h window.
- [ ] **Slack alert wiring:** test described in section 4c posts a message to `#ops-alerts`.

---

## 12. Troubleshooting

### Sentry shows no events
- Confirm `NEXT_PUBLIC_SENTRY_DSN` is set in the **right environment** (Production, not just Development).
- The SDK auto-disables when `runtimeEnv === "development"` — that's intentional. Test in Preview or Production deploys.
- DevTools → Network → look for `*.sentry.io` POST requests. If none, the SDK didn't initialise — check the browser console for `[sentry]` warnings.
- Stack traces showing minified code? `SENTRY_AUTH_TOKEN` not set during build — sourcemap upload skipped.

### PostHog shows no events
- DevTools → Network → look for `eu.i.posthog.com` (or `us.i.posthog.com`) POST requests.
- DNT browser setting blocks PostHog — disable in browser to verify.
- `NEXT_PUBLIC_POSTHOG_KEY` typo? Check Vercel env vars → redeploy.

### Cron monitor returns 401
- `CRON_SECRET` not set in Production env, OR Vercel Cron isn't sending the Bearer header. Verify under Vercel → Cron Jobs → click the job → **Logs**.

### Slack alerts spam every 15 min
- A real probe is failing repeatedly — find which by `select * from public.security_events where kind = 'cron_monitor_alert' order by created_at desc limit 5;` and inspect the `metadata.findings`.
- If you want to silence temporarily: unset `OPS_SLACK_WEBHOOK_URL` in Vercel and redeploy.

### Health check returns 503
- Database is unreachable from the Vercel function. Check Supabase → **Database → Health** for outages.
- `SUPABASE_SERVICE_ROLE_KEY` rotated without redeploying? The admin client failed to authenticate.

---

## 13. Rollback plan

If any service misbehaves and you need to disable it without a redeploy:

| Service | Disable via |
| --- | --- |
| Sentry | Unset `NEXT_PUBLIC_SENTRY_DSN` in Vercel, redeploy |
| PostHog | Unset `NEXT_PUBLIC_POSTHOG_KEY` in Vercel, redeploy |
| Slack alerts | Unset `OPS_SLACK_WEBHOOK_URL` in Vercel, redeploy |
| Cron monitor | Unset `CRON_SECRET` (route returns 404) — don't delete `vercel.json` schedule, Vercel will simply log 401s |
| Brevo webhook | Unset `BREVO_WEBHOOK_SECRET` (endpoint returns 404 to all callers) |
| Vercel Analytics / Speed Insights | Vercel Dashboard → Project → Analytics → toggle off |
| UptimeRobot | Pause the monitor in their dashboard |

Each toggle is a single env-var change + redeploy, ~2 minutes per service.

---

## 14. What you DO NOT need to do

The codebase already handles these — no manual setup required:

- ✅ PII redaction (`src/lib/logger/redact.ts` runs on every Sentry event + every server log)
- ✅ Per-route error boundaries (`(dashboard)/error.tsx`, `(public)/error.tsx`, `(onboarding)/error.tsx`, `global-error.tsx`)
- ✅ Request-id correlation (middleware stamps every request)
- ✅ Security event audit trail writes (auth + webhook signature failures auto-emit)
- ✅ PostHog identify on signup + login (with hashed email)
- ✅ Cron schedule (`vercel.json`)
- ✅ Source-map upload during `next build` (when `SENTRY_AUTH_TOKEN` is set)
- ✅ Graceful no-op behaviour when any env var is unset

---

## Appendix A: Cost projection at scale

If your usage stays in the free tiers, total observability cost is **$0/month indefinitely**.

Likely paid-tier triggers:

| Service | Free tier limit | Trigger | Paid cost |
| --- | --- | --- | --- |
| Sentry | 5k errors / mo | A buggy release flooding errors | $26/mo (Team) for 50k errors |
| PostHog | 1M events / mo | ~10k DAU with normal usage | $0.00005/event past free (≈$0.50 per extra 10k events) |
| Better Stack | 1 GB / 3d retention | ~1k DAU sustained | $25/mo for 30 GB / 30d |
| UptimeRobot | 50 monitors / 5-min | More frequent polling needed | $7/mo for 1-min intervals |

Realistic cost at 10k DAU: ~$30–50/month total observability spend.

---

## Appendix B: Files to reference

| File | What it does |
| --- | --- |
| `src/lib/logger/redact.ts` | PII redactor — applied automatically to Sentry + logs + analytics |
| `src/lib/logger/index.ts` | `log.{debug,info,warn,error}()` structured logger |
| `src/lib/analytics/events.ts` | Event name catalogue — keep in sync when adding new tracked events |
| `src/lib/analytics/server.ts` | Server-side `identifyServer()` + `trackServerEvent()` |
| `src/lib/analytics/track.ts` | Client-side `useTrack()` hook |
| `src/lib/security-events/server.ts` | `recordSecurityEvent()` helper |
| `sentry.client.config.ts` | Browser Sentry config |
| `sentry.server.config.ts` | Node Sentry config |
| `sentry.edge.config.ts` | Edge Sentry config |
| `instrumentation.ts` | Server/edge runtime entry |
| `instrumentation-client.ts` | Client runtime entry |
| `next.config.ts` | Conditional Sentry plugin wrap |
| `vercel.json` | Cron schedule |
| `src/app/api/health/route.ts` | Synthetic monitor target |
| `src/app/api/cron/monitor/route.ts` | Cron probe + Slack alert |
| `supabase/migrations/0018_security_events.sql` | Security events table |

If you ever need to extend tracking: add the event name to `events.ts`, then call `trackServerEvent` (server) or the `useTrack` hook (client). The redactor + identify flow happen automatically.
