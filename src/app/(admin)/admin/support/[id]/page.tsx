/**
 * /admin/support/[id] — thread detail.
 *
 * Layout: two columns
 *   Left (flex-1)  — conversation messages (from Crisp) + reply box
 *   Right (w-72)   — thread metadata + user context + quick actions
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, MessageCircle, Ticket } from "lucide-react";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getCrispMessages, isCrispConfigured } from "@/features/support/crisp-client";
import { getUserOverview } from "@/features/admin/queries";
import { formatIstStamp, formatRelative } from "@/features/admin/format";
import { cn } from "@/lib/utils";
import type { SupportThread } from "@/features/support/types";
import { ThreadStatusBar } from "@/components/admin/support-thread-status-bar";
import { ThreadReplyBox } from "@/components/admin/support-thread-reply-box";
import { ThreadTagEditor } from "@/components/admin/support-thread-tag-editor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminSupportThreadPage({ params }: Props) {
  const { id } = await params;
  await requireAdmin();

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("support_threads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();
  const thread = data as SupportThread;

  // Fetch messages from Crisp if this is a Crisp conversation
  const messages =
    thread.external_system === "crisp" && isCrispConfigured()
      ? await getCrispMessages(thread.external_id)
      : [];

  // Fetch linked user if we have one
  const linkedUser = thread.user_id
    ? await getUserOverview(thread.user_id).catch(() => null)
    : null;

  const isCrisp = thread.external_system === "crisp";
  const isOpen = thread.status === "new" || thread.status === "open";
  const isWaiting = thread.status === "waiting";
  const isResolved = thread.status === "resolved" || thread.status === "closed";

  return (
    <div className="flex flex-col gap-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/support"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Support inbox
        </Link>
      </div>

      <AdminPageHeader
        title={thread.subject ?? "(no subject)"}
        subtitle={
          <span className="flex items-center gap-2">
            {isCrisp ? (
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Ticket className="h-3.5 w-3.5 text-blue-600" />
            )}
            <span className="capitalize">{thread.external_system.replace("_", " ")}</span>
            <span className="font-mono text-[11px]">{thread.external_id.slice(0, 16)}&hellip;</span>
            {thread.external_url && (
              <a
                href={thread.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Open in {isCrisp ? "Crisp" : "Zoho"} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </span>
        }
        actions={<ThreadStatusBar thread={thread} />}
      />

      {/* Two-column layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

        {/* ── Left: messages + reply ──────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-3">

          {/* Message history */}
          {messages.length === 0 && isCrisp && !isCrispConfigured() ? (
            <div className="rounded-lg border border-dashed border-border/60 p-5 text-center text-xs text-muted-foreground">
              Crisp API credentials not configured. Set{" "}
              <code>CRISP_API_IDENTIFIER</code> and{" "}
              <code>CRISP_API_KEY</code> in environment variables to see
              message history and reply from here.
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-5 text-center text-xs text-muted-foreground">
              {isCrisp
                ? "No messages fetched yet. They appear here once Crisp API is configured."
                : "Message history is only available for Crisp conversations."}
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Conversation ({messages.length} messages)
              </h2>
              <div className="flex flex-col gap-2">
                {messages.map((msg) => {
                  const isOperator = msg.from === "operator";
                  const content =
                    typeof msg.content === "string"
                      ? msg.content
                      : JSON.stringify(msg.content);

                  return (
                    <div
                      key={msg.fingerprint}
                      className={cn(
                        "flex max-w-[85%] flex-col gap-0.5",
                        isOperator ? "self-end items-end" : "self-start items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                          isOperator
                            ? "rounded-tr-sm bg-primary text-primary-foreground"
                            : "rounded-tl-sm bg-muted/70 text-foreground",
                        )}
                      >
                        {content}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{isOperator ? "You" : (msg.user.nickname ?? "Visitor")}</span>
                        <span>·</span>
                        <span>{formatRelative(new Date(msg.timestamp).toISOString())}</span>
                        {msg.type === "note" && (
                          <span className="rounded bg-amber-500/10 px-1 text-amber-600 dark:text-amber-400">
                            note
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reply box */}
          {isCrisp && !isResolved ? (
            <ThreadReplyBox threadId={thread.id} />
          ) : isResolved ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
              This conversation is resolved. Reopen it to send a reply.
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
              Replies are only available for Crisp conversations.
            </div>
          )}
        </div>

        {/* ── Right: metadata sidebar ────────────────────────────── */}
        <aside className="w-full shrink-0 space-y-3 lg:w-72">

          {/* Thread details */}
          <div className="rounded-lg border border-border/60 bg-card text-xs">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Thread details
            </div>
            <div className="space-y-2 p-3">
              <Row label="Status">
                <StatusBadge status={thread.status} />
              </Row>
              <Row label="Priority">
                <PriorityBadge priority={thread.priority} />
              </Row>
              <Row label="Category">
                <span className="text-foreground">{thread.category ?? "—"}</span>
              </Row>
              <Row label="Created">
                <span className="font-mono text-muted-foreground">
                  {formatIstStamp(thread.created_at)}
                </span>
              </Row>
              <Row label="Last message">
                <span className="text-muted-foreground">
                  {formatRelative(thread.last_message_at)}
                </span>
              </Row>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-border/60 bg-card text-xs">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </div>
            <div className="p-3">
              <ThreadTagEditor threadId={thread.id} initialTags={thread.tags} />
            </div>
          </div>

          {/* Linked user */}
          {linkedUser ? (
            <div className="rounded-lg border border-border/60 bg-card text-xs">
              <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                User
              </div>
              <div className="space-y-2 p-3">
                <div className="font-medium">{linkedUser.full_name}</div>
                <div className="text-muted-foreground">{linkedUser.email}</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {linkedUser.plan && (
                    <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                      {linkedUser.plan}
                    </span>
                  )}
                  {linkedUser.subscription_status && (
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                      linkedUser.subscription_status === "active"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-muted/60 text-muted-foreground",
                    )}>
                      {linkedUser.subscription_status}
                    </span>
                  )}
                </div>
                <Link
                  href={`/admin/users/${thread.user_id}`}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Open user profile <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-card p-3 text-center text-[11px] text-muted-foreground">
              No linked user account
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "open" || status === "new"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : status === "waiting"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", color)}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color =
    priority === "urgent"
      ? "bg-red-500/10 text-red-700 dark:text-red-300"
      : priority === "high"
        ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
        : "bg-muted/60 text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", color)}>
      {priority}
    </span>
  );
}
