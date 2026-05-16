import "server-only";

/**
 * Suppression list — global per-address email blocklist.
 *
 * The dispatcher consults this list before every outbound send. Any
 * address with an active suppression is skipped (logged to delivery_logs
 * with status='suppressed') so we don't:
 *
 *   - Keep hammering hard-bounced mailboxes (reputation-killer).
 *   - Send to someone who hit "Mark as spam" (account-ban risk).
 *   - Send to someone who has explicitly unsubscribed (legal risk under
 *     CAN-SPAM / GDPR).
 *
 * All reads + writes go through the service-role client. No RLS policy
 * for authenticated users: knowing that client X has suppressed mail is
 * a small-but-real privacy leak, and letting tenants remove suppressions
 * would be a reputation foot-gun.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import type { EmailSuppressionReason } from "@/lib/supabase/types";

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns the active suppression row for an address, or `null`.
 *
 * Failing open (returning null on query error) keeps deliverability
 * graceful if the suppression table is temporarily unreachable. A dead
 * suppression check should not block a legitimate send.
 */
export async function getSuppression(email: string): Promise<{
  reason: EmailSuppressionReason;
} | null> {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("email_suppressions")
    .select("reason")
    .eq("email", normalise(email))
    .maybeSingle();
  if (error || !data) return null;
  return data as { reason: EmailSuppressionReason };
}

export interface AddSuppressionInput {
  email: string;
  reason: EmailSuppressionReason;
  triggeredByUserId?: string | null;
  providerMessageId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Upsert a suppression. Safe to call from webhook retries — duplicate
 * inserts hit the `email` primary key and we upgrade the row's reason +
 * metadata instead.
 */
export async function recordSuppression(
  input: AddSuppressionInput,
): Promise<void> {
  const admin = getAdminSupabase();
  await admin
    .from("email_suppressions")
    .upsert(
      {
        email: normalise(input.email),
        reason: input.reason,
        triggered_by_user_id: input.triggeredByUserId ?? null,
        provider: "brevo",
        provider_message_id: input.providerMessageId ?? null,
        metadata: (input.metadata ?? {}) as never,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "email" },
    );
}
