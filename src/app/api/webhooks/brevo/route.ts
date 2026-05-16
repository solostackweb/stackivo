import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requireServerEnv } from "@/config/env";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { recordSuppression } from "@/features/email/suppressions";
import { recordSecurityEvent } from "@/lib/security-events/server";
import type { DeliveryStatus } from "@/lib/supabase/types";

/**
 * Brevo transactional-email webhook receiver.
 *
 * Security model
 * --------------
 * Brevo webhooks don't carry an HMAC header by default — the
 * recommended pattern is a shared secret in the webhook URL:
 *
 *   https://stackivo.me/api/webhooks/brevo?token=<BREVO_WEBHOOK_SECRET>
 *
 * If `BREVO_WEBHOOK_SECRET` is unset we 404 the endpoint so
 * unauthenticated callers can't probe for it in logs.
 *
 * Event lifecycle
 * ---------------
 * Brevo posts one event per delivery-stage transition. We resolve the
 * matching `delivery_logs` row by `provider_message_id`, stamp the
 * corresponding timestamp + new status, and (on bounce / spam /
 * unsubscribe) feed the recipient into `email_suppressions` so every
 * future send skips it.
 *
 * Idempotency
 * -----------
 * The update is safe to replay: each event type maps to a column that
 * we only stamp if still NULL, and the suppression table is upserted
 * on `email`. Replays are harmless.
 *
 * Privacy
 * -------
 * No part of the event body is surfaced to authenticated users via
 * RLS. The update path uses the admin client — `delivery_logs` SELECT
 * policies still only expose rows to the original sender.
 */

// Brevo Node SDKs and many webhooks rely on the event names below:
//   delivered | soft_bounce | hard_bounce | spam | blocked | invalid
//   unique_opened | opened | clicks | unsubscribed | list_addition
// We handle the subset that affects downstream state. Unknown events
// are acknowledged (200) without effect so Brevo doesn't retry-storm.
type BrevoEvent = {
  event?: string;
  "message-id"?: string;
  messageId?: string;
  email?: string;
  reason?: string;
  tag?: string | string[];
  date?: string;
  ts?: number;
};

export async function POST(req: Request) {
  const env = requireServerEnv();

  // Gate 1: webhook disabled until secret is configured.
  if (!env.brevoWebhookSecret) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Gate 2: timing-safe token check. `?token=...` must match exactly.
  const url = new URL(req.url);
  const provided = url.searchParams.get("token") ?? "";
  if (!equalsConstantTime(provided, env.brevoWebhookSecret)) {
    await recordSecurityEvent({
      kind: "webhook_signature_invalid",
      severity: "alert",
      metadata: { provider: "brevo" },
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Brevo may POST either a single event object or an array. Normalize.
  const events: BrevoEvent[] = Array.isArray(body)
    ? (body as BrevoEvent[])
    : [body as BrevoEvent];

  const results: Array<{ event?: string; ok: boolean; reason?: string }> = [];
  for (const ev of events) {
    try {
      await handleEvent(ev);
      results.push({ event: ev.event, ok: true });
    } catch (err) {
      // Log but don't abort — Brevo will retry the whole batch
      // otherwise. Each event is independent.
      results.push({
        event: ev.event,
        ok: false,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ ok: true, processed: results });
}

async function handleEvent(ev: BrevoEvent) {
  const messageId = ev["message-id"] ?? ev.messageId ?? null;
  const eventName = (ev.event ?? "").toLowerCase();
  const email = ev.email?.trim().toLowerCase() ?? null;

  // Map Brevo event → new delivery_logs status + which timestamp to stamp.
  const transition = mapEventToTransition(eventName);
  if (!transition && !isSuppressionEvent(eventName)) {
    // Unknown / uninteresting event — ack and move on.
    return;
  }

  const admin = getAdminSupabase();

  // --- Update delivery_logs by provider_message_id --------------------
  if (transition && messageId) {
    const patch: Record<string, string | null> = { status: transition.status };
    const now = new Date().toISOString();
    if (transition.timestampColumn) {
      patch[transition.timestampColumn] = now;
    }
    if (transition.status === "failed" || transition.status === "bounced") {
      patch.error = ev.reason ?? eventName;
    }
    await admin
      .from("delivery_logs")
      .update(patch as never)
      .eq("provider_message_id", messageId);
  }

  // --- Populate the suppression list ---------------------------------
  if (email && isSuppressionEvent(eventName)) {
    const reason = eventToSuppressionReason(eventName);
    const userId = await lookupUserIdByMessage(messageId);
    await recordSuppression({
      email,
      reason,
      triggeredByUserId: userId,
      providerMessageId: messageId,
      metadata: {
        brevoEvent: eventName,
        brevoReason: ev.reason ?? null,
      },
    });
  }
}

function mapEventToTransition(eventName: string): {
  status: DeliveryStatus;
  timestampColumn: keyof {
    sent_at: null;
    delivered_at: null;
    opened_at: null;
    bounced_at: null;
  } | null;
} | null {
  switch (eventName) {
    case "delivered":
      return { status: "delivered", timestampColumn: "delivered_at" };
    case "opened":
    case "unique_opened":
      return { status: "opened", timestampColumn: "opened_at" };
    case "clicks":
    case "click":
      return { status: "clicked", timestampColumn: null };
    case "hard_bounce":
    case "soft_bounce":
    case "blocked":
    case "invalid":
      return { status: "bounced", timestampColumn: "bounced_at" };
    case "spam":
      return { status: "failed", timestampColumn: null };
    case "unsubscribed":
      return { status: "suppressed", timestampColumn: null };
    default:
      return null;
  }
}

function isSuppressionEvent(eventName: string): boolean {
  return [
    "hard_bounce",
    "invalid",
    "blocked",
    "spam",
    "unsubscribed",
  ].includes(eventName);
}

function eventToSuppressionReason(eventName: string) {
  switch (eventName) {
    case "hard_bounce":
      return "hard_bounce" as const;
    case "invalid":
      return "invalid" as const;
    case "spam":
      return "complaint" as const;
    case "unsubscribed":
      return "unsubscribe" as const;
    case "blocked":
    default:
      return "manual" as const;
  }
}

/**
 * Best-effort user lookup for suppression attribution. Not critical —
 * if we can't resolve the user the suppression is still stored, just
 * with `triggered_by_user_id = null`.
 */
async function lookupUserIdByMessage(
  messageId: string | null,
): Promise<string | null> {
  if (!messageId) return null;
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("delivery_logs")
    .select("user_id")
    .eq("provider_message_id", messageId)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

function equalsConstantTime(a: string, b: string): boolean {
  // Timing-safe comparison requires equal-length buffers. Prepend a
  // length check and fall through to timingSafeEqual so short-token
  // rejections are also constant time in the worst case.
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
