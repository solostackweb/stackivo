"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Video, Plus, Loader2, CheckCircle2, XCircle,
  Clock, CalendarDays, Link2, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  requestPortalMeetingAction,
  acceptPortalMeetingAction,
  declinePortalMeetingAction,
  completePortalMeetingAction,
  cancelPortalMeetingAction,
} from "../actions-meetings";
import type { PortalMeetingRow, PortalMeetingStatus } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MeetingWithData = PortalMeetingRow & {
  requester: { full_name: string | null; email: string | null } | null;
};

interface MeetingsSectionProps {
  portalId: string;
  meetings: MeetingWithData[];
  isOwner: boolean;
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<PortalMeetingStatus, string> = {
  pending:   "Pending",
  accepted:  "Confirmed",
  declined:  "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<PortalMeetingStatus, string> = {
  pending:   "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  accepted:  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  declined:  "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  completed: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: PortalMeetingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Relative timestamp
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)   return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7)   return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Single meeting card
// ---------------------------------------------------------------------------

function MeetingCard({
  meeting,
  isOwner,
  currentUserId,
  portalId,
}: {
  meeting: MeetingWithData;
  isOwner: boolean;
  currentUserId: string;
  portalId: string;
}) {
  const router = useRouter();
  const [acceptOpen, setAcceptOpen] = React.useState(false);
  const [meetLink, setMeetLink] = React.useState(meeting.meet_link ?? "");
  const [proposedTime, setProposedTime] = React.useState(meeting.proposed_time ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isRequester = meeting.requested_by === currentUserId;
  const isActive = meeting.status === "pending" || meeting.status === "accepted";
  const requesterName =
    meeting.requester?.full_name ?? meeting.requester?.email ?? "Someone";

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await acceptPortalMeetingAction({
      portalId,
      meetingId: meeting.id,
      meetLink: meetLink.trim() || undefined,
      proposedTime: proposedTime.trim() || undefined,
    });
    setPending(false);
    if (!res.ok) { setError(res.error ?? "Could not accept."); return; }
    setAcceptOpen(false);
    router.refresh();
  }

  async function handleDecline() {
    setPending(true);
    const res = await declinePortalMeetingAction({ portalId, meetingId: meeting.id });
    setPending(false);
    if (!res.ok) { setError(res.error ?? "Could not decline."); return; }
    router.refresh();
  }

  async function handleComplete() {
    setPending(true);
    const res = await completePortalMeetingAction({ portalId, meetingId: meeting.id });
    setPending(false);
    if (!res.ok) { setError(res.error ?? "Could not complete."); return; }
    router.refresh();
  }

  async function handleCancel() {
    setPending(true);
    const res = await cancelPortalMeetingAction({ portalId, meetingId: meeting.id });
    setPending(false);
    if (!res.ok) { setError(res.error ?? "Could not cancel."); return; }
    router.refresh();
  }

  const isDimmed = meeting.status === "declined" || meeting.status === "cancelled";

  return (
    <li className={`rounded-lg border p-3 sm:p-4 transition-opacity ${isDimmed ? "opacity-60" : ""}`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={meeting.status as PortalMeetingStatus} />
            <p className="text-sm font-semibold leading-snug">{meeting.topic}</p>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Requested by{" "}
            <span className="font-medium text-foreground">{requesterName}</span>
            {" · "}
            {relativeTime(meeting.created_at)}
          </p>
        </div>

        {/* Join button — shown when accepted and a meet link exists */}
        {meeting.status === "accepted" && meeting.meet_link && (
          <Button asChild size="sm" className="h-8 shrink-0 gap-1.5">
            <a href={meeting.meet_link} target="_blank" rel="noreferrer">
              <Video className="h-3.5 w-3.5" />
              Join meeting
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>

      {/* Details */}
      {(meeting.proposed_time || meeting.meet_link || meeting.notes) && (
        <div className="mt-2 space-y-1">
          {meeting.proposed_time && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>{meeting.proposed_time}</span>
            </div>
          )}
          {meeting.meet_link && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              <a
                href={meeting.meet_link}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:underline"
              >
                {meeting.meet_link}
              </a>
            </div>
          )}
          {meeting.notes && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {meeting.notes}
            </p>
          )}
        </div>
      )}

      {/* Error feedback */}
      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Action row */}
      {isActive && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Owner: accept / decline */}
          {isOwner && meeting.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-8"
                onClick={() => { setError(null); setAcceptOpen(true); }}
                disabled={pending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-destructive hover:text-destructive"
                onClick={handleDecline}
                disabled={pending}
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Decline
              </Button>
            </>
          )}

          {/* Owner: mark complete when accepted */}
          {isOwner && meeting.status === "accepted" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={handleComplete}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Mark completed
            </Button>
          )}

          {/* Requester or owner: cancel */}
          {(isRequester || isOwner) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground"
              onClick={handleCancel}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Accept dialog */}
      <Dialog open={acceptOpen} onOpenChange={(next) => { setAcceptOpen(next); if (!next) setError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm meeting</DialogTitle>
            <DialogDescription>
              Optionally update the time and add a Google Meet link before confirming.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAccept} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="accept-time" className="text-xs">Confirmed time</Label>
              <Input
                id="accept-time"
                placeholder="e.g. Friday 3pm IST"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="accept-link" className="text-xs">Google Meet link</Label>
              <Input
                id="accept-link"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
              />
              <a
                href="https://meet.google.com/new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Create a new Google Meet
              </a>
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAcceptOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : "Confirm meeting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Request meeting dialog
// ---------------------------------------------------------------------------

function RequestMeetingDialog({
  portalId,
}: {
  portalId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [time, setTime] = React.useState("");
  const [link, setLink] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setTopic(""); setTime(""); setLink(""); setNotes(""); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setPending(true);
    setError(null);
    const res = await requestPortalMeetingAction({
      portalId,
      topic: topic.trim(),
      proposedTime: time.trim() || undefined,
      meetLink: link.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setPending(false);
    if (!res.ok) { setError(res.error ?? "Could not request meeting."); return; }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <Plus className="h-3.5 w-3.5" />
        Request meeting
      </Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a meeting</DialogTitle>
            <DialogDescription>
              Propose a topic and time. The other party will confirm or suggest a new time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="req-topic" className="text-xs">
                Topic <span className="text-destructive">*</span>
              </Label>
              <Input
                id="req-topic"
                placeholder="Project review, deliverable feedback…"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="req-time" className="text-xs">Proposed time (optional)</Label>
              <Input
                id="req-time"
                placeholder="e.g. Monday 2pm IST or March 10th 4pm"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="req-link" className="text-xs">Google Meet link (optional)</Label>
              <Input
                id="req-link"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                maxLength={500}
              />
              <a
                href="https://meet.google.com/new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Create a new Google Meet
              </a>
            </div>
            <div className="space-y-1">
              <Label htmlFor="req-notes" className="text-xs">Notes (optional)</Label>
              <Textarea
                id="req-notes"
                placeholder="What should we cover? Any agenda items?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={4000}
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !topic.trim()}>
                {pending ? <Loader2 className="animate-spin" /> : "Send request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main section export
// ---------------------------------------------------------------------------

export function MeetingsSection({
  portalId,
  meetings,
  isOwner,
  currentUserId,
}: MeetingsSectionProps) {
  const [showHistory, setShowHistory] = React.useState(false);

  // Split into active (pending / accepted) and history (declined / completed / cancelled)
  const active = meetings.filter(
    (m) => m.status === "pending" || m.status === "accepted",
  );
  const history = meetings.filter(
    (m) => m.status === "declined" || m.status === "completed" || m.status === "cancelled",
  );

  return (
    <Card id="portal-meetings" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-4 w-4" /> Meetings
          {active.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {active.length}
            </span>
          )}
        </CardTitle>
        <RequestMeetingDialog portalId={portalId} />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active meetings */}
        {active.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No upcoming meetings.{" "}
            {isOwner
              ? "Request one or wait for your client to propose a time."
              : "Request a meeting to get started."}
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                isOwner={isOwner}
                currentUserId={currentUserId}
                portalId={portalId}
              />
            ))}
          </ul>
        )}

        {/* History toggle */}
        {history.length > 0 && (
          <div>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {showHistory ? "Hide" : "Show"} history ({history.length})
            </button>
            {showHistory && (
              <ul className="mt-2 space-y-2">
                {history.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    isOwner={isOwner}
                    currentUserId={currentUserId}
                    portalId={portalId}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
