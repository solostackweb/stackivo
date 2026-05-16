/**
 * Zoho Desk webhook receiver.
 *
 * Zoho Desk's webhook UI lets you set a custom header — we use
 * `X-Zoho-Desk-Token` carrying `ZOHO_DESK_WEBHOOK_SECRET` for a simple
 * shared-secret check (Zoho doesn't sign payloads natively for the
 * Desk product, only for Cliq). Constant-time compare to avoid
 * timing oracle leaks.
 *
 * Supported events (configure in Zoho Desk → Setup → Webhooks):
 *   - Ticket_Add        → upsert thread as "new"
 *   - Ticket_Update     → upsert with current status / priority
 *   - Ticket_Close      → status = "closed"
 *   - Ticket_Reply      → bump last_message_at, status = "open"
 *
 * Anything unrecognised is acked with 200.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireServerEnv } from "@/config/env";
import { log } from "@/lib/logger";
import { upsertSupportThread, setSupportThreadStatus } from "@/features/support/webhooks";
import type { SupportStatus, SupportPriority } from "@/features/support/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ZohoDeskEnvelope {
  eventType?: string;
  /** Some Zoho deployments send the event under `module` + `operation`. */
  module?: string;
  operation?: string;
  payload?: {
    id?: string;
    ticketNumber?: string;
    subject?: string;
    status?: string;
    priority?: string;
    category?: string;
    classification?: string;
    contact?: { email?: string; firstName?: string; lastName?: string };
    contactInfo?: { email?: string };
    webUrl?: string;
    modifiedTime?: string;
    createdTime?: string;
  };
  /** Some deployments use `data` instead of `payload`. */
  data?: ZohoDeskEnvelope["payload"];
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const ZOHO_STATUS_MAP: Record<string, SupportStatus> = {
  Open: "open",
  "On Hold": "waiting",
  Escalated: "open",
  Closed: "closed",
  Resolved: "resolved",
};

const ZOHO_PRIORITY_MAP: Record<string, SupportPriority> = {
  Low: "low",
  Medium: "normal",
  High: "high",
  Urgent: "urgent",
};

export async function POST(req: Request): Promise<Response> {
  const env = requireServerEnv();
  if (!env.zohoDeskWebhookSecret) {
    return new NextResponse("Not configured", { status: 404 });
  }

  const provided = req.headers.get("x-zoho-desk-token") ?? "";
  if (!timingSafeEqual(provided, env.zohoDeskWebhookSecret)) {
    log.warn("zoho.webhook.bad_token", { provided_len: provided.length });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: ZohoDeskEnvelope;
  try {
    body = (await req.json()) as ZohoDeskEnvelope;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const event =
    body.eventType ??
    (body.module && body.operation ? `${body.module}_${body.operation}` : "");
  const payload = body.payload ?? body.data;

  if (!payload?.id) {
    return NextResponse.json({ ok: true, ignored: "no ticket id" });
  }

  const externalId = payload.id;
  const subject = payload.subject ?? null;
  const externalUrl = payload.webUrl ?? null;
  const status = ZOHO_STATUS_MAP[payload.status ?? ""] ?? "open";
  const priority = ZOHO_PRIORITY_MAP[payload.priority ?? ""] ?? "normal";
  const contactEmail =
    payload.contact?.email ?? payload.contactInfo?.email ?? null;
  const lastMessageAt = payload.modifiedTime ?? payload.createdTime ?? null;

  if (event.includes("Close") || event.includes("close") || status === "closed") {
    await setSupportThreadStatus("zoho_desk", externalId, "closed");
    return NextResponse.json({ ok: true });
  }

  const result = await upsertSupportThread({
    externalSystem: "zoho_desk",
    externalId,
    subject,
    status,
    priority,
    category: null,
    contactEmail,
    externalUrl,
    lastMessageAt,
    tags: ["zoho-desk"],
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}

export async function GET(): Promise<Response> {
  return new NextResponse("Method not allowed", { status: 405 });
}
