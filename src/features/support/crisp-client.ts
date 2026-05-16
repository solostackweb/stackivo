import "server-only";

/**
 * Thin Crisp REST client. Used only for:
 *
 *   1. DELETE /v1/website/{websiteId}/people/profile/{personId}
 *      → DPDP fan-out from the soft-delete admin action.
 *   2. (Future) GET conversation transcripts during webhook ingestion
 *      if we ever want to mirror full chat content into our DB.
 *
 * The chat WIDGET itself uses a public `websiteId` and ignores these
 * server credentials entirely.
 *
 * Auth: Crisp uses Basic auth with `<identifier>:<key>` (both from a
 * production-scoped marketplace plugin you create yourself).
 */

import { requireServerEnv, env as publicEnv } from "@/config/env";
import { log } from "@/lib/logger";

const CRISP_API_BASE = "https://api.crisp.chat/v1";

interface CrispConfig {
  websiteId: string;
  identifier: string;
  key: string;
}

function getConfig(): CrispConfig | null {
  const env = requireServerEnv();
  if (!publicEnv.crispWebsiteId || !env.crispApiIdentifier || !env.crispApiKey) {
    return null;
  }
  return {
    websiteId: publicEnv.crispWebsiteId,
    identifier: env.crispApiIdentifier,
    key: env.crispApiKey,
  };
}

export function isCrispConfigured(): boolean {
  return getConfig() !== null;
}

function authHeader(cfg: CrispConfig): string {
  const token = Buffer.from(`${cfg.identifier}:${cfg.key}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Best-effort delete of a person profile (and all their conversations)
 * from a Crisp website. Used by the soft-delete fan-out.
 *
 * Crisp identifies people by email — `personId` here is the email
 * address.
 */
export async function deleteCrispPerson(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "not_configured" };

  try {
    const res = await fetch(
      `${CRISP_API_BASE}/website/${cfg.websiteId}/people/profile/${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader(cfg),
          "X-Crisp-Tier": "plugin",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    // Crisp returns 200 on success and 404 when the person doesn't
    // exist — either is fine for our purposes.
    if (res.ok || res.status === 404) return { ok: true };
    const text = await res.text().catch(() => "");
    log.warn("crisp.api.delete_failed", {
      status: res.status,
      body: text.slice(0, 500),
    });
    return { ok: false, error: text || res.statusText };
  } catch (err) {
    log.warn("crisp.api.exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}

/**
 * Fetch the metadata of a single Crisp conversation by session id.
 * Used by the inbound webhook to enrich the `support_threads` row
 * with subject, last_message_at, etc.
 *
 * Returns null when not configured / not found / failure — webhook
 * code is expected to fall back to the bare event payload.
 */
export interface CrispConversationMeta {
  session_id: string;
  state: string;
  status: number;
  created_at: number;
  updated_at: number;
  meta?: {
    nickname?: string;
    email?: string;
    subject?: string;
    segments?: string[];
  };
}

export async function getCrispConversation(
  sessionId: string,
): Promise<CrispConversationMeta | null> {
  const cfg = getConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(
      `${CRISP_API_BASE}/website/${cfg.websiteId}/conversation/${sessionId}/meta`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader(cfg),
          "X-Crisp-Tier": "plugin",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: CrispConversationMeta };
    return data.data ?? null;
  } catch (err) {
    log.warn("crisp.api.fetch_meta_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
