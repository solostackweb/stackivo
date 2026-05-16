import "server-only";

/**
 * Public-share resolver.
 *
 * Anonymous viewers (clients receiving an invoice / contract email) hit
 * `/i/:token` and `/c/:token`. Those pages load the underlying record
 * via these helpers, which:
 *   - Use the service-role client to bypass RLS *intentionally* —
 *     anonymous users still go through the normal anon-policy paths
 *     elsewhere, but server components rendering shared docs need every
 *     embedded relation (client name, line items) without partial reads.
 *   - Record `viewed_at` + an activity event on first paint so the
 *     freelancer sees real-time view receipts.
 *   - Fire an in-app + email notification ("Your client opened this
 *     invoice") via the delivery pipeline.
 */

import { randomUUID } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type {
  ContractRow,
  InvoiceItemRow,
  InvoiceRow,
} from "@/lib/supabase/types";

export interface SharedInvoice {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
}

const PUBLIC_TOKEN_RE = /^[a-f0-9]{32}$/i;

export function isValidPublicShareToken(token: string): boolean {
  return PUBLIC_TOKEN_RE.test(token);
}

export async function getSharedInvoice(
  token: string,
): Promise<SharedInvoice | null> {
  if (!isValidPublicShareToken(token)) return null;
  const admin = getAdminSupabase();
  const { data: invoice } = await admin
    .from("invoices")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!invoice) return null;
  const inv = invoice as unknown as InvoiceRow;
  const { data: items } = await admin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", inv.id)
    .order("position", { ascending: true });
  return {
    invoice: inv,
    items: ((items as unknown as InvoiceItemRow[]) ?? []),
  };
}

export async function getSharedContract(
  token: string,
): Promise<ContractRow | null> {
  if (!isValidPublicShareToken(token)) return null;
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("contracts")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!data) return null;
  return data as unknown as ContractRow;
}

/**
 * Mint a public token if the row doesn't have one yet. Idempotent.
 */
export async function ensureInvoicePublicToken(
  invoiceId: string,
): Promise<string | null> {
  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from("invoices")
    .select("public_token")
    .eq("id", invoiceId)
    .maybeSingle();
  const current =
    (existing as { public_token?: string | null } | null)?.public_token ?? null;
  if (current) return current;
  const token = randomUUID().replace(/-/g, "");
  const { error } = await admin
    .from("invoices")
    .update({ public_token: token } as never)
    .eq("id", invoiceId);
  if (error) return null;
  return token;
}

export async function ensureContractPublicToken(
  contractId: string,
): Promise<string | null> {
  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from("contracts")
    .select("public_token")
    .eq("id", contractId)
    .maybeSingle();
  const current =
    (existing as { public_token?: string | null } | null)?.public_token ?? null;
  if (current) return current;
  const token = randomUUID().replace(/-/g, "");
  const { error } = await admin
    .from("contracts")
    .update({ public_token: token } as never)
    .eq("id", contractId);
  if (error) return null;
  return token;
}

/**
 * Mark an invoice as viewed (status -> "viewed" if currently "sent",
 * always set `viewed_at`). Records an activity event + a notification
 * so the freelancer sees it immediately. Idempotent — bails if the
 * invoice was already viewed within the last hour to avoid noisy
 * activity spam from clients refreshing the page.
 */
export async function recordInvoiceView(token: string): Promise<void> {
  if (!isValidPublicShareToken(token)) return;
  const admin = getAdminSupabase();
  const { data: row } = await admin
    .from("invoices")
    .select("id, user_id, invoice_number, status, viewed_at")
    .eq("public_token", token)
    .maybeSingle();
  if (!row) return;
  const inv = row as {
    id: string;
    user_id: string;
    invoice_number: string;
    status: string;
    viewed_at: string | null;
  };
  if (
    inv.viewed_at &&
    Date.now() - new Date(inv.viewed_at).getTime() < 60 * 60 * 1000
  ) {
    return; // throttled
  }
  const patch: Record<string, unknown> = {
    viewed_at: new Date().toISOString(),
  };
  if (inv.status === "sent") patch.status = "viewed";
  await admin.from("invoices").update(patch as never).eq("id", inv.id);

  await admin.from("activity_events").insert({
    user_id: inv.user_id,
    kind: "invoice_viewed",
    entity_type: "invoice",
    entity_id: inv.id,
    title: `Invoice ${inv.invoice_number} viewed`,
    metadata: { via: "public_link" },
  } as never);

  await admin.from("notifications").insert({
    user_id: inv.user_id,
    type: "invoice_viewed",
    title: `Invoice ${inv.invoice_number} viewed`,
    message: "Your client just opened this invoice.",
  } as never);
}

export async function recordContractView(token: string): Promise<void> {
  if (!isValidPublicShareToken(token)) return;
  const admin = getAdminSupabase();
  const { data: row } = await admin
    .from("contracts")
    .select("id, user_id, title, status, viewed_at")
    .eq("public_token", token)
    .maybeSingle();
  if (!row) return;
  const c = row as {
    id: string;
    user_id: string;
    title: string;
    status: string;
    viewed_at: string | null;
  };
  if (
    c.viewed_at &&
    Date.now() - new Date(c.viewed_at).getTime() < 60 * 60 * 1000
  ) {
    return;
  }
  const patch: Record<string, unknown> = {
    viewed_at: new Date().toISOString(),
  };
  if (c.status === "sent") patch.status = "viewed";
  await admin.from("contracts").update(patch as never).eq("id", c.id);

  await admin.from("activity_events").insert({
    user_id: c.user_id,
    kind: "contract_viewed",
    entity_type: "contract",
    entity_id: c.id,
    title: `“${c.title}” viewed`,
    metadata: { via: "public_link" },
  } as never);

  await admin.from("notifications").insert({
    user_id: c.user_id,
    type: "contract_viewed",
    title: `“${c.title}” viewed`,
    message: "Your client just opened this document.",
  } as never);
}
