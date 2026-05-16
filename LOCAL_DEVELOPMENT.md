# Local Development — Stackivo

Goal: run full app locally with real integration flows (Supabase, Razorpay test mode, Brevo test account) and be able to test webhooks, uploads, PDFs, and emails.

Quick start (Mac/Windows/WSL)
1. Copy `.env.example` → `.env.local` and fill values (see `ENVIRONMENT_SETUP.md`).
2. Start Supabase locally (optional but recommended for full parity):

```bash
# Requires supabase CLI (https://supabase.com/docs/guides/cli)
npx supabase start
npx supabase db reset   # applies migrations in supabase/migrations
```

3. Start Next.js dev server

```bash
npm install
npm run dev
# or
pnpm dev
```

4. Start the app at `http://localhost:3000`.

Razorpay local testing
- Use Razorpay test keys in `.env.local` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- To receive webhooks locally, expose your dev server via a tunnel (ngrok recommended):

```bash
# start ngrok (install first)
ngrok http 3000
# In Razorpay Dashboard → Webhooks, set endpoint to: https://<your-ngrok>.ngrok.io/api/billing/razorpay/webhook
```

- When testing checkout flows, ensure `NEXT_PUBLIC_RAZORPAY_KEY_ID` is the test publishable key.

Brevo local testing
- Use a dedicated Brevo account and API key for dev. Set `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`.
- You can send test emails using the app's flows (invoice send / contract send). Inspect `delivery_logs` in Supabase.
- For local email capture, consider routing Brevo outputs to a testing inbox (Brevo provides a sandbox/test environment) or use a disposable sender and inspect logs.

Testing uploads & storage
- Ensure storage buckets exist by running `npx supabase db reset` or by checking `supabase/migrations/0004_storage_buckets.sql`.
- Upload flows (avatar, branding assets) write to `profile-images`/`branding-assets` (confirm names in migration). Signed URLs are created server-side.

Testing PDFs
- Invoice and contract PDF endpoints:
  - `GET /api/invoices/[id]/pdf`
  - `GET /api/contracts/[id]/pdf`
- These require an authenticated session. Use the app UI or curl with auth cookies.

Useful commands
- Regenerate Supabase types after schema changes:
  ```bash
  npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/types.ts
  ```
- Type-check project:
  ```bash
  npm run type-check
  ```

Notes
- If you want to test email delivery without Brevo, calling `dispatchDelivery` will still record `delivery_logs` and will gracefully fail if Brevo is not configured.
- Keep production credentials separate from local dev credentials. Use separate Razorpay/Brevo accounts for dev and prod.
