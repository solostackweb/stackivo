/**
 * /admin/support — thin inbox-style view.
 *
 * V1 sources:
 *   - delivery_logs with status in (failed/bounced/blocked) — these are
 *     likely complaints the user might write in about.
 *
 * Each row links to the user detail page, so the founder can dive
 * straight into context (activity timeline, payments, suppressions).
 *
 * V2 will add a real inbound parse from Brevo + manual reply via the
 * trigger-email helper. That requires Brevo inbound-parse config which
 * lives outside this codebase.
 */

import Link from "next/link";
import { Mail, ExternalLink, MessageCircle, Ticket } from "lucide-react";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  formatIstStamp,
  formatRelative,
  shortenId,
} from "@/features/admin/format";
import { log } from "@/lib/logger";
import { listSupportThreads } from "@/features/support/admin-queries";

export const dynamic = "force-dynamic";

interface FailureRow {
  id: string;
  user_id: string;
  kind: string;
  status: string;
  to_email: string | null;
  subject: string | null;
  error: string | null;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

async function fetchRecentFailures(): Promise<FailureRow[]> {
  const admin = getAdminSupabase();
  const result = await admin
    .from("delivery_logs")
    .select(
      "id, user_id, kind, status, to_email, subject, error, entity_type, entity_id, created_at",
    )
    .in("status", ["failed", "bounced", "blocked"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (result.error) {
    log.warn("admin.support.fetch_failures_failed", {
      error: result.error.message,
    });
    return [];
  }
  return (result.data as FailureRow[] | null) ?? [];
}

export default async function AdminSupportPage() {
  const [failures, threads] = await Promise.all([
    fetchRecentFailures(),
    listSupportThreads({ limit: 50 }),
  ]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Support"
        subtitle="Merged inbox · Crisp chats · Zoho Desk tickets · delivery failures"
      />

      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
        Threads sync via webhooks from Crisp + Zoho Desk into{" "}
        <code>support_threads</code>. Click any row to open the source
        conversation. Delivery failures below are derived from{" "}
        <code>delivery_logs</code> and surface users likely to write in.
      </div>

      {/* Merged thread list (Crisp + Zoho Desk) */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          Recent threads — last {threads.length} across all sources
        </h2>

        {threads.length === 0 ? (
          <div className="rounded border border-dashed bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
            No support threads yet. Configure the Crisp + Zoho Desk
            webhooks (see <code>SUPPORT_SYSTEM_SETUP.md</code>) and rows
            will appear here as conversations happen.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-md border bg-card text-xs">
            {threads.map((t) => {
              const statusColor =
                t.status === "resolved" || t.status === "closed"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : t.status === "waiting"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300";
              return (
                <li
                  key={t.id}
                  className="border-b border-border/40 p-3 last:border-b-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {t.external_system === "crisp" ? (
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Ticket className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${statusColor}`}>
                      {t.status}
                    </span>
                    {t.priority !== "normal" ? (
                      <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-300">
                        {t.priority}
                      </span>
                    ) : null}
                    <span className="font-medium">
                      {t.subject ?? "(no subject)"}
                    </span>
                    <span className="ml-auto flex items-center gap-2 text-muted-foreground">
                      {t.user_id ? (
                        <Link
                          href={`/admin/users/${t.user_id}`}
                          className="hover:text-foreground"
                        >
                          user
                        </Link>
                      ) : (
                        <span className="italic">guest</span>
                      )}
                      {t.external_url ? (
                        <a
                          href={t.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          open in {t.external_system === "crisp" ? "Crisp" : "Zoho"}{" "}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">
                      {formatIstStamp(t.last_message_at)}
                    </span>
                    <span className="tabular-nums">
                      {formatRelative(t.last_message_at)}
                    </span>
                    {t.tags.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {t.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="rounded border border-border/60 px-1 text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          Likely complaints — last 50 failed sends
        </h2>

        {failures.length === 0 ? (
          <div className="rounded border border-dashed bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
            No recent delivery failures. Inbox is clean.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-md border bg-card text-xs">
            {failures.map((f) => (
              <li
                key={f.id}
                className="border-b border-border/40 p-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      f.status === "blocked"
                        ? "rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-red-700 dark:text-red-400"
                        : f.status === "bounced"
                          ? "rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400"
                          : "rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-red-700 dark:text-red-400"
                    }
                  >
                    {f.status}
                  </span>
                  <span className="font-medium">{f.kind}</span>
                  <span className="font-mono text-muted-foreground">
                    → {f.to_email ?? "?"}
                  </span>
                  <Link
                    href={`/admin/users/${f.user_id}`}
                    className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    open user <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {f.subject ? (
                  <div className="mt-0.5 truncate text-muted-foreground">
                    {f.subject}
                  </div>
                ) : null}
                {f.error ? (
                  <div className="mt-0.5 truncate text-red-600 dark:text-red-400">
                    {f.error}
                  </div>
                ) : null}
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="font-mono">
                    {formatIstStamp(f.created_at)}
                  </span>
                  <span className="tabular-nums">
                    {formatRelative(f.created_at)}
                  </span>
                  {f.entity_id ? (
                    <span className="font-mono">
                      {f.entity_type} {shortenId(f.entity_id)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
