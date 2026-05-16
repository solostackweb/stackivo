import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/supabase/types";

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
}

function mapRow(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

export async function listNotifications(opts: {
  unreadOnly?: boolean;
  limit?: number;
} = {}): Promise<NotificationRecord[]> {
  const supabase = await getServerSupabase();
  let q = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.unreadOnly) q = q.eq("read", false);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as NotificationRow[]).map(mapRow);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await getServerSupabase();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);
  return count ?? 0;
}

/**
 * Flip a single notification to read. RLS ensures the row belongs to the
 * authenticated user; passing an arbitrary `id` from a public client is
 * therefore safe.
 */
export async function markNotificationRead(id: string): Promise<void> {
  if (!id) return;
  const supabase = await getServerSupabase();
  await supabase
    .from("notifications")
    .update({ read: true } as never)
    .eq("id", id);
}

/**
 * Mark every unread notification owned by the authenticated user as read.
 * Called from the notifications page "Mark all read" button and the bell
 * dropdown.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true } as never)
    .eq("user_id", user.id)
    .eq("read", false);
}

/**
 * Insert a notification for the authenticated user. Modules call this from
 * their actions after successful business mutations (e.g. invoice marked
 * paid → "Invoice paid" notification).
 */
export async function createNotification(input: {
  type: string;
  title: string;
  message?: string | null;
}): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
  } as never);
}
