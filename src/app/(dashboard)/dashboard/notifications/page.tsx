import { NotificationsView } from "@/features/notifications/components/notifications-view";
import { listNotifications } from "@/features/notifications/server";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await listNotifications({ limit: 100 });
  return <NotificationsView initial={notifications} />;
}
