# Environment Setup — Stackivo

This document explains required environment variables, how to keep secrets safe, and quick validation steps.

Files
- `.env.example` — canonical list of vars (already in repo)
- Copy `.env.example` → `.env.local` for local development (do NOT commit `.env.local`).

Key variables (summary)
- Public (prefixed `NEXT_PUBLIC_*`) — safe in browser bundles:
  - `NEXT_PUBLIC_APP_URL` (e.g. http://localhost:3000)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (public Razorpay key id)

- Server-only (DO NOT expose to browser):
  - `SUPABASE_SERVICE_ROLE_KEY` — service-role supabase key used by cron/webhooks/admin. Keep secret.
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
  - `BREVO_API_KEY`

Typed access
- Use `src/config/env.ts`:
  - Public values are exported from `env`.
  - Server-only values are available from `requireServerEnv()` which throws if used client-side.

Validation helper (recommended)
- Add a small `scripts/validate-env.js` that imports `src/config/env.ts` to fail fast when envs are missing.

Example `.env.local` (dev)
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key_here
SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=rzp_secret_xxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
BREVO_API_KEY=brevo_test_xxx
BREVO_SENDER_EMAIL=dev@yourdomain.test
BREVO_SENDER_NAME=Stackivo Dev
```

Protecting secrets
- Never commit `.env.local`.
- Use platform secrets for production (Vercel / environment variables).
- Rotate keys if leaked.

Deployment checklist
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in production-only env configuration and never in any client bundle.
- Confirm `NEXT_PUBLIC_RAZORPAY_KEY_ID` is the correct publishable key for the environment.
- Confirm webhook endpoints in Razorpay/Brevo point to your production URLs.

Optional automation
- CI job to validate `env` presence before running migrations or deploys.
- Small script to show missing envs by attempting to import `src/config/env.ts` in a Node process.

