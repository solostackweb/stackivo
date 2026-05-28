/**
 * Crisp webhook receiver.
 *
 * Crisp does not expose a signing secret in its webhook UI, so we
 * authenticate via a secret token embedded in the webhook URL:
 *
 *   https://stackivo.me/api/webhooks/crisp?token=<CRISP_WEBHOOK_SECRET>
 *
 * Steps:
 *   1. Reject with 404 when CRISP_WEBHOOK_SECRET is unset.
 *   2. Compare ?token= query param against the secret in constant time.
 *   3. Verify website_id in payload matches NEXT_PUBLIC_CRISP_WEBSITE_ID.
 *   4. Upsert metadata into public.support_threads.
 *
 * Events we handle:
 *   - message:send / message:sent / message:received -> thread bumped to "open"
 *   - session:set_state                → resolved/closed → status update
 *   - session:set_email                → re-link to a user
 *
 * Anything else is acknowledged with 200 so Crisp stops retrying.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireServerEnv, env as publicEnv } from "@/config/env";
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
  // Pad to equal length so length difference doesn't short-circuit.
  const maxLen = Math.max(a.length, b.length);
  const ab = Buffer.alloc(maxLen);
  const bb = Buffer.alloc(maxLen);
  ab.write(a);
  bb.write(b);
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: Request): Promise<Response> {
  const env = requireServerEnv();
  if (!env.crispWebhookSecret) {
    return new NextResponse("Not configured", { status: 404 });
  }

  // Auth: compare ?token= in URL against the stored secret.
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token || !timingSafeEqual(token, env.crispWebhookSecret)) {
    log.warn("crisp.webhook.bad_token");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const raw = await req.text();
  let payload: CrispEnvelope;
  try {
    payload = JSON.parse(raw) as CrispEnvelope;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Verify the payload belongs to our website (secondary trust check).
  const knownWebsiteId = publicEnv.crispWebsiteId;
  if (knownWebsiteId && payload.website_id && payload.website_id !== knownWebsiteId) {
    log.warn("crisp.webhook.wrong_website", { got: payload.website_id });
    return new NextResponse("Wrong website", { status: 403 });
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
    case "message:sent":
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

export async function GET(req: Request): Promise<Response> {
  const env = requireServerEnv();
  if (!env.crispWebhookSecret) {
    return NextResponse.json(
      { ok: false, configured: false, error: "CRISP_WEBHOOK_SECRET missing" },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token || !timingSafeEqual(token, env.crispWebhookSecret)) {
    return NextResponse.json(
      { ok: false, configured: true, error: "Bad webhook token" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    websiteIdConfigured: Boolean(publicEnv.crispWebsiteId),
  });
}
