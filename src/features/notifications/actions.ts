"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  listNotifications,
  type NotificationRecord,
} from "./server";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
  return user.id;
}

const idSchema = z.string().uuid();

export async function markNotificationReadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid id." };
  await requireUserId();
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true } as never)
    .eq("id", id.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const userId = await requireUserId();
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true } as never)
    .eq("user_id", userId)
    .eq("read", false);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: "All caught up." };
}

export async function deleteNotificationAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid id." };
  await requireUserId();
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("notifications").delete().eq("id", id.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

/**
 * Read-only fetch surface for client components that can't import server
 * helpers directly (e.g. the notifications dropdown in the top nav).
 *
 * Auth is enforced via `requireUserId()` so the action redirects to the
 * login route if called from an unauthenticated session.
 */
export async function fetchNotificationsAction(): Promise<{
  items: NotificationRecord[];
  unreadCount: number;
}> {
  await requireUserId();
  const items = await listNotifications({ limit: 20 });
  const unreadCount = items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
  return { items, unreadCount };
}
