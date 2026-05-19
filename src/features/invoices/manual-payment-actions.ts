"use server";

/**
 * Manual "mark invoice paid" action for the UPI flow.
 *
 * This is the freelancer-side counterpart to the public Razorpay verify
 * action used in stackivo_managed. Because UPI payments happen outside
 * Stackivo, only the freelancer can authoritatively say a transfer
 * arrived. They enter the UPI reference (UTR / txn id) and optional
 * notes; we:
 *
 *   1. Verify the invoice belongs to the calling user.
 *   2. Insert an `invoice_manual_confirmations` audit row.
 *   3. Generate the receipt (`generateReceiptForInvoice`).
 *   4. Flip the invoice to `paid`.
 *   5. Email the receipt to the client.
 *
 * The action is idempotent: if the invoice is already `paid`, we return
 * `{ ok: true, alreadyPaid: true }` without writing anything.
 *
 * No Razorpay round-trip happens here. Stackivo cannot verify that the
 * UPI transfer actually occurred — we are deliberately trusting the
 * freelancer's confirmation, which is the explicit design of this flow.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { getUserPaymentMethod } from "@/features/billing/payment-methods";
import { generateReceiptForInvoice } from "./receipts";
import { sendInvoiceReceiptAction } from "./delivery";
import type { InvoiceRow } from "@/lib/supabase/types";

export type ManualPaymentResult =
  | { ok: true; alreadyPaid: boolean; receiptNumber: string }
  | { ok: false; error: string };

const manualSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice."),
  // Optional UPI reference / UTR. Trimmed; empty becomes null.
  reference: z.string().trim().max(120).optional().nullable(),
  // Optional ISO date string for when the money actually arrived; defaults
  // to now if absent. The freelancer can backdate slightly to match their
  // bank statement.
  paidAt: z.string().datetime().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

async function requireUserId(): Promise<string> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
  return user.id;
}

export async function markInvoicePaidManuallyAction(
  _prev: ManualPaymentResult | undefined,
  formData: FormData,
): Promise<ManualPaymentResult> {
  const parsed = manualSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    reference: formData.get("reference") || null,
    paidAt: formData.get("paidAt") || undefined,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten().formErrors[0] ?? "Invalid input.",
    };
  }

  const userId = await requireUserId();
  const admin = getAdminSupabase();

  // --- 1. Ownership + state checks ------------------------------------
  const { data: invoiceRow } = await admin
    .from("invoices")
    .select("*")
    .eq("id", parsed.data.invoiceId)
    .maybeSingle();
  const invoice = invoiceRow as unknown as InvoiceRow | null;
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.user_id !== userId) {
    return { ok: false, error: "You don't own this invoice." };
  }
  if (invoice.status === "paid") {
    return { ok: true, alreadyPaid: true, receiptNumber: "" };
  }

  const total = Number(invoice.total_amount);
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "This invoice has no amount due." };
  }

  // We don't strictly require `payment_method_type = upi_manual` to mark
  // paid — a freelancer might receive a bank transfer outside the flow
  // and want to record it. But we DO tag the manual confirmation with
  // whatever method is configured for clarity in the receipt.
  const method = await getUserPaymentMethod(userId);
  // Tag the receipt with the configured method type. Both manual flows
  // (UPI and bank transfer) produce a "upi_manual" receipt by convention;
  // the reference field carries the distinguishing detail.
  const paymentMethodForReceipt: "upi_manual" =
    method?.type === "upi_manual" ? "upi_manual" : "upi_manual";

  const paidAtIso = parsed.data.paidAt ?? new Date().toISOString();

  // --- 2. Audit row (manual confirmation) -----------------------------
  await admin.from("invoice_manual_confirmations").insert({
    invoice_id: invoice.id,
    user_id: userId,
    confirmed_by_user_id: userId,
    amount: total,
    currency: invoice.currency,
    paid_at: paidAtIso,
    reference: parsed.data.reference ?? null,
    notes: parsed.data.notes ?? null,
  } as never);

  // --- 3. Receipt ----------------------------------------------------
  const clientLookup = invoice.client_id
    ? await admin
        .from("clients")
        .select("email, full_name")
        .eq("id", invoice.client_id)
        .maybeSingle()
    : null;
  const clientRow = clientLookup?.data as
    | { email?: string | null; full_name?: string | null }
    | null;
  const payerEmail = clientRow?.email ?? null;
  const payerName = clientRow?.full_name ?? null;

  let receiptNumber = "";
  try {
    const { receipt } = await generateReceiptForInvoice({
      invoiceId: invoice.id,
      userId,
      paymentMethod: paymentMethodForReceipt,
      amount: total,
      currency: invoice.currency,
      paidAt: paidAtIso,
      payerEmail,
      payerName,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
    });
    receiptNumber = receipt.receipt_number;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not generate receipt: ${err.message}`
          : "Could not generate receipt.",
    };
  }

  // --- 4. Flip invoice ------------------------------------------------
  await admin
    .from("invoices")
    .update({
      status: "paid",
      paid_at: paidAtIso,
      payment_status: "captured",
      payment_method: "upi",
      payment_method_used: "upi_manual",
      payment_reference: parsed.data.reference ?? null,
      payment_amount: total,
      payment_recorded_at: paidAtIso,
    } as never)
    .eq("id", invoice.id)
    .neq("status", "paid");

  // Activity + notification
  await admin.from("activity_events").insert({
    user_id: userId,
    kind: "invoice_paid",
    entity_type: "invoice",
    entity_id: invoice.id,
    title: `Invoice ${invoice.invoice_number} marked paid (UPI)`,
    metadata: {
      via: "upi_manual",
      reference: parsed.data.reference ?? null,
      amount: total,
      currency: invoice.currency,
    },
  } as never);

  await admin.from("notifications").insert({
    user_id: userId,
    type: "invoice_paid",
    title: `Invoice ${invoice.invoice_number} marked paid`,
    message: `Receipt ${receiptNumber} generated and emailed.`,
  } as never);

  // --- 5. Receipt email (fire-and-forget) -----------------------------
  if (payerEmail) {
    void sendInvoiceReceiptAction({
      invoiceId: invoice.id,
      toEmail: payerEmail,
      toName: payerName,
    });
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoice.id}`);

  return { ok: true, alreadyPaid: false, receiptNumber };
}
