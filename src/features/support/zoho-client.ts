import "server-only";

/**
 * Thin Zoho Desk REST client.
 *
 * Scope is intentionally narrow — we only need:
 *   1. POST /api/v1/tickets               → create from `/help` form
 *   2. GET  /api/v1/tickets/{id}          → fetch for webhook ingest
 *   3. DELETE /api/v1/contacts/{id}       → DPDP fan-out from soft-delete
 *
 * If `ZOHO_DESK_ACCESS_TOKEN` is missing the client returns
 * `{ ok: false, error: 'not_configured' }` so callers can transparently
 * fall back (e.g. /help → Brevo email).
 *
 * Auth: Zoho expects `Authorization: Zoho-oauthtoken <token>` plus
 * `orgId: <orgId>` headers. We don't refresh tokens automatically —
 * the SUPPORT_SYSTEM_SETUP guide covers minting a long-lived token via
 * the Self-Client flow.
 */

import { requireServerEnv } from "@/config/env";
import { log } from "@/lib/logger";

interface ZohoConfig {
  apiBase: string;
  orgId: string;
  accessToken: string;
  departmentId: string | null;
}

function getConfig(): ZohoConfig | null {
  const env = requireServerEnv();
  if (!env.zohoDeskOrgId || !env.zohoDeskAccessToken) return null;
  return {
    apiBase: env.zohoDeskApiBase,
    orgId: env.zohoDeskOrgId,
    accessToken: env.zohoDeskAccessToken,
    departmentId: env.zohoDeskDepartmentId ?? null,
  };
}

export function isZohoConfigured(): boolean {
  return getConfig() !== null;
}

interface ZohoFetchResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function zohoFetch<T>(
  path: string,
  init: RequestInit & { cfg: ZohoConfig },
): Promise<ZohoFetchResult<T>> {
  const { cfg, headers, ...rest } = init;
  try {
    const res = await fetch(`${cfg.apiBase}${path}`, {
      ...rest,
      headers: {
        Authorization: `Zoho-oauthtoken ${cfg.accessToken}`,
        orgId: cfg.orgId,
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      // Never cache support traffic.
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.warn("zoho.api.error", { path, status: res.status, body: text.slice(0, 500) });
      return { ok: false, status: res.status, error: text || res.statusText };
    }
    if (res.status === 204) return { ok: true, status: 204 };
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch (err) {
    log.warn("zoho.api.exception", {
      path,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CreateTicketInput {
  subject: string;
  description: string;
  contactEmail: string;
  contactName?: string;
  category?: string;
  priority?: "Low" | "Medium" | "High";
  tags?: string[];
  /** Arbitrary extra metadata threaded into the ticket description. */
  metadata?: Record<string, unknown>;
}

export interface CreateTicketResult {
  ok: boolean;
  ticketId?: string;
  ticketNumber?: string;
  error?: string;
  /** True when Zoho isn't configured. Caller should fall back. */
  notConfigured?: boolean;
}

/**
 * Create a Zoho Desk ticket. Best-effort — when the API is unconfigured
 * or unhealthy, returns an envelope that lets the caller fall back to
 * email-via-Brevo.
 */
export async function createZohoTicket(
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, notConfigured: true };

  // Append the metadata as a fenced block at the bottom of the
  // description so the founder can see it inline without leaving the
  // ticket UI. Truncate to keep ticket bodies readable.
  const meta = input.metadata
    ? "\n\n---\nDiagnostic context:\n```\n" +
      JSON.stringify(input.metadata, null, 2).slice(0, 2_000) +
      "\n```"
    : "";

  const body: Record<string, unknown> = {
    subject: input.subject.slice(0, 250),
    description: (input.description + meta).slice(0, 10_000),
    contact: {
      email: input.contactEmail,
      lastName: input.contactName ?? input.contactEmail.split("@")[0]!,
    },
    channel: "Web",
    priority: input.priority ?? "Medium",
    classification: "Question",
    category: input.category ?? "How To",
  };
  if (cfg.departmentId) body.departmentId = cfg.departmentId;
  if (input.tags && input.tags.length > 0) body.tags = input.tags.slice(0, 10);

  const res = await zohoFetch<{ id: string; ticketNumber: string }>(
    "/api/v1/tickets",
    {
      cfg,
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) return { ok: false, error: res.error };
  return {
    ok: true,
    ticketId: res.data?.id,
    ticketNumber: res.data?.ticketNumber,
  };
}

export interface ZohoTicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  contactId: string | null;
  webUrl: string;
  createdTime: string;
  modifiedTime: string;
}

/**
 * Fetch a single ticket. Used by the Zoho Desk webhook to enrich the
 * `support_threads` row with the canonical ticket state.
 */
export async function getZohoTicket(
  ticketId: string,
): Promise<ZohoTicketSummary | null> {
  const cfg = getConfig();
  if (!cfg) return null;

  const res = await zohoFetch<{
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    category: string | null;
    contactId: string | null;
    webUrl: string;
    createdTime: string;
    modifiedTime: string;
  }>(`/api/v1/tickets/${ticketId}`, { cfg, method: "GET" });

  if (!res.ok || !res.data) return null;
  return res.data;
}

/**
 * Best-effort delete of a contact's data in Zoho Desk for DPDP fan-out
 * from the soft-delete admin action. Failure is logged but does NOT
 * unwind the upstream action.
 */
export async function deleteZohoContactByEmail(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, error: "not_configured" };

  // Search for the contact by email first.
  const search = await zohoFetch<{ data?: Array<{ id: string }> }>(
    `/api/v1/contacts/search?email=${encodeURIComponent(email)}`,
    { cfg, method: "GET" },
  );
  if (!search.ok) return { ok: false, error: search.error };

  const contactId = search.data?.data?.[0]?.id;
  if (!contactId) return { ok: true }; // nothing to delete; treat as success

  const del = await zohoFetch(`/api/v1/contacts/${contactId}`, {
    cfg,
    method: "DELETE",
  });
  if (!del.ok) return { ok: false, error: del.error };
  return { ok: true };
}
