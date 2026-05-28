import "server-only";

/**
 * Crisp REST client — admin support operations.
 *
 * Covers:
 *   1. DELETE  person profile          → DPDP soft-delete fan-out
 *   2. GET     conversation meta       → webhook enrichment
 *   3. GET     conversation messages   → admin thread detail view
 *   4. POST    send message            → admin reply from console
 *   5. PATCH   conversation state      → resolve / reopen / pending
 *   6. GET     conversations list      → admin inbox sync
 *
 * The chat WIDGET itself uses a public `websiteId` and ignores these
 * server credentials entirely.
 *
 * Auth: Basic auth with `<email>:<api_token>` using user-tier credentials.
 *   CRISP_API_IDENTIFIER = your Crisp account email
 *   CRISP_API_KEY        = the API Token from Settings → Advanced configuration
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
          "X-Crisp-Tier": "user",
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
          "X-Crisp-Tier": "user",
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

// ---------------------------------------------------------------------------
// Message history
// ---------------------------------------------------------------------------

export interface CrispMessage {
  fingerprint: number;
  session_id: string;
  website_id: string;
  type: "text" | "file" | "animation" | "audio" | "picker" | "field" | "note" | string;
  content: string | Record<string, unknown>;
  from: "user" | "operator";
  origin: string;
  user: {
    user_id?: string;
    nickname?: string;
    avatar?: string | null;
    type?: "operator" | "participant" | string;
  };
  stamped: boolean;
  timestamp: number;
  delivered: string;
  read: string;
  updated: number;
}

/**
 * Fetch the full message history for a conversation. Crisp returns
 * messages newest-first; we reverse to show oldest-first in the UI.
 * Returns [] on any failure so the UI can gracefully degrade.
 */
export async function getCrispMessages(
  sessionId: string,
): Promise<CrispMessage[]> {
  const cfg = getConfig();
  if (!cfg) return [];

  try {
    const res = await fetch(
      `${CRISP_API_BASE}/website/${cfg.websiteId}/conversation/${sessionId}/messages`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader(cfg),
          "X-Crisp-Tier": "user",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: CrispMessage[] };
    return (data.data ?? []).slice().reverse();
  } catch (err) {
    log.warn("crisp.api.fetch_messages_failed", {
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Send reply as operator
// ---------------------------------------------------------------------------

export interface SendMessageResult {
  ok: boolean;
  fingerprint?: number;
  error?: string;
}

/**
 * Send a text message to a conversation as the operator (you).
 * Used by the admin reply box in /admin/support/[id].
 */
export async function sendCrispMessage(
  sessionId: string,
  content: string,
): Promise<SendMessageResult> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "not_configured" };

  try {
    const res = await fetch(
      `${CRISP_API_BASE}/website/${cfg.websiteId}/conversation/${sessionId}/message`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(cfg),
          "X-Crisp-Tier": "user",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "text", content, from: "operator", origin: "chat" }),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.warn("crisp.api.send_failed", { status: res.status, body: text.slice(0, 300) });
      return { ok: false, error: text || res.statusText };
    }
    const data = (await res.json()) as { data?: { fingerprint?: number } };
    return { ok: true, fingerprint: data.data?.fingerprint };
  } catch (err) {
    log.warn("crisp.api.send_exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: err instanceof Error ? err.message : "network_error" };
  }
}

// ---------------------------------------------------------------------------
// Update conversation state
// ---------------------------------------------------------------------------

export type CrispConversationState = "pending" | "unresolved" | "resolved";

/**
 * Change the state of a Crisp conversation.
 *   pending     → awaiting operator response (yellow)
 *   unresolved  → open / active (default)
 *   resolved    → closed (green)
 */
export async function updateCrispState(
  sessionId: string,
  state: CrispConversationState,
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "not_configured" };

  try {
    const res = await fetch(
      `${CRISP_API_BASE}/website/${cfg.websiteId}/conversation/${sessionId}/meta`,
      {
        method: "PATCH",
        headers: {
          Authorization: authHeader(cfg),
          "X-Crisp-Tier": "user",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state }),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: text || res.statusText };
    }
    return { ok: true };
  } catch (err) {
    log.warn("crisp.api.state_update_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: err instanceof Error ? err.message : "network_error" };
  }
}

// ---------------------------------------------------------------------------
// List conversations (for inbox sync / search)
// ---------------------------------------------------------------------------

export interface CrispConversationListItem {
  session_id: string;
  state: CrispConversationState;
  created_at: number;
  updated_at: number;
  meta?: {
    nickname?: string;
    email?: string;
    subject?: string;
    segments?: string[];
  };
  unread?: { operator: number };
  last_message?: { content?: string; timestamp?: number };
}

function normaliseCrispMs(value: number | undefined): number | null {
  if (!value || !Number.isFinite(value)) return null;
  return value < 10_000_000_000 ? value * 1000 : value;
}

/**
 * List conversations for the website, newest-first.
 * Used to seed/sync the support inbox when webhooks are missed.
 */
export async function listCrispConversations(opts: {
  pageNumber?: number;
  filterResolved?: boolean;
} = {}): Promise<CrispConversationListItem[]> {
  const cfg = getConfig();
  if (!cfg) return [];

  const params = new URLSearchParams({
    per_page: "50",
  });
  if (opts.filterResolved === false) {
    params.set("filter_not_resolved", "1");
  }

  try {
    const pageNumber = opts.pageNumber ?? 1;
    const res = await fetch(
      `${CRISP_API_BASE}/website/${cfg.websiteId}/conversations/${pageNumber}?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader(cfg),
          "X-Crisp-Tier": "user",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: CrispConversationListItem[] };
    return (data.data ?? []).map((conversation) => {
      const updatedAt = normaliseCrispMs(conversation.updated_at);
      const createdAt = normaliseCrispMs(conversation.created_at);
      const lastMessageAt = normaliseCrispMs(
        conversation.last_message?.timestamp,
      );

      return {
        ...conversation,
        updated_at: updatedAt ?? createdAt ?? Date.now(),
        created_at: createdAt ?? updatedAt ?? Date.now(),
        last_message: conversation.last_message
          ? {
              ...conversation.last_message,
              timestamp: lastMessageAt ?? updatedAt ?? createdAt ?? Date.now(),
            }
          : conversation.last_message,
      };
    });
  } catch (err) {
    log.warn("crisp.api.list_conversations_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
