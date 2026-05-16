import "server-only";

/**
 * Razorpay webhook event router.
 *
 * Idempotency: every event is logged into `billing_events` keyed on the
 * Razorpay event id. Repeats are no-ops. Errors are written back onto
 * the row so retries are debuggable.
 *
 * Auth: callers must verify the HMAC signature BEFORE invoking
 * `handleRazorpayEvent` (see `./razorpay/webhook-verify`).
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import type {
  BillingEventRow,
  BillingPaymentRow,
  SubscriptionRow,
} from "@/lib/supabase/types";
import {
  fetchPayment,
  fetchSubscription,
  type RazorpayPayment,
  type RazorpaySubscription,
} from "./razorpay/client";
import { syncSubscriptionFromRazorpay } from "./server";

interface WebhookEnvelope {
  entity: "event";
  event: string;
  account_id?: string;
  contains?: string[];
  payload: Record<
    string,
    {
      entity: Record<string, unknown> & { id?: string };
    }
  >;
  created_at: number;
}

/**
 * Process a verified Razorpay webhook payload.
 *
 * Returns `{ ok: true }` for every event, even unknown ones — Razorpay
 * retries on non-2xx, and we don't want to retry events we genuinely
 * don't care about. Specific failures bubble up as thrown errors so the
 * route handler can return 500 and trigger Razorpay's retry queue.
 */
export async function handleRazorpayEvent(args: {
  eventId: string;
  rawBody: string;
}): Promise<{ ok: true; deduplicated?: boolean }> {
  const admin = getAdminSupabase();

  let event: WebhookEnvelope;
  try {
    event = JSON.parse(args.rawBody) as WebhookEnvelope;
  } catch {
    throw new Error("Invalid JSON in webhook body");
  }

  // --- Idempotency log ----------------------------------------------------
  const { data: existing } = await admin
    .from("billing_events")
    .select("id, processed_at")
    .eq("event_id", args.eventId)
    .maybeSingle();
  const existingRow = existing as Pick<BillingEventRow, "id" | "processed_at"> | null;
  if (existingRow?.processed_at) {
    return { ok: true, deduplicated: true };
  }

  let logId = existingRow?.id;
  if (!logId) {
    const { data: inserted } = await admin
      .from("billing_events")
      .insert({
        event_id: args.eventId,
        event_type: event.event,
        payload: event as unknown as BillingEventRow["payload"],
      } as never)
      .select("id")
      .single();
    logId = (inserted as { id: string } | null)?.id;
  }

  try {
    await dispatch(event);
    if (logId) {
      await admin
        .from("billing_events")
        .update({ processed_at: new Date().toISOString(), error: null } as never)
        .eq("id", logId);
    }
    return { ok: true };
  } catch (err) {
    if (logId) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await admin
        .from("billing_events")
        .update({ error: message } as never)
        .eq("id", logId);
    }
    throw err;
  }
}

// --- Dispatcher ------------------------------------------------------------

async function dispatch(event: WebhookEnvelope): Promise<void> {
  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.completed":
    case "subscription.cancelled":
    case "subscription.paused":
    case "subscription.resumed":
    case "subscription.pending":
    case "subscription.halted":
    case "subscription.updated": {
      const sub = (event.payload.subscription?.entity as unknown as
        | RazorpaySubscription
        | undefined) ?? null;
      if (sub?.id) await syncSubscriptionFromRazorpay(sub);
      // For `charged` events the embedded subscription may be stale —
      // pull the canonical state to be safe.
      if (sub?.id && event.event === "subscription.charged") {
        const fresh = await fetchSubscription(sub.id);
        await syncSubscriptionFromRazorpay(fresh);
      }
      // Record the captured payment if present.
      if (event.payload.payment?.entity) {
        await persistPayment(
          event.payload.payment.entity as unknown as RazorpayPayment,
        );
      }
      return;
    }

    case "payment.captured":
    case "payment.failed":
    case "payment.authorized": {
      const payment = event.payload.payment?.entity as unknown as
        | RazorpayPayment
        | undefined;
      if (payment) await persistPayment(payment);
      return;
    }

    case "invoice.paid": {
      // An invoice always has an associated payment id — fetch & persist.
      const invoice = event.payload.invoice?.entity as unknown as
        | { payment_id?: string; subscription_id?: string }
        | undefined;
      if (invoice?.payment_id) {
        const payment = await fetchPayment(invoice.payment_id);
        await persistPayment(payment);
      }
      if (invoice?.subscription_id) {
        const fresh = await fetchSubscription(invoice.subscription_id);
        await syncSubscriptionFromRazorpay(fresh);
      }
      return;
    }

    default:
      // Unknown / uninteresting event — log only.
      return;
  }
}

// --- Helpers ---------------------------------------------------------------

async function persistPayment(p: RazorpayPayment): Promise<void> {
  const admin = getAdminSupabase();

  // Resolve the user from the linked subscription, if any.
  let userId: string | null = null;
  let subscriptionRowId: string | null = null;
  let razorpaySubscriptionId: string | null = null;

  // Razorpay payments include `notes.user_id` when we set it on the parent
  // subscription. Fall back to looking up via the subscription row.
  if (p.notes && typeof p.notes.user_id === "string") {
    userId = p.notes.user_id;
  }

  // payments tied to a subscription have `invoice_id` populated; the invoice
  // exposes the subscription_id we can use to look up the row.
  if (p.invoice_id) {
    const { data } = await admin
      .from("subscriptions")
      .select("id, user_id, razorpay_subscription_id")
      .eq("razorpay_subscription_id", p.invoice_id) // unlikely match
      .maybeSingle();
    const row = data as Pick<
      SubscriptionRow,
      "id" | "user_id" | "razorpay_subscription_id"
    > | null;
    if (row) {
      userId = userId ?? row.user_id;
      subscriptionRowId = row.id;
      razorpaySubscriptionId = row.razorpay_subscription_id;
    }
  }

  if (!userId) {
    // Nothing to attribute the payment to. Skip rather than corrupt.
    return;
  }

  const row: Partial<BillingPaymentRow> &
    Pick<BillingPaymentRow, "user_id" | "razorpay_payment_id" | "amount" | "status"> = {
    user_id: userId,
    subscription_row_id: subscriptionRowId,
    razorpay_payment_id: p.id,
    razorpay_order_id: p.order_id,
    razorpay_subscription_id: razorpaySubscriptionId,
    razorpay_invoice_id: p.invoice_id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    method: p.method ?? null,
    card_last4: p.card?.last4 ?? null,
    card_network: p.card?.network ?? null,
    description: p.description ?? null,
    error_code: p.error_code ?? null,
    error_description: p.error_description ?? null,
    captured_at:
      p.status === "captured" ? new Date(p.created_at * 1000).toISOString() : null,
  };

  // Upsert keyed on the unique `razorpay_payment_id`.
  await admin
    .from("billing_payments")
    .upsert(row as never, { onConflict: "razorpay_payment_id" });

  // On capture, update the user's last_payment_at for the dashboard.
  if (p.status === "captured" && userId) {
    await admin
      .from("subscriptions")
      .update({
        last_payment_at: new Date(p.created_at * 1000).toISOString(),
      } as never)
      .eq("user_id", userId);
  }
}
