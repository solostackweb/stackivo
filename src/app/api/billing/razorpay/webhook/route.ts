/**
 * Razorpay webhook endpoint.
 *
 *   POST /api/billing/razorpay/webhook
 *
 * Razorpay calls this URL whenever a subscription / payment event fires.
 * We verify the HMAC signature against `RAZORPAY_WEBHOOK_SECRET`, then
 * route the event into the idempotent dispatcher in
 * `@/features/billing/webhook`.
 *
 * Configure in Razorpay Dashboard → Settings → Webhooks with the events
 * listed in `EXPECTED_EVENTS`.
 */

import { NextResponse } from "next/server";
import { handleRazorpayEvent } from "@/features/billing/webhook";
import { verifyWebhookSignature } from "@/features/billing/razorpay/webhook-verify";
import { recordSecurityEvent } from "@/lib/security-events/server";

export const runtime = "nodejs"; // node:crypto + service role
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const eventId = req.headers.get("x-razorpay-event-id");

  if (!eventId) {
    return NextResponse.json(
      { ok: false, error: "Missing x-razorpay-event-id" },
      { status: 400 },
    );
  }

  let valid = false;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Verification error",
      },
      { status: 500 },
    );
  }

  if (!valid) {
    await recordSecurityEvent({
      kind: "webhook_signature_invalid",
      severity: "alert",
      metadata: { provider: "razorpay", event_id: eventId },
    });
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 },
    );
  }

  try {
    const result = await handleRazorpayEvent({ eventId, rawBody });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    // Returning 500 lets Razorpay retry per its retry policy.
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
