/**
 * /admin/notifications — broadcast composer + recent broadcast log.
 *
 * The "recent broadcasts" stream is derived from the notifications
 * table (`title` grouped by `created_at` is good enough for a v1 — a
 * proper broadcast table can land in Phase 4 if needed).
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { formatIstStamp, formatRelative } from "@/features/admin/format";

export const dynamic = "force-dynamic";

interface BroadcastSummary {
  title: string;
  type: string;
  first_at: string;
  recipients: number;
}

async function fetchRecentBroadcasts(): Promise<BroadcastSummary[]> {
  const admin = getAdminSupabase();
  // Cheap heuristic: pull last 5k rows, group in JS. Switch to a SQL
  // RPC if the broadcast log ever crosses 100k.
  const result = await admin
    .from("notifications")
    .select("title, type, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  const rows =
    (result.data as Array<{
      title: string;
      type: string;
      created_at: string;
    }> | null) ?? [];

  const groups = new Map<string, BroadcastSummary>();
  for (const r of rows) {
    // Bucket by title + minute-resolution timestamp.
    const minute = r.created_at.slice(0, 16);
    const key = `${minute}::${r.title}`;
    const existing = groups.get(key);
    if (existing) {
      existing.recipients += 1;
    } else {
      groups.set(key, {
        title: r.title,
        type: r.type,
        first_at: r.created_at,
        recipients: 1,
      });
    }
  }
  // Keep only multi-recipient groups (broadcasts) and the most recent 20.
  return Array.from(groups.values())
    .filter((g) => g.recipients > 1)
    .sort((a, b) => b.first_at.localeCompare(a.first_at))
    .slice(0, 20);
}

export default async function AdminNotificationsPage() {
  const broadcasts = await fetchRecentBroadcasts();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        subtitle="In-app broadcasts. One row per recipient — no undo."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <BroadcastForm />

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent broadcasts
          </h2>
          {broadcasts.length === 0 ? (
            <div className="rounded border border-dashed bg-muted/20 px-3 py-6 text-xs text-muted-foreground">
              No broadcasts in the recent history.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-md border bg-card text-xs">
              {broadcasts.map((b) => (
                <li
                  key={`${b.first_at}::${b.title}`}
                  className="border-b border-border/40 p-2.5 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium">{b.title}</span>
                    <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                      {formatRelative(b.first_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-wider">{b.type}</span>
                    <span className="tabular-nums">
                      {b.recipients.toLocaleString("en-IN")} recipients
                    </span>
                    <span className="font-mono">{formatIstStamp(b.first_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
