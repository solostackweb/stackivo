import "server-only";

/**
 * Razorpay order creation against the PLATFORM account.
 *
 * Used by the Stackivo Managed payments flow: clients pay invoices into
 * Stackivo's central Razorpay account, then ops manually pays out to the
 * freelancer's bank in 1-2 business days.
 *
 * Kept in a separate module from the subscription `client.ts` so changes
 * here can't accidentally regress the subscription billing path.
 */

import { requireServerEnv } from "@/config/env";

const BASE_URL = "https://api.razorpay.com/v1";

export interface PlatformRazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string> | null;
  created_at: number;
}

export class PlatformRazorpayError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "PlatformRazorpayError";
    this.status = status;
    this.body = body;
  }
}

function platformAuthHeader(): string {
  const env = requireServerEnv();
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new Error(
      "[billing] Platform Razorpay keys not configured. Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.",
    );
  }
  return Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString(
    "base64",
  );
}

/**
 * Create a one-off Razorpay order for an invoice payment under the
 * platform account.
 *
 * `notes.invoice_id` + `notes.user_id` are populated so the webhook can
 * route the eventual `payment.captured` back to the right invoice +
 * freelancer.
 */
export async function createPlatformInvoiceOrder(input: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<PlatformRazorpayOrder> {
  const auth = platformAuthHeader();
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: 1,
    }),
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* fall through */
  }
  if (!res.ok) {
    const desc =
      json &&
      typeof json === "object" &&
      "error" in json &&
      (json as { error?: { description?: string } }).error?.description;
    const msg =
      typeof desc === "string" && desc.length > 0
        ? desc
        : `Razorpay ${res.status} on POST /orders`;
    throw new PlatformRazorpayError(msg, res.status, json);
  }
  return json as PlatformRazorpayOrder;
}

/**
 * HMAC-SHA256 of `${order_id}|${payment_id}` using the PLATFORM secret.
 * Used to verify Razorpay Checkout's post-payment `handler` callback.
 */
export function computePlatformPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): string {
  // Imported lazily so the module remains edge-import-safe; the actual
  // verification path is Node runtime only.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const env = requireServerEnv();
  if (!env.razorpayKeySecret) {
    throw new Error(
      "[billing] RAZORPAY_KEY_SECRET not configured — cannot verify payment signature.",
    );
  }
  return crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
}
