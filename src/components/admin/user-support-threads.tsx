/**
 * Per-user support history widget on the user detail page.
 *
 * Renders the latest threads (Crisp + Zoho Desk) from `support_threads`
 * — each links out to the source system. Stays mounted with a friendly
 * empty state when no threads exist.
 */

import { MessageCircle, Ticket, ExternalLink } from "lucide-react";
import {
  formatIstStamp,
  formatRelative,
} from "@/features/admin/format";
import type { SupportThread } from "@/features/support/types";

interface Props {
  userId: string;
  threads: SupportThread[];
}

export function UserSupportThreads({ userId, threads }: Props) {
  // userId is reserved for a future "open all" deep-link.
  void userId;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" />
        Recent support history
      </h2>

      {threads.length === 0 ? (
        <div className="rounded border border-dashed bg-muted/20 px-3 py-5 text-center text-xs text-muted-foreground">
          No support threads on file. Inbound chats / tickets will appear here.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-md border bg-card text-xs">
          {threads.map((t) => {
            const Icon = t.external_system === "crisp" ? MessageCircle : Ticket;
            const statusColor =
              t.status === "resolved" || t.status === "closed"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : t.status === "waiting"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300";
            return (
              <li
                key={t.id}
                className="flex items-start gap-2 border-b border-border/40 p-2.5 last:border-b-0"
              >
                <Icon
                  className={`mt-0.5 h-3.5 w-3.5 ${
                    t.external_system === "crisp"
                      ? "text-emerald-600"
                      : "text-blue-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${statusColor}`}
                    >
                      {t.status}
                    </span>
                    {t.priority !== "normal" ? (
                      <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-300">
                        {t.priority}
                      </span>
                    ) : null}
                    <span className="truncate font-medium">
                      {t.subject ?? "(no subject)"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">
                      {formatIstStamp(t.last_message_at)}
                    </span>
                    <span className="tabular-nums">
                      {formatRelative(t.last_message_at)}
                    </span>
                  </div>
                </div>
                {t.external_url ? (
                  <a
                    href={t.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    open <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
