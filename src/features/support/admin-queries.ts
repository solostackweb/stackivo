import "server-only";

/**
 * Founder-console reads over `support_threads`. Service-role only;
 * never expose to authenticated callers since the table holds enough
 * cross-user metadata to leak information at scale.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import type {
  SupportThread,
  SupportSystem,
  SupportStatus,
} from "./types";

export interface ThreadFilter {
  status?: SupportStatus | "all";
  system?: SupportSystem | "all";
  limit?: number;
}

/**
 * List threads for the merged `/admin/support` feed. Defaults to the
 * 50 most recently active rows across all sources.
 */
export async function listSupportThreads(
  filter: ThreadFilter = {},
): Promise<SupportThread[]> {
  const admin = getAdminSupabase();
  const limit = Math.min(filter.limit ?? 50, 200);

  let q = admin
    .from("support_threads")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (filter.status && filter.status !== "all") {
    q = q.eq("status", filter.status);
  }
  if (filter.system && filter.system !== "all") {
    q = q.eq("external_system", filter.system);
  }

  const { data, error } = await q;
  if (error) return [];
  return (data as SupportThread[] | null) ?? [];
}

/**
 * Per-user history widget on /admin/users/[id].
 * Always sorted newest-first; latest 10 by default.
 */
export async function listSupportThreadsForUser(
  userId: string,
  limit = 10,
): Promise<SupportThread[]> {
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("support_threads")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as SupportThread[] | null) ?? [];
}

/**
 * Cheap counts for the support-pulse card on the Now page.
 */
export interface SupportPulse {
  open_chats_24h: number;
  open_tickets: number;
  resolved_7d: number;
  total_open: number;
}

export async function getSupportPulse(): Promise<SupportPulse> {
  const admin = getAdminSupabase();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [openChats, openTickets, resolved7d, totalOpen] = await Promise.all([
    admin
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .eq("external_system", "crisp")
      .in("status", ["new", "open", "waiting"])
      .gte("last_message_at", since24h),
    admin
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .eq("external_system", "zoho_desk")
      .in("status", ["new", "open", "waiting"]),
    admin
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("updated_at", since7d),
    admin
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "open", "waiting"]),
  ]);

  return {
    open_chats_24h: openChats.count ?? 0,
    open_tickets: openTickets.count ?? 0,
    resolved_7d: resolved7d.count ?? 0,
    total_open: totalOpen.count ?? 0,
  };
}

/**
 * Churn-signal counts for a user — drives red badges on the user
 * detail page.
 */
export interface ChurnSignals {
  open_threads: number;
  threads_30d: number;
  has_at_risk_tag: boolean;
}

export async function getUserChurnSignals(
  userId: string,
): Promise<ChurnSignals> {
  const admin = getAdminSupabase();
  const since30d = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [openCnt, recentCnt, atRisk] = await Promise.all([
    admin
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["new", "open", "waiting"]),
    admin
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since30d),
    admin
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .contains("tags", ["at-risk-churn"]),
  ]);

  return {
    open_threads: openCnt.count ?? 0,
    threads_30d: recentCnt.count ?? 0,
    has_at_risk_tag: (atRisk.count ?? 0) > 0,
  };
}
