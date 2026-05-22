"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, Trash2, CheckCircle2, MessageSquare,
  XCircle, ThumbsUp, RotateCcw, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  createPortalUpdateAction,
  deletePortalUpdateAction,
  reactToPortalUpdateAction,
} from "../actions-updates";
import type {
  PortalUpdateRow,
  PortalUpdateReactionRow,
  PortalUpdateType,
  PortalUpdateApprovalStatus,
} from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UpdateWithData = PortalUpdateRow & {
  author: { full_name: string | null; email: string | null } | null;
  reactions: Array<
    PortalUpdateReactionRow & {
      profile: { full_name: string | null; email: string | null } | null;
    }
  >;
};

interface UpdatesSectionProps {
  portalId: string;
  updates: UpdateWithData[];
  isOwner: boolean;
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const UPDATE_TYPE_LABELS: Record<PortalUpdateType, string> = {
  progress:    "Progress",
  deliverable: "Deliverable",
  revision:    "Revision",
  payment:     "Payment",
  milestone:   "Milestone",
  meeting:     "Meeting",
  general:     "Update",
};

const UPDATE_TYPE_COLORS: Record<PortalUpdateType, string> = {
  progress:    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  deliverable: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  revision:    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  payment:     "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  milestone:   "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  meeting:     "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  general:     "bg-muted text-muted-foreground border-border",
};

const APPROVAL_LABELS: Record<PortalUpdateApprovalStatus, string> = {
  none:                "",
  submitted:           "Pending review",
  under_review:        "Under review",
  approved:            "Approved",
  revision_requested:  "Revision requested",
};

const APPROVAL_COLORS: Record<PortalUpdateApprovalStatus, string> = {
  none:               "",
  submitted:          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  under_review:       "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  approved:           "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  revision_requested: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
};

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export function UpdatesSection({
  portalId, updates, isOwner, currentUserId,
}: UpdatesSectionProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  // Show 5 most recent, collapse the rest
  const visible = showAll ? updates : updates.slice(0, 5);
  const hasMore = updates.length > 5;

  return (
    <Card id="portal-updates" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {updates.length > 0 ? updates.length : "·"}
          </span>
          Updates
        </CardTitle>
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Post update
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {updates.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            {isOwner
              ? "Post updates to keep your client informed — progress, deliverables, milestones."
              : "No updates yet. Check back soon."}
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((update) => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  portalId={portalId}
                  isOwner={isOwner}
                  currentUserId={currentUserId}
                />
              ))}
            </ul>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? (
                  <><ChevronUp className="h-3 w-3" /> Show less</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> Show {updates.length - 5} older updates</>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>

      <CreateUpdateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        portalId={portalId}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Single update card
// ---------------------------------------------------------------------------

function UpdateCard({
  update, portalId, isOwner, currentUserId,
}: {
  update: UpdateWithData;
  portalId: string;
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [commentBody, setCommentBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasAcknowledged = update.reactions.some(
    (r) => r.user_id === currentUserId && r.kind === "acknowledged",
  );
  const hasApproved = update.reactions.some(
    (r) => r.user_id === currentUserId && r.kind === "approved",
  );
  const hasRevisionRequested = update.reactions.some(
    (r) => r.user_id === currentUserId && r.kind === "revision_requested",
  );
  const comments = update.reactions.filter((r) => r.kind === "comment");

  const isDeliverable = update.update_type === "deliverable";
  const showApprovalActions = !isOwner && isDeliverable &&
    update.approval_status !== "approved";

  async function react(kind: "acknowledged" | "approved" | "revision_requested") {
    setPending(true);
    setError(null);
    const res = await reactToPortalUpdateAction({
      portalId, updateId: update.id, kind,
    });
    setPending(false);
    if (!res.ok) { setError(res.error); return; }
    router.refresh();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || pending) return;
    setPending(true);
    setError(null);
    const res = await reactToPortalUpdateAction({
      portalId, updateId: update.id, kind: "comment", body: commentBody.trim(),
    });
    setPending(false);
    if (!res.ok) { setError(res.error); return; }
    setCommentBody("");
    setCommentOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete this update?",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await deletePortalUpdateAction({ portalId, updateId: update.id });
    router.refresh();
  }

  return (
    <li className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${UPDATE_TYPE_COLORS[update.update_type]}`}>
            {UPDATE_TYPE_LABELS[update.update_type]}
          </span>
          {update.approval_status !== "none" && (
            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${APPROVAL_COLORS[update.approval_status]}`}>
              {APPROVAL_LABELS[update.approval_status]}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {formatRelativeDate(update.created_at)}
          </span>
          {isOwner && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete update"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-snug">{update.title}</p>
        {update.body && (
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {update.body}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          by {update.author?.full_name ?? update.author?.email ?? "Freelancer"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <ul className="space-y-1.5 border-t pt-2">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2 text-xs">
              <span className="font-medium shrink-0">
                {c.profile?.full_name ?? c.profile?.email ?? "User"}:
              </span>
              <span className="text-muted-foreground leading-relaxed">{c.body}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Acknowledge (client only, not yet acknowledged) */}
        {!isOwner && !hasAcknowledged && update.approval_status !== "approved" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={pending}
            onClick={() => react("acknowledged")}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Acknowledge
          </Button>
        )}
        {!isOwner && hasAcknowledged && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Acknowledged
          </span>
        )}

        {/* Approve / Revision (deliverable-type, client only) */}
        {showApprovalActions && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              disabled={pending || hasApproved}
              onClick={() => react("approved")}
            >
              <ThumbsUp className="h-3 w-3" />
              {hasApproved ? "Approved" : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              disabled={pending || hasRevisionRequested}
              onClick={() => react("revision_requested")}
            >
              <RotateCcw className="h-3 w-3" />
              {hasRevisionRequested ? "Revision requested" : "Request revision"}
            </Button>
          </>
        )}
        {!isOwner && hasApproved && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <ThumbsUp className="h-3 w-3" /> Approved
          </span>
        )}

        {/* Comment */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={() => setCommentOpen((v) => !v)}
        >
          <MessageSquare className="h-3 w-3" />
          {commentOpen ? "Cancel" : `Comment${comments.length > 0 ? ` (${comments.length})` : ""}`}
        </Button>
      </div>

      {/* Inline comment box */}
      {commentOpen && (
        <form onSubmit={submitComment} className="space-y-2 border-t pt-2">
          <Textarea
            placeholder="Add a comment or clarification..."
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={2}
            maxLength={4000}
            required
            className="text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setCommentOpen(false); setCommentBody(""); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs"
              disabled={pending || !commentBody.trim()}
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send"}
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Create update dialog
// ---------------------------------------------------------------------------

function CreateUpdateDialog({
  open, onOpenChange, portalId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  portalId: string;
}) {
  const router = useRouter();
  const [type, setType] = React.useState<PortalUpdateType>("progress");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setType("progress");
    setTitle("");
    setBody("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !title.trim()) return;
    setPending(true);
    setError(null);

    const res = await createPortalUpdateAction({
      portalId,
      updateType: type,
      title: title.trim(),
      body: body.trim() || undefined,
    });

    setPending(false);
    if (!res.ok) { setError(res.error); return; }
    reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post an update</DialogTitle>
          <DialogDescription>
            Keep your client informed with structured updates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PortalUpdateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progress">Progress update</SelectItem>
                <SelectItem value="deliverable">Deliverable shared</SelectItem>
                <SelectItem value="revision">Revision update</SelectItem>
                <SelectItem value="milestone">Milestone reached</SelectItem>
                <SelectItem value="payment">Payment update</SelectItem>
                <SelectItem value="meeting">Meeting summary</SelectItem>
                <SelectItem value="general">General update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="update-title" className="text-xs">Title</Label>
            <Input
              id="update-title"
              placeholder="e.g. Homepage design completed"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="update-body" className="text-xs">Details (optional)</Label>
            <Textarea
              id="update-body"
              placeholder="Add context, links, or notes for your client..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={8000}
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
