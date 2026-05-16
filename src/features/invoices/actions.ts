"use server";

/**
 * Server actions for invoice persistence.
 *
 * Flow:
 *   1. Validate the form payload (Zod) — same schema as the client form.
 *   2. Resolve seller (current user) + client GST status to choose tax mode.
 *   3. Run the pure calculation engine to derive subtotal/CGST/SGST/IGST/total.
 *   4. Persist the invoice row + replace its line items in a single sequence.
 *   5. Bump `user_profiles.invoice_next_number` so future numbers are unique.
 *   6. Log an activity event.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  invoiceCrudSchema,
  invoiceIdSchema,
  invoiceStatusSchema,
} from "./server-schemas";
import { calculateInvoice } from "./engine";
import { recordActivity } from "@/features/activity/server";
import { createNotification } from "@/features/notifications/server";
import type { ClientRow, UserProfileRow } from "@/lib/supabase/types";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireUserId(): Promise<string> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
  return user.id;
}

/**
 * Pull the form payload — supports either a flat HTML form (rare for
 * complex line-item editors) OR a JSON-encoded `payload` field which is
 * the canonical client-side path.
 */
function readPayload(formData: FormData): unknown {
  const raw = formData.get("payload");
  if (typeof raw === "string" && raw.length > 0) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return {
    clientId: formData.get("clientId"),
    projectId: formData.get("projectId"),
    invoiceNumber: formData.get("invoiceNumber"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    currency: formData.get("currency") ?? "INR",
    status: formData.get("status") ?? "draft",
    notes: formData.get("notes"),
    terms: formData.get("terms"),
    lines: [],
  };
}

interface ResolvedParties {
  seller: { gstRegistered: boolean; stateCode: string | null };
  client: { gstRegistered: boolean; stateCode: string | null };
}

async function resolveParties(
  userId: string,
  clientId: string | undefined,
): Promise<ResolvedParties> {
  const supabase = await getServerSupabase();
  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("gst_registered, state_code")
      .eq("id", userId)
      .maybeSingle(),
    clientId
      ? supabase
          .from("clients")
          .select("gst_registered, state_code")
          .eq("id", clientId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const sellerRow = profile as Pick<UserProfileRow, "gst_registered" | "state_code"> | null;
  const clientRow = client as Pick<ClientRow, "gst_registered" | "state_code"> | null;

  return {
    seller: {
      gstRegistered: sellerRow?.gst_registered ?? false,
      stateCode: sellerRow?.state_code ?? null,
    },
    client: {
      gstRegistered: clientRow?.gst_registered ?? false,
      stateCode: clientRow?.state_code ?? null,
    },
  };
}

/**
 * Replace ALL invoice items for a given invoice id with the supplied set.
 * Simpler + safer than a partial diff for the MVP.
 */
async function replaceInvoiceItems(
  invoiceId: string,
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    amount: number;
    position: number;
  }>,
) {
  const supabase = await getServerSupabase();
  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
  if (lines.length === 0) return;
  const rows = lines.map((l, i) => ({
    invoice_id: invoiceId,
    description: l.description,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    gst_rate: l.gstRate,
    amount: l.amount,
    position: l.position ?? i,
  }));
  await supabase.from("invoice_items").insert(rows as never);
}

// --- Create -----------------------------------------------------------------

export async function createInvoiceAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = invoiceCrudSchema.safeParse(readPayload(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const userId = await requireUserId();
  const supabase = await getServerSupabase();

  const parties = await resolveParties(userId, parsed.data.clientId);
  const totals = calculateInvoice({
    lines: parsed.data.lines,
    seller: parties.seller,
    client: parties.client,
  });

  const insertRow = {
    user_id: userId,
    client_id: parsed.data.clientId ?? null,
    project_id: parsed.data.projectId ?? null,
    invoice_number: parsed.data.invoiceNumber,
    issue_date: parsed.data.issueDate,
    due_date: parsed.data.dueDate,
    currency: parsed.data.currency,
    status: parsed.data.status,
    sent_at: parsed.data.status === "paid" ? new Date().toISOString() : null,
    paid_at: parsed.data.status === "paid" ? new Date().toISOString() : null,
    payment_status: parsed.data.status === "paid" ? "paid" : null,
    notes: parsed.data.notes ?? null,
    terms: parsed.data.terms ?? null,
    subtotal: totals.subtotal,
    cgst_amount: totals.cgstAmount,
    sgst_amount: totals.sgstAmount,
    igst_amount: totals.igstAmount,
    gst_amount: totals.taxTotal,
    total_amount: totals.total,
    tax_mode: totals.taxMode,
    classification: totals.decision.classification,
    seller_state_code: parties.seller.stateCode,
    client_state_code: parties.client.stateCode,
    footer_note: totals.decision.footerNote,
    payment_amount: parsed.data.status === "paid" ? totals.total : null,
    payment_recorded_at:
      parsed.data.status === "paid" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(insertRow as never)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save invoice." };
  }

  const invoiceId = (data as { id: string }).id;

  await replaceInvoiceItems(
    invoiceId,
    totals.lines.map((l, i) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      gstRate: l.gstRate,
      amount: l.amount,
      position: i,
    })),
  );

  // Bump invoice numbering so the next invoice gets a fresh number. Best
  // effort — a failure here does NOT roll back the invoice.
  const currentCounter = await getCurrentInvoiceCounter(userId);
  await supabase
    .from("user_profiles")
    .update({ invoice_next_number: currentCounter + 1 } as never)
    .eq("id", userId);

  await recordActivity({
    kind: "invoice_created",
    entityType: "invoice",
    entityId: invoiceId,
    title: `Created invoice ${parsed.data.invoiceNumber}`,
    metadata: { total: totals.total, currency: parsed.data.currency },
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: { id: invoiceId },
    message: "Invoice created.",
  };
}

async function getCurrentInvoiceCounter(userId: string): Promise<number> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("user_profiles")
    .select("invoice_next_number")
    .eq("id", userId)
    .maybeSingle();
  return (data as { invoice_next_number?: number } | null)?.invoice_next_number ?? 1;
}

// --- Update -----------------------------------------------------------------

export async function updateInvoiceAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = invoiceIdSchema.safeParse(formData.get("id"));
  if (!idParse.success) return { ok: false, error: "Invalid invoice id." };

  const parsed = invoiceCrudSchema.safeParse(readPayload(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const userId = await requireUserId();
  const supabase = await getServerSupabase();

  const parties = await resolveParties(userId, parsed.data.clientId);
  const totals = calculateInvoice({
    lines: parsed.data.lines,
    seller: parties.seller,
    client: parties.client,
  });

  const update = {
    client_id: parsed.data.clientId ?? null,
    project_id: parsed.data.projectId ?? null,
    invoice_number: parsed.data.invoiceNumber,
    issue_date: parsed.data.issueDate,
    due_date: parsed.data.dueDate,
    currency: parsed.data.currency,
    status: parsed.data.status,
    notes: parsed.data.notes ?? null,
    terms: parsed.data.terms ?? null,
    subtotal: totals.subtotal,
    cgst_amount: totals.cgstAmount,
    sgst_amount: totals.sgstAmount,
    igst_amount: totals.igstAmount,
    gst_amount: totals.taxTotal,
    total_amount: totals.total,
    tax_mode: totals.taxMode,
    classification: totals.decision.classification,
    seller_state_code: parties.seller.stateCode,
    client_state_code: parties.client.stateCode,
    footer_note: totals.decision.footerNote,
  };

  const { error } = await supabase
    .from("invoices")
    .update(update as never)
    .eq("id", idParse.data);

  if (error) return { ok: false, error: error.message };

  await replaceInvoiceItems(
    idParse.data,
    totals.lines.map((l, i) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      gstRate: l.gstRate,
      amount: l.amount,
      position: i,
    })),
  );

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${idParse.data}`);
  return { ok: true, message: "Invoice updated." };
}

// --- Delete -----------------------------------------------------------------

export async function deleteInvoiceAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = invoiceIdSchema.safeParse(formData.get("id"));
  if (!idParse.success) return { ok: false, error: "Invalid invoice id." };
  await requireUserId();
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("invoices").delete().eq("id", idParse.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/invoices");
  return { ok: true, message: "Invoice deleted." };
}

// --- Status transitions ----------------------------------------------------

export async function setInvoiceStatusAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = invoiceIdSchema.safeParse(formData.get("id"));
  const statusParse = invoiceStatusSchema.safeParse(formData.get("status"));
  if (!idParse.success || !statusParse.success) {
    return { ok: false, error: "Invalid input." };
  }
  await requireUserId();
  const supabase = await getServerSupabase();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: statusParse.data };
  if (statusParse.data === "sent") patch.sent_at = now;
  if (statusParse.data === "paid") {
    patch.paid_at = now;
    patch.payment_recorded_at = now;
    patch.payment_status = "paid";
  }

  const { data: invoiceRow, error } = await supabase
    .from("invoices")
    .update(patch as never)
    .select("user_id, invoice_number, total_amount, currency")
    .eq("id", idParse.data);
  if (error) return { ok: false, error: error.message };
  const invoice = (invoiceRow?.[0] as
    | {
        user_id: string;
        invoice_number: string;
        total_amount: number;
        currency: string;
      }
    | undefined);

  await recordActivity({
    kind: `invoice_${statusParse.data}`,
    entityType: "invoice",
    entityId: idParse.data,
    title: `Invoice marked ${statusParse.data}`,
  });

  if (statusParse.data === "paid" && invoice) {
    await createNotification({
      type: "invoice_paid",
      title: `Invoice ${invoice.invoice_number} marked paid`,
      message: `${invoice.currency} ${Number(invoice.total_amount).toFixed(2)} has been recorded as paid.`,
    });
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${idParse.data}`);
  return { ok: true, message: `Marked ${statusParse.data}.` };
}
