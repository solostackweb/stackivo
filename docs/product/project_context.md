# Project Context — SoloStack (Stackivo)

Last updated: 2026-05-17

This document is the single reference for the Stackivo codebase. It includes product context, architecture, and every setup checklist required to run the platform end-to-end.

---

## Product Overview

Stackivo is a SaaS operating system for freelancers and solo professionals.

Primary workflows:
- onboarding and business identity setup
- client management
- GST-compliant invoices and payment tracking
- contracts, proposals, and client signatures
- project and time tracking
- portal sharing and notifications

Product philosophy:
- minimal, premium, modern
- mobile-first, workflow-focused, low cognitive load
- not ERP/accounting complexity
- inspired by Linear, Vercel, Stripe Dashboard, and Notion

---

## Tech Stack

Frontend:
- Next.js App Router (TypeScript)
- Tailwind CSS, shadcn/ui, Radix
- Lucide React, Recharts

Backend:
- Supabase (PostgreSQL, Auth, Storage)
- Row Level Security (RLS)

Payments:
- Razorpay Subscriptions

Email:
- Brevo transactional email

Analytics:
- PostHog, Sentry, Microsoft Clarity

Support:
- Crisp chat, Zoho Desk

Deployment:
- Vercel (no native cron manifest in repo)

---

## Project Structure (high-level)

- `src/app` — Next.js App Router routes
- `src/components` — shared UI, layout, providers
- `src/features` — feature modules (auth, billing, portal, support)
- `src/lib` — helpers, analytics, logging, supabase clients
- `supabase/migrations` — DB schema and policies
- `docs/product` — product and architecture docs

---

## Environment Setup (required)

Checklist:
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill all required `NEXT_PUBLIC_*` vars
- [ ] Keep all secrets server-only

Required public envs:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

Required server envs:
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`

Portal storage envs (R2):
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL` (optional)

Cron auth:
- `CRON_SECRET`

Observability envs (prod):
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `OPS_SLACK_WEBHOOK_URL`
- `BREVO_WEBHOOK_SECRET`

Support envs:
- `NEXT_PUBLIC_CRISP_WEBSITE_ID`
- `CRISP_WEBHOOK_SECRET`
- `CRISP_API_IDENTIFIER` (optional)
- `CRISP_API_KEY` (optional)
- `ZOHO_DESK_ORG_ID`
- `ZOHO_DESK_ACCESS_TOKEN`
- `ZOHO_DESK_DEPARTMENT_ID`
- `ZOHO_DESK_API_BASE`
- `ZOHO_DESK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_ZOHO_DESK_HELP_URL`

Sales/marketing envs:
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- `NEXT_PUBLIC_CAL_COM_URL`
- `NEXT_PUBLIC_LOOM_DEMO_URL`
- `BREVO_NEWSLETTER_LIST_ID`

---

## Local Development

Checklist:
- [ ] `npm install`
- [ ] `npx supabase start` (optional, for full parity)
- [ ] `npx supabase db reset` (applies migrations)
- [ ] `npm run dev` and open `http://localhost:3000`

Useful commands:
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run type-check`

---

## Supabase and Migrations

Core migrations:
- `0001_init_schema.sql`
- `0002_subscriptions.sql`
- `0003_rls_policies.sql`
- `0004_storage_buckets.sql`

Operational migrations (admin/support/security):
- `0018_security_events.sql`
- `0019_admin_console.sql`
- `0020_admin_query.sql`
- `0022_support_threads.sql`

Portal and payments:
- `0023_invoice_payments.sql`
- `0024_client_portal.sql`

Checklist:
- [ ] `supabase db push` in production/staging
- [ ] Verify `security_events`, `admin_actions`, `support_threads` tables exist
- [ ] Confirm RLS is enabled on all business tables

---

## Subscription Model

Free Plan:
- Maximum 5 lifetime-created clients
- Unlimited invoices, projects, contracts, time tracking
- Full operational access

Important:
- Deleting clients does NOT reduce usage count.

Pro Plan:
- Unlimited clients
- Advanced branding
- Future premium capabilities

Business Plan:
- Placeholder for future expansion

Source of truth:
- `src/features/subscription/plans.ts`

---

## Authentication and Routing

Auth flows:
- Email/password signup and login
- Google OAuth (optional, via Supabase)
- Forgot password and reset flow

Routing:
- Middleware enforces auth for `/dashboard/*` and `/admin/*`
- Auth routes redirect authenticated users to `/dashboard`

---

## Cron and Scheduled Jobs (external)

Vercel-native cron has been removed from the repo. Use external HTTP schedulers.

Endpoints (Authorization: Bearer CRON_SECRET required):
- `/api/cron/monitor` — every 15 minutes
- `/api/cron/admin-export` — hourly at :05
- `/api/cron/invoices-overdue` — daily at 03:30 UTC

Checklist:
- [ ] Create cron jobs in UptimeRobot, cron-job.org, EasyCron, or GitHub Actions
- [ ] Include the Bearer token
- [ ] Remove any old Vercel cron jobs from the dashboard

---

## Client Portal Setup (Phase 0a + Phase 1)

Checklist:
- [ ] Apply migrations `0023_invoice_payments.sql` and `0024_client_portal.sql`
- [ ] Configure Cloudflare R2 bucket and CORS
- [ ] Add R2 credentials in env
- [ ] Set `CRON_SECRET` and schedule `/api/cron/invoices-overdue`
- [ ] Configure Brevo sender for portal invites

R2 CORS policy:
```
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

Smoke tests:
- [ ] Send an invoice, pay via Razorpay, verify receipt email
- [ ] Trigger overdue cron, verify reminders and status
- [ ] Create portal, invite client, accept invite, post comments
- [ ] Upload portal file, download via presigned URL

---

## Payments (Razorpay)

Checklist:
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` for client checkout
- [ ] Configure webhook endpoint `/api/billing/razorpay/webhook`
- [ ] Verify webhook signature (HMAC-SHA256)

Local testing:
- Use ngrok to expose `/api/billing/razorpay/webhook`
- Use Razorpay test cards for checkout

---

## Email (Brevo)

Checklist:
- [ ] Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`
- [ ] Configure optional webhook with `BREVO_WEBHOOK_SECRET`
- [ ] Verify delivery logs in `delivery_logs`

---

## Observability

Checklist:
- [ ] Apply migration `0018_security_events.sql`
- [ ] Configure Sentry (DSN + auth token)
- [ ] Configure PostHog (EU host recommended)
- [ ] Configure Slack webhook for ops alerts
- [ ] (Optional) Better Stack log drain
- [ ] Configure UptimeRobot monitor for `/api/health`

Verification:
- [ ] Sentry captures errors with sourcemaps
- [ ] PostHog captures `$pageview` and core events
- [ ] `/api/health` returns ok
- [ ] Cron monitor returns 200 with Bearer token

---

## Support System

Checklist:
- [ ] Apply migration `0022_support_threads.sql`
- [ ] Configure Crisp (`NEXT_PUBLIC_CRISP_WEBSITE_ID`, `CRISP_WEBHOOK_SECRET`)
- [ ] Configure Zoho Desk API access and webhook
- [ ] Set `NEXT_PUBLIC_ZOHO_DESK_HELP_URL` for `/help`

Verification:
- [ ] Crisp widget visible (auth pages)
- [ ] `/help` renders live KB
- [ ] Bug-report form creates tickets (Zoho) or emails (fallback)
- [ ] `/admin/support` shows merged threads

---

## Founder/Admin Console

Checklist:
- [ ] Apply migrations `0019_admin_console.sql` and `0020_admin_query.sql`
- [ ] Promote admin via SQL (`auth.users.raw_app_meta_data.role = "admin"`)
- [ ] Log out and back in
- [ ] Verify `/admin` loads

Phases:
- Phase 1: read-only views + audit log
- Phase 2: operational actions (refunds, suspend, view-as, broadcasts)
- Phase 3: SQL editor, notes, embedded analytics

---

## Sales and Marketing Stack

Checklist:
- [ ] Microsoft Clarity set via `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- [ ] Cal.com booking set via `NEXT_PUBLIC_CAL_COM_URL` (for `/talk`)
- [ ] Loom demo set via `NEXT_PUBLIC_LOOM_DEMO_URL` (for `/demo`)
- [ ] Newsletter list set via `BREVO_NEWSLETTER_LIST_ID`

---

## Webhooks and Idempotency

Checklist:
- [ ] Razorpay webhook signature verification enabled
- [ ] Idempotency uses `billing_events.event_id`
- [ ] External retries safe to re-run

---

## Build and Runtime Notes

- PII hashing uses Web Crypto (`hashedEmail`) to avoid Node-only crypto in Edge bundles
- Server Action `_testParse` is async
- PostHog pageview tracking is wrapped in `React.Suspense`

---

## Current Development Phase

Stackivo is in Production Stabilization Phase.

Main priorities:
1. Bug fixing
2. Workflow correctness
3. Auth/session stability
4. Billing correctness
5. GST correctness
6. Performance optimization
7. Security/RLS audit
8. Production hardening
9. Deployment readiness
10. Beta-launch readiness

---

## Known Risks To Watch

- Middleware redirect loops
- Hydration mismatches
- Subscription-state stale caching
- RLS access edge cases
- GST recalculation correctness
- Dashboard stale data
- Duplicate queries
- Mobile responsive edge cases
- Public-share token safety
- File upload permission mismatches
- Razorpay webhook synchronization
- Auth session refresh edge cases

---

## Final Product Goal

Stackivo should feel like:
- a real production SaaS platform
- a trusted freelancer operating system
- a premium modern workspace
- a stable business-critical tool

The system should prioritize:
- reliability
- clarity
- correctness
- operational trust
- smooth workflows
- scalable architecture