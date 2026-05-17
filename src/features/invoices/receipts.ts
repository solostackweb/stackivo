import "server-only";

/**
 * Invoice receipts — generation, lookup, lifecycle.
 *
 * One receipt per successful payment. Receipt numbers are per-user
 * sequential (RCP-YYYY-NNNNNN) and generated atomically by a server-side
 * Postgres function so two concurrent confirms can't collide.
 *
 * Both payment flows call into here:
 *   - Stackivo Managed: `verifyInvoicePaymentAction` and the webhook
 *     dispatcher both call `generateReceiptForInvoice(...)` on capture.
 *   - UPI Manual: the freelancer's manual mark-paid action calls in.
 *
 * Idempotency: we look up by (invoice_id, payment_method, reference)
 * before inserting. A repeat call for the same invoice+payment is a
 * no-op and returns the existing receipt row.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import type {
  InvoiceReceiptRow,
  PaymentMethodType,
} from "@/lib/supabase/types";

export interface GenerateReceiptInput {
  invoiceId: string;
  userId: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  currency: string;
  paidAt: Date | string;
  payerName?: string | null;
  payerEmail?: string | null;
  /**
   * Razorpay payment id for managed; UPI UTR / txn reference for manual.
   * Optional — both flows can omit it (managed should always have one
   * though).
   */
  reference?: string | null;
  notes?: string | null;
}

export interface GenerateReceiptResult {
  receipt: InvoiceReceiptRow;
  /** True if a fresh receipt row was inserted, false if we returned an existing one. */
  created: boolean;
}

export async function generateReceiptForInvoice(
  input: GenerateReceiptInput,
): Promise<GenerateReceiptResult> {
  const admin = getAdminSupabase();
  const paidAtIso =
    typeof input.paidAt === "string"
      ? input.paidAt
      : input.paidAt.toISOString();

  // --- 1. Idempotency check --------------------------------------------
  // Same (invoice, payment_method, reference) → already issued.
  const existing = await findExistingReceipt(
    input.invoiceId,
    input.paymentMethod,
    input.reference ?? null,
  );
  if (existing) {
    return { receipt: existing, created: false };
  }

  // --- 2. Mint a new receipt number ------------------------------------
  // Calls the SECURITY DEFINER function `next_invoice_receipt_number`
  // defined in 0027. The uniqueness constraint on
  // (user_id, receipt_number) is the ultimate guard against any race.
  const numRes = await (admin as unknown as {
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: string | null; error: { message?: string } | null }>;
  }).rpc("next_invoice_receipt_number", { p_user_id: input.userId });
  if (numRes.error || !numRes.data) {
    throw new Error(
      `Could not allocate receipt number: ${numRes.error?.message ?? "unknown"}`,
    );
  }
  const receiptNumber = numRes.data;

  // --- 3. Insert ------------------------------------------------------
  const { data, error } = await admin
    .from("invoice_receipts")
    .insert({
      invoice_id: input.invoiceId,
      user_id: input.userId,
      receipt_number: receiptNumber,
      payment_method: input.paymentMethod,
      amount: input.amount,
      currency: input.currency,
      paid_at: paidAtIso,
      payer_name: input.payerName ?? null,
      payer_email: input.payerEmail ?? null,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    } as never)
    .select("*")
    .single();

  if (error) {
    // Unique constraint hit → another writer beat us. Re-fetch & return
    // their row instead of raising.
    if (error.code === "23505") {
      const after = await findExistingReceipt(
        input.invoiceId,
        input.paymentMethod,
        input.reference ?? null,
      );
      if (after) return { receipt: after, created: false };
    }
    throw new Error(`Failed to insert receipt: ${error.message}`);
  }

  return { receipt: data as InvoiceReceiptRow, created: true };
}

async function findExistingReceipt(
  invoiceId: string,
  paymentMethod: PaymentMethodType,
  reference: string | null,
): Promise<InvoiceReceiptRow | null> {
  const admin = getAdminSupabase();
  let q = admin
    .from("invoice_receipts")
    .select("*")
    .eq("invoice_id", invoiceId)
    .eq("payment_method", paymentMethod);
  if (reference) {
    q = q.eq("reference", reference);
  } else {
    q = q.is("reference", null);
  }
  const { data } = await q.maybeSingle();
  return (data as InvoiceReceiptRow | null) ?? null;
}

// --- Lookups ---------------------------------------------------------------

export async function getReceiptsForInvoice(
  invoiceId: string,
): Promise<InvoiceReceiptRow[]> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("invoice_receipts")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  return (data as InvoiceReceiptRow[] | null) ?? [];
}

export async function getLatestReceiptForInvoice(
  invoiceId: string,
): Promise<InvoiceReceiptRow | null> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("invoice_receipts")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as InvoiceReceiptRow | null) ?? null;
}
