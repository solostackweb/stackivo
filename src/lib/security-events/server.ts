import "server-only";

/**
 * Security event sink.
 *
 * `recordSecurityEvent()` writes to `security_events` via the admin
 * client (bypassing RLS — the table has no authenticated SELECT policy
 * by design). Fire-and-forget: logging must NEVER throw up to the
 * caller. A failed event write is logged at warn level and dropped.
 */

import { headers } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type {
  SecurityEventKind,
  SecurityEventSeverity,
} from "@/lib/supabase/types";
import { log } from "@/lib/logger";
import { redact } from "@/lib/logger/redact";

export interface RecordSecurityEventInput {
  kind: SecurityEventKind;
  severity?: SecurityEventSeverity;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Resolve request correlation data from the current headers context.
 * Safe to call from server actions + route handlers.
 */
async function resolveRequestContext(): Promise<{
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0]?.trim() : h.get("x-real-ip");
    return {
      ip: ip ?? null,
      userAgent: h.get("user-agent") ?? null,
      requestId: h.get("x-request-id") ?? null,
    };
  } catch {
    // `headers()` throws outside a request scope (e.g. in a cron job).
    return { ip: null, userAgent: null, requestId: null };
  }
}

export async function recordSecurityEvent(
  input: RecordSecurityEventInput,
): Promise<void> {
  try {
    const ctx = await resolveRequestContext();
    const admin = getAdminSupabase();
    await admin.from("security_events").insert({
      kind: input.kind,
      severity: input.severity ?? "info",
      user_id: input.userId ?? null,
      ip: input.ip ?? ctx.ip,
      user_agent: input.userAgent ?? ctx.userAgent,
      request_id: input.requestId ?? ctx.requestId,
      metadata: redact(input.metadata ?? {}) as never,
    } as never);
  } catch (err) {
    // Audit logging must never break the business path. Emit a
    // structured log line so the failure is at least visible.
    log.warn("security_event.write_failed", {
      kind: input.kind,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
