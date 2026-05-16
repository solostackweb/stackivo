/**
 * Crisp webhook receiver.
 *
 * Crisp posts events as JSON with a shared-secret HMAC signature in
 * the `X-Crisp-Signature` header. We:
 *
 *   1. Reject without 404 when `CRISP_WEBHOOK_SECRET` is unset (so
 *      unconfigured deploys can't be probed).
 *   2. Verify the signature in constant time.
 *   3. Upsert metadata into `public.support_threads`.
 *
 * Events we care about:
 *   - `message:received`            → thread bumped to "open"
 *   - `session:set_state`           → resolved/closed → status update
 *   - `session:set_email`           → re-link to a user
 *
 * Anything else is acknowledged with 200 so Crisp stops retrying.
 *
 * Crisp documents its webhook payload at:
 *   https://docs.crisp.chat/references/rtm-events/v1/
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireServerEnv } from "@/config/env";
import { log } from "@/lib/logger";
import { upsertSupportThread, setSupportThreadStatus } from "@/features/support/webhooks";
import type { SupportStatus } from "@/features/support/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CrispEnvelope {
  event: string;
  website_id?: string;
  data?: {
    session_id?: string;
    user?: { user_id?: string; nickname?: string; email?: string };
    fingerprint?: string | number;
    content?: string | { type?: string };
    type?: string;
    state?: "pending" | "unresolved" | "resolved";
    email?: string;
    inbox_id?: string | null;
    routing?: unknown;
  };
  timestamp?: number;
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: Request): Promise<Response> {
  const env = requireServerEnv();
  if (!env.crispWebhookSecret) {
    return new NextResponse("Not configured", { status: 404 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-crisp-signature") ?? "";

  // Crisp's signature scheme: HMAC-SHA256 of the body using the
  // shared secret as the key. Header carries the hex digest.
  const expected = crypto
    .createHmac("sha256", env.crispWebhookSecret)
    .update(raw)
    .digest("hex");

  if (!signature || !timingSafeEqual(signature, expected)) {
    log.warn("crisp.webhook.bad_signature", {
      sig_len: signature.length,
    });
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: CrispEnvelope;
  try {
    payload = JSON.parse(raw) as CrispEnvelope;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const sessionId = payload.data?.session_id;
  if (!sessionId) {
    return NextResponse.json({ ok: true, ignored: "no session_id" });
  }

  const websiteId = payload.website_id ?? "";
  const externalUrl = websiteId
    ? `https://app.crisp.chat/website/${websiteId}/inbox/${sessionId}/`
    : null;

  switch (payload.event) {
    case "message:send":
    case "message:received": {
      const subject =
        typeof payload.data?.content === "string"
          ? payload.data.content.slice(0, 200)
          : null;
      const result = await upsertSupportThread({
        externalSystem: "crisp",
        externalId: sessionId,
        subject,
        status: "open",
        priority: "normal",
        contactEmail: payload.data?.user?.email ?? null,
        externalUrl,
        lastMessageAt: payload.timestamp
          ? new Date(payload.timestamp).toISOString()
          : null,
      });
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, id: result.id });
    }

    case "session:set_state": {
      const stateMap: Record<string, SupportStatus> = {
        pending: "new",
        unresolved: "open",
        resolved: "resolved",
      };
      const status = stateMap[payload.data?.state ?? ""] ?? "open";
      await setSupportThreadStatus("crisp", sessionId, status);
      return NextResponse.json({ ok: true });
    }

    case "session:set_email": {
      const result = await upsertSupportThread({
        externalSystem: "crisp",
        externalId: sessionId,
        contactEmail: payload.data?.email ?? null,
        externalUrl,
      });
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    default:
      // Acknowledge so Crisp doesn't retry.
      return NextResponse.json({ ok: true, ignored: payload.event });
  }
}

export async function GET(): Promise<Response> {
  return new NextResponse("Method not allowed", { status: 405 });
}
