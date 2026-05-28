/**
 * /admin/support — unified support inbox.
 *
 * Sections:
 *   1. Metric bar   — open / waiting / resolved (7d) / open tickets
 *   2. Tab bar      — All | Open | Waiting | Resolved | Delivery failures
 *   3. Thread list  — click → /admin/support/[id]
 */

import Link from "next/link";
import {
  MessageCircle,
  Ticket,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle2,
  Mail,
  ArrowRight,
  User,
} from "lucide-react";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { AdminPageHeader } from "@/components/admin/page-header";
import { listSupportThreads, getSupportPulse } from "@/features/support/admin-queries";
import { formatRelative, formatIstStamp } from "@/features/admin/format";
import { cn } from "@/lib/utils";
import { log } from "@/lib/logger";
import type { SupportStatus } from "@/features/support/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type Tab = "all" | "open" | "waiting" | "resolved" | "failures";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All threads" },
  { value: "open", label: "Open" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "failures", label: "Delivery failures" },
];

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
    .select("id, user_id, kind, status, to_email, subject, error, entity_type, entity_id, created_at")
    .in("status", ["failed", "bounced", "blocked"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (result.error) {
    log.warn("admin.support.fetch_failures_failed", { error: result.error.message });
    return [];
  }
  return (result.data as FailureRow[] | null) ?? [];
}

function asString(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function AdminSupportPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = (asString(sp.tab) as Tab | undefined) ?? "all";

  const statusFilter: SupportStatus | "all" =
    tab === "open" ? "open"
    : tab === "waiting" ? "waiting"
    : tab === "resolved" ? "resolved"
    : "all";

  const [pulse, threads, failures] = await Promise.all([
    getSupportPulse(),
    tab !== "failures"
      ? listSupportThreads({ status: statusFilter, limit: 100 })
      : Promise.resolve([]),
    tab === "failures" ? fetchRecentFailures() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Support"
        subtitle="Unified inbox — Crisp chats · delivery failures"
      />

      {/* Metric bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          label="Open"
          value={pulse.total_open}
          tone={pulse.total_open > 5 ? "alert" : "ok"}
        />
        <MetricCard
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          label="New last 24h"
          value={pulse.open_chats_24h}
          tone={pulse.open_chats_24h > 0 ? "warn" : "ok"}
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          label="Resolved (7d)"
          value={pulse.resolved_7d}
          tone="ok"
        />
        <MetricCard
          icon={<Ticket className="h-4 w-4 text-blue-500" />}
          label="Open tickets"
          value={pulse.open_tickets}
          tone={pulse.open_tickets > 3 ? "warn" : "ok"}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/60 pb-px">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/support?tab=${t.value}`}
            className={cn(
              "whitespace-nowrap rounded-t px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.value
                ? "border border-b-background bg-background text-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Thread list */}
      {tab !== "failures" ? (
        threads.length === 0 ? (
          <EmptyState message={
            tab === "resolved"
              ? "No resolved threads yet."
              : tab === "waiting"
                ? "No threads waiting on you."
                : "No support threads yet. They will appear here as Crisp conversations happen."
          } />
        ) : (
          <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60 bg-card">
            {threads.map((t) => {
              const isOpen = t.status === "new" || t.status === "open";
              const isWaiting = t.status === "waiting";

              return (
                <li key={t.id} className="group relative">
                  <Link
                    href={`/admin/support/${t.id}`}
                    className="flex items-start gap-3 p-3.5 transition-colors hover:bg-accent/40"
                  >
                    {/* System icon */}
                    <div className="mt-0.5 shrink-0">
                      {t.external_system === "crisp" ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
                          <Ticket className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                          isOpen
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : isWaiting
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        )}>
                          {t.status}
                        </span>

                        {(t.priority === "high" || t.priority === "urgent") && (
                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                            t.priority === "urgent"
                              ? "bg-red-500/10 text-red-700 dark:text-red-300"
                              : "bg-orange-500/10 text-orange-700 dark:text-orange-300",
                          )}>
                            {t.priority}
                          </span>
                        )}

                        {t.category && (
                          <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {t.category}
                          </span>
                        )}

                        <span className="truncate text-[13px] font-medium">
                          {t.subject ?? "(no subject)"}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        {t.user_id ? (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="font-mono">{t.user_id.slice(0, 8)}&hellip;</span>
                          </span>
                        ) : (
                          <span className="italic">guest</span>
                        )}
                        <span>{formatRelative(t.last_message_at)}</span>
                        <span className="hidden font-mono sm:inline">{formatIstStamp(t.last_message_at)}</span>
                        {t.tags.length > 0 && (
                          <span className="flex gap-1">
                            {t.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded bg-muted/60 px-1 text-[10px]">{tag}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        failures.length === 0 ? (
          <EmptyState message="No recent delivery failures. Inbox is clean." />
        ) : (
          <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60 bg-card">
            {failures.map((f) => (
              <li key={f.id} className="flex items-start gap-3 p-3.5">
                <div className="mt-0.5 shrink-0">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    f.status === "bounced" ? "bg-amber-500/10" : "bg-red-500/10",
                  )}>
                    <Mail className={cn(
                      "h-3.5 w-3.5",
                      f.status === "bounced" ? "text-amber-600" : "text-red-600",
                    )} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      f.status === "blocked" || f.status === "failed"
                        ? "bg-red-500/10 text-red-700 dark:text-red-400"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    )}>
                      {f.status}
                    </span>
                    <span className="text-[13px] font-medium">{f.kind}</span>
                    <span className="font-mono text-xs text-muted-foreground">&rarr; {f.to_email ?? "?"}</span>
                    <Link
                      href={`/admin/users/${f.user_id}`}
                      className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      view user <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  {f.subject && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{f.subject}</p>
                  )}
                  {f.error && (
                    <p className="mt-0.5 truncate text-[11px] text-red-600 dark:text-red-400">{f.error}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatIstStamp(f.created_at)} &middot; {formatRelative(f.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "ok" | "warn" | "alert";
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3",
      tone === "alert"
        ? "border-red-500/30 bg-red-500/5"
        : tone === "warn"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border/60 bg-card",
    )}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className={cn(
        "mt-1.5 text-2xl font-semibold tabular-nums",
        tone === "alert" ? "text-red-600 dark:text-red-400"
        : tone === "warn" ? "text-amber-600 dark:text-amber-400"
        : "text-foreground",
      )}>
        {value.toLocaleString("en-IN")}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
