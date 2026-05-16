# Webhooks Setup & Local Testing

This doc focuses on webhook verification, idempotency, and local testing best practices for Razorpay (primary) and Brevo (optional delivery events).

Razorpay webhooks (already implemented)
- Route: `POST /api/billing/razorpay/webhook` → `src/app/api/billing/razorpay/webhook/route.ts`.
- Signature verification: `src/features/billing/razorpay/webhook-verify.ts` uses HMAC-SHA256 against `RAZORPAY_WEBHOOK_SECRET`.
- Idempotency: `src/features/billing/webhook.ts` logs events to `billing_events` and skips already-processed events.

Local webhook testing (ngrok)
1. Start ngrok:
   ```bash
   ngrok http 3000
   ```
2. Configure Razorpay Dashboard → Webhooks → Add endpoint:
   - URL: `https://<your-ngrok-id>.ngrok.io/api/billing/razorpay/webhook`
   - Events: subscribe to `subscription.*`, `payment.*`, `invoice.*` as required.
3. Test checkout in the app; Razorpay will call your ngrok URL.

Simulating webhooks locally (curl + signature)
- To replicate Razorpay webhook events without triggering live Razorpay, you can POST a payload and compute the `x-razorpay-signature` header yourself.

Example (bash):
```bash
RAW='{"entity":"event","event":"payment.captured","payload":{}}'
SECRET='your_webhook_secret_here'
SIG=$(printf "%s" "$RAW" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)
curl -X POST "http://localhost:3000/api/billing/razorpay/webhook" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -H "x-razorpay-event-id: test-event-123" \
  -d "$RAW"
```

PowerShell (Windows) signature example
```powershell
$raw = '{"entity":"event","event":"payment.captured","payload":{}}'
$secret = 'your_webhook_secret_here'
$hmac = [System.Text.Encoding]::UTF8.GetBytes($raw) | ForEach-Object { $_ }
# Use a small helper script or Node to compute HMAC-SHA256 in PowerShell reliably.
```

Notes on idempotency
- The app logs every incoming event in `billing_events.event_id`. The handler returns 200 for already-processed events.
- Returning 500 on transient failures will let Razorpay retry. Errors are persisted to the event row for debugging.

Brevo webhooks (optional)
- If you want to track delivery/open/bounce events from Brevo, implement a webhook route (e.g. `POST /api/email/brevo/webhook`) that:
  - Verifies the request origin (Brevo signs webhooks via secret in some plans)
  - Writes events into `delivery_logs`
  - Runs as service-role (use `getAdminSupabase()`)

Security checklist
- Only accept webhooks over HTTPS.
- Verify signatures and fail fast on missing/invalid signatures.
- Make handlers idempotent and log failures for replay.
- Use service-role client for DB writes that bypass RLS.
