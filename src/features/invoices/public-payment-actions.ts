"use server";

/**
 * Public (anonymous) server actions invoked from the `/i/<token>`
 * payment page. Anyone with a valid token can call these; we never
 * expose the freelancer's Razorpay secret to the client and we apply
 * IP-based rate limiting on order creation.
 */

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isValidPublicShareToken } from "@/features/share/server";
import { getClientIp, publicSignLimit } from "@/lib/rate-limit";
import {
  getUserRazorpayCredentials,
  createUserRazorpayOrder,
  UserRazorpayError,
} from "@/features/billing/razorpay/user-account";
import { sendInvoiceReceiptAction } from "@/features/invoices/delivery";
import type { InvoicePaymentAttemptRow, InvoiceRow } from "@/lib/supabase/types";

export type PublicPaymentResult =
  | {
      ok: true;
      keyId: string;
      orderId: string;
      amountPaise: number;
      currency: string;
      invoiceNumber: string;
    }
  | { ok: false; error: string };

/**
 * Create a Razorpay order against the invoice owner's account so the
 * client can pay this specific invoice. The action expects the public
 * token of the invoice — never an internal id.
 *
 * Idempotency: if a `created` order exists for this invoice that hasn't
 * been paid against, we return it instead of opening a new one. This
 * prevents duplicate orders if the client refreshes the checkout modal.
 */
export async function createInvoicePaymentOrderAction(
  token: string,
): Promise<PublicPaymentResult> {
  if (!isValidPublicShareToken(token)) {
    return { ok: false, error: "Invalid invoice link." };
  }

  const ip = await getClientIp();
  const gate = await publicSignLimit(`pay:${ip}:${token}`);
  if (!gate.ok) return { ok: false, error: gate.message };

  const admin = getAdminSupabase();
  const { data: invoiceRow } = await admin
    .from("invoices")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!invoiceRow) return { ok: false, error: "Invoice not found." };
  const invoice = invoiceRow as unknown as InvoiceRow;

  if (invoice.status === "paid") {
    return { ok: false, error: "This invoice has already been paid." };
  }

  const total = Number(invoice.total_amount);
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "This invoice has no amount due." };
  }
  const amountPaise = Math.round(total * 100);
  const currency = invoice.currency || "INR";

  const creds = await getUserRazorpayCredentials(invoice.user_id);
  if (!creds) {
    return {
      ok: false,
      error:
        "The freelancer hasn't connected a payment method yet. Please contact them.",
    };
  }

  // Reuse an outstanding order if we have one — saves a Razorpay round-trip
  // and avoids littering their dashboard.
  const { data: existingRow } = await admin
    .from("invoice_payment_attempts")
    .select("*")
    .eq("invoice_id", invoice.id)
    .eq("status", "created")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const existing = existingRow as InvoicePaymentAttemptRow | null;
  if (existing?.razorpay_order_id) {
    return {
      ok: true,
      keyId: creds.keyId,
      orderId: existing.razorpay_order_id,
      amountPaise,
      currency,
      invoiceNumber: invoice.invoice_number,
    };
  }

  let order;
  try {
    order = await createUserRazorpayOrder(creds, {
      amountPaise,
      currency,
      receipt: `inv_${invoice.invoice_number}`.slice(0, 40),
      notes: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        user_id: invoice.user_id,
        public_token: token,
      },
    });
  } catch (err) {
    const message =
      err instanceof UserRazorpayError
        ? err.message
        : "We couldn't start the payment. Please try again.";
    await admin.from("invoice_payment_attempts").insert({
      invoice_id: invoice.id,
      user_id: invoice.user_id,
      amount: total,
      currency,
      status: "failed",
      error_description: message,
    } as never);
    return { ok: false, error: message };
  }

  await admin.from("invoice_payment_attempts").insert({
    invoice_id: invoice.id,
    user_id: invoice.user_id,
    razorpay_order_id: order.id,
    amount: total,
    currency,
    status: "created",
  } as never);

  return {
    ok: true,
    keyId: creds.keyId,
    orderId: order.id,
    amountPaise,
    currency,
    invoiceNumber: invoice.invoice_number,
  };
}

export type VerifyPaymentResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; error: string };

/**
 * Verify a Razorpay one-off payment using the freelancer's secret.
 *
 * Razorpay's checkout `handler` callback hands us:
 *   - `razorpay_payment_id`
 *   - `razorpay_order_id`
 *   - `razorpay_signature` (HMAC-SHA256 of `${order_id}|${payment_id}` with
 *     the merchant secret)
 *
 * We HMAC the same string with the freelancer's stored secret and compare.
 * On success we mark the invoice paid (idempotent), record the attempt,
 * stamp activity, and trigger the receipt email.
 *
 * This pattern is documented in:
 *   https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#16-verify-payment-signature
 */
export async function verifyInvoicePaymentAction(input: {
  token: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<VerifyPaymentResult> {
  if (!isValidPublicShareToken(input.token)) {
    return { ok: false, error: "Invalid invoice link." };
  }
  const ip = await getClientIp();
  const gate = await publicSignLimit(`pay-verify:${ip}:${input.token}`);
  if (!gate.ok) return { ok: false, error: gate.message };

  const admin = getAdminSupabase();
  const { data: invoiceRow } = await admin
    .from("invoices")
    .select("*")
    .eq("public_token", input.token)
    .maybeSingle();
  if (!invoiceRow) return { ok: false, error: "Invoice not found." };
  const invoice = invoiceRow as unknown as InvoiceRow;

  if (invoice.status === "paid") {
    return { ok: true, alreadyPaid: true };
  }

  const creds = await getUserRazorpayCredentials(invoice.user_id);
  if (!creds) {
    return {
      ok: false,
      error: "Freelancer hasn't connected payments. Cannot verify.",
    };
  }

  // HMAC verify ----------------------------------------------------------
  const expected = crypto
    .createHmac("sha256", creds.keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  // `timingSafeEqual` requires equal-length buffers — bail early on length
  // mismatch to avoid throwing.
  if (expected.length !== input.razorpaySignature.length) {
    return { ok: false, error: "Invalid payment signature." };
  }
  const ok = crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(input.razorpaySignature, "hex"),
  );
  if (!ok) {
    return { ok: false, error: "Invalid payment signature." };
  }

  // Persist payment + flip invoice -------------------------------------
  const now = new Date().toISOString();
  await admin
    .from("invoices")
    .update({
      status: "paid",
      paid_at: now,
      payment_status: "captured",
      payment_method: "razorpay",
      payment_reference: input.razorpayPaymentId,
      payment_amount: Number(invoice.total_amount),
      payment_recorded_at: now,
    } as never)
    .eq("id", invoice.id);

  await admin
    .from("invoice_payment_attempts")
    .upsert(
      {
        invoice_id: invoice.id,
        user_id: invoice.user_id,
        razorpay_order_id: input.razorpayOrderId,
        razorpay_payment_id: input.razorpayPaymentId,
        amount: Number(invoice.total_amount),
        currency: invoice.currency,
        status: "captured",
      } as never,
      { onConflict: "razorpay_payment_id" },
    );

  // Activity row + freelancer notification (admin-bypass since the payer
  // is anonymous).
  await admin.from("activity_events").insert({
    user_id: invoice.user_id,
    kind: "invoice_paid",
    entity_type: "invoice",
    entity_id: invoice.id,
    title: `Invoice ${invoice.invoice_number} paid`,
    metadata: {
      via: "razorpay",
      payment_id: input.razorpayPaymentId,
      amount: Number(invoice.total_amount),
      currency: invoice.currency,
    },
  } as never);

  await admin.from("notifications").insert({
    user_id: invoice.user_id,
    type: "invoice_paid",
    title: `Invoice ${invoice.invoice_number} paid`,
    message: `Your client just paid ${invoice.currency} ${invoice.total_amount}.`,
  } as never);

  // Receipt email — fire-and-forget. The freelancer will see "receipt
  // sent" in their delivery logs. We don't fail the public verify on
  // email errors.
  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  if (invoice.client_id) {
    const { data: client } = await admin
      .from("clients")
      .select("email, full_name")
      .eq("id", invoice.client_id)
      .maybeSingle();
    const c = client as { email?: string | null; full_name?: string | null } | null;
    recipientEmail = c?.email ?? null;
    recipientName = c?.full_name ?? null;
  }
  if (recipientEmail) {
    void sendInvoiceReceiptAction({
      invoiceId: invoice.id,
      toEmail: recipientEmail,
      toName: recipientName,
    });
  }

  // Refresh the freelancer's dashboard view next time they hit it.
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoice.id}`);

  return { ok: true, alreadyPaid: false };
}
