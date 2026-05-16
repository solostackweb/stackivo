import "server-only";

/**
 * Support webhook ingestion — shared helpers.
 *
 * Both `/api/webhooks/crisp` and `/api/webhooks/zoho-desk` upsert into
 * `public.support_threads` so the founder console always has a fresh
 * view of every conversation in one place. Body content stays at the
 * vendor; we only mirror metadata.
 *
 * Identity resolution: the customer's email is the only stable bridge
 * between Crisp / Zoho Desk and `auth.users`. We look the email up via
 * the service-role client and store `user_id = null` if no match —
 * support_threads still tracks the thread, just unlinked.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import type {
  SupportSystem,
  SupportStatus,
  SupportPriority,
  SupportCategory,
} from "./types";

export interface UpsertThreadInput {
  externalSystem: SupportSystem;
  externalId: string;
  subject?: string | null;
  status?: SupportStatus;
  priority?: SupportPriority;
  category?: SupportCategory | null;
  tags?: string[];
  externalUrl?: string | null;
  lastMessageAt?: string | null;
  /** Customer email — used to resolve `user_id`. */
  contactEmail?: string | null;
}

/**
 * Upsert a thread row by (external_system, external_id). Returns the
 * row id; resolves user_id by email when possible.
 */
export async function upsertSupportThread(
  input: UpsertThreadInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const admin = getAdminSupabase();

  // Resolve user id by email (best-effort).
  let userId: string | null = null;
  if (input.contactEmail) {
    const lookup = await admin
      .from("user_profiles")
      .select("id")
      .eq("email", input.contactEmail.toLowerCase())
      .maybeSingle();
    userId = (lookup.data as { id?: string } | null)?.id ?? null;
  }

  const row = {
    user_id: userId,
    external_system: input.externalSystem,
    external_id: input.externalId,
    subject: input.subject ?? null,
    status: input.status ?? "open",
    priority: input.priority ?? "normal",
    category: input.category ?? null,
    tags: input.tags ?? [],
    external_url: input.externalUrl ?? null,
    last_message_at: input.lastMessageAt ?? new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("support_threads")
    .upsert(row as never, {
      onConflict: "external_system,external_id",
    })
    .select("id")
    .single();

  if (error) {
    log.warn("support.thread.upsert_failed", {
      external_system: input.externalSystem,
      external_id: input.externalId,
      error: error.message,
    });
    return { ok: false, error: error.message };
  }

  return { ok: true, id: (data as { id: string }).id };
}

/**
 * Mark a thread closed/resolved without otherwise changing it.
 * Idempotent — if the row doesn't exist yet (out-of-order webhooks),
 * we silently skip rather than upserting from a partial event.
 */
export async function setSupportThreadStatus(
  externalSystem: SupportSystem,
  externalId: string,
  status: SupportStatus,
): Promise<void> {
  const admin = getAdminSupabase();
  await admin
    .from("support_threads")
    .update({
      status,
      last_message_at: new Date().toISOString(),
    } as never)
    .eq("external_system", externalSystem)
    .eq("external_id", externalId);
}
