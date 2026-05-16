import "server-only";

/**
 * Razorpay webhook signature verification.
 *
 * Razorpay signs webhook requests with HMAC-SHA256 of the raw request body
 * using the webhook secret configured in the Dashboard. The signature is
 * sent as the `x-razorpay-signature` header. We MUST verify it on every
 * incoming event before trusting any of the payload.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { requireServerEnv } from "@/config/env";

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  if (!signature) return false;
  const env = requireServerEnv();
  if (!env.razorpayWebhookSecret) {
    throw new Error(
      "[billing] RAZORPAY_WEBHOOK_SECRET is not configured. " +
        "Cannot verify incoming webhooks.",
    );
  }

  const expected = createHmac("sha256", env.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
