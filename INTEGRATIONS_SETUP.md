# Integrations Setup — Stackivo

This document documents how to configure, test, and operate the production integrations used by Stackivo.

Targets covered
- Razorpay (subscriptions, webhooks)
- Brevo (transactional email)
- Supabase (auth, DB, storage)
- Supabase Storage & PDF delivery

Important code locations
- Env/typed access: `src/config/env.ts`
- Razorpay webhook route: `src/app/api/billing/razorpay/webhook/route.ts`
- Razorpay client: `src/features/billing/razorpay/client.ts`
- Billing sync & webhook router: `src/features/billing/webhook.ts` and `src/features/billing/server.ts`
- Brevo client & orchestrator: `src/features/email/client.ts` and `src/features/email/send.ts`
- Delivery logs / DB schema: `supabase/migrations/0008_document_delivery.sql` and `src/lib/supabase/types.ts`
- PDF generation API: `src/app/api/invoices/[id]/pdf/route.ts`, `src/app/api/contracts/[id]/pdf/route.ts`
- Storage helpers (profile assets): `src/features/profile/storage.ts` and `src/features/profile/storage-client.ts`

Environment variables (required)
- NEXT_PUBLIC_APP_URL (public)
- NEXT_PUBLIC_SUPABASE_URL (public)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (public)
- SUPABASE_SERVICE_ROLE_KEY (server-only)

Razorpay
- Required envs: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, plan IDs (e.g. `RAZORPAY_PLAN_PRO_MONTHLY`).
- Code: server-only HTTP calls to Razorpay are implemented in `src/features/billing/razorpay/client.ts`. The checkout flow is started by `src/features/billing/server.ts` → `startCheckout()`.
- Webhooks: `src/app/api/billing/razorpay/webhook/route.ts` verifies HMAC-SHA256 (see `src/features/billing/razorpay/webhook-verify.ts`) and routes to `src/features/billing/webhook.ts`.

Brevo (Transactional Email)
- Required envs: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`.
- Code: sending is implemented in `src/features/email/client.ts` (`sendBrevoEmail`) and orchestrated in `src/features/email/send.ts` which writes `delivery_logs`.
- Webhooks: delivery status webhooks are referenced in DB migrations but a public webhook endpoint is not present — add if you want inbound delivery events persisted.

Supabase
- Use `supabase` CLI for migrations in `supabase/migrations`.
- Local dev: `npx supabase start` then `npx supabase db reset` applies migrations.
- Service-role key: `SUPABASE_SERVICE_ROLE_KEY` MUST be server-only and present in `.env.local` for webhook handlers and admin actions.

Storage & PDFs
- Storage buckets are defined in `supabase/migrations/0004_storage_buckets.sql`. Confirm bucket names (e.g. `profile-images`, `branding-assets`).
- Signed URLs are created server-side in `src/features/profile/storage.ts` and `src/features/profile/storage-client.ts`.
- PDF generation endpoints exist for invoices and contracts and render via `src/features/documents/pdf/*`.

Security & Best Practices
- Never commit `.env.local` or service-role keys. Keep `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, and `BREVO_API_KEY` server-only.
- Use `requireServerEnv()` (already present in code) to guard server-only imports.
- Webhook handlers MUST verify signatures and be idempotent. Razorpay handler already verifies and logs events in `billing_events`.

Troubleshooting
- If webhooks appear to not arrive, confirm public webhook URL and check `billing_events` table for errors (webhook route writes errors into event row).
- For email delivery failures, check `delivery_logs` and the `BrevoError` payload saved by `src/features/email/client.ts`.

Next actions (recommended)
1. Add a Brevo webhook route to persist delivery events (if you want inbound delivery tracking).
2. Add small local test helpers to simulate Razorpay webhooks (script + signature generator).
3. Harden `.env.example` and add quick-check script to validate required envs before starting dev server.
