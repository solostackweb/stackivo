"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Receipt,
  Files,
  MessageSquare,
  Video,
  UserPlus,
  Trash2,
  Send,
  Loader2,
  Upload,
  ExternalLink,
  Paperclip,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  invitePortalMemberAction,
  postPortalMessageAction,
  deletePortalFileAction,
  revokePortalMemberAction,
  attachContractToPortalAction,
  attachInvoiceToPortalAction,
  archivePortalAction,
  deletePortalAction,
} from "../actions";
import { attachWelcomeToPortalAction } from "@/features/welcome-documents/actions";
import { PORTAL_DASHBOARD_INDEX } from "@/features/portals/routes";
import type {
  PortalActivityRow,
  PortalFileRow,
  PortalMessageRow,
  PortalRole,
} from "@/lib/supabase/types";

interface ViewProps {
  portalId: string;
  portalName: string;
  brandColor: string;
  portalStatus: string;
  role: PortalRole;
  currentUserId: string;
  clientId?: string | null;
  clientEmail?: string | null;
  members: Array<{
    user_id: string;
    role: PortalRole;
    profile: { full_name: string | null; email: string | null } | null;
  }>;
  pendingInvitations: Array<{
    id: string;
    email: string;
    expires_at: string;
  }>;
  files: PortalFileRow[];
  messages: Array<
    PortalMessageRow & {
      author: { full_name: string | null; email: string | null } | null;
    }
  >;
  contracts: Array<{
    id: string;
    title: string;
    status: string;
    public_token: string | null;
  }>;
  availableContracts: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    currency: string;
    status: string;
    public_token: string | null;
  }>;
  availableInvoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    currency: string;
    status: string;
  }>;
  welcomeDocuments: Array<{
    id: string;
    title: string;
    status: string;
    public_token: string | null;
    acknowledgement_required: boolean;
  }>;
  availableWelcomeDocuments: Array<{
    id: string;
    title: string;
    status: string;
    acknowledgement_required: boolean;
  }>;
  activity: PortalActivityRow[];
  storageUsage: { totalBytes: number; fileCount: number };
  storageCap: number;
  /** Whether the R2 backend is configured. Hides upload UI when false. */
  r2Enabled: boolean;
}

/**
 * Single canonical view of a portal. Mounted on both:
 *   /dashboard/portal/<id>   (freelancer / owner — full controls)
 *   /portal/<id>             (client / member — read-mostly)
 *
 * The `role` prop drives which mutating affordances are visible. Server
 * actions ALSO re-check the role, so a tampered DOM can't escalate.
 */
export function PortalView(props: ViewProps) {
  const isOwner = props.role === "owner";

  // Section order is intentionally different for clients vs owners.
  //   - Clients open the portal to DO something (pay/sign/acknowledge).
  //     We surface invoices and contracts first, then files, then the
  //     conversation. Welcome guides slot above invoices because they
  //     set context for everything below.
  //   - Owners use it as an admin/CRM panel. Welcome → Contracts →
  //     Invoices → Files → Conversation reads better top-to-bottom for
  //     creation flow.
  //
  // Sections take their anchor `id` from `#portal-{kind}` so the hero
  // pill links above scroll smoothly into the right place on any phone.
  const mainSections = isOwner ? (
    <>
      <WelcomeDocumentsSection
        documents={props.welcomeDocuments}
        available={props.availableWelcomeDocuments}
        isOwner={isOwner}
        portalId={props.portalId}
      />
      <ContractsSection
        contracts={props.contracts}
        available={props.availableContracts}
        isOwner={isOwner}
        portalId={props.portalId}
      />
      <InvoicesSection
        invoices={props.invoices}
        available={props.availableInvoices}
        isOwner={isOwner}
        portalId={props.portalId}
      />
      <FilesSection
        portalId={props.portalId}
        files={props.files}
        isOwner={isOwner}
        currentUserId={props.currentUserId}
        r2Enabled={props.r2Enabled}
        usage={props.storageUsage}
        cap={props.storageCap}
      />
      <MessagesSection
        portalId={props.portalId}
        messages={props.messages}
      />
    </>
  ) : (
    <>
      <InvoicesSection
        invoices={props.invoices}
        available={props.availableInvoices}
        isOwner={isOwner}
        portalId={props.portalId}
      />
      <ContractsSection
        contracts={props.contracts}
        available={props.availableContracts}
        isOwner={isOwner}
        portalId={props.portalId}
      />
      <WelcomeDocumentsSection
        documents={props.welcomeDocuments}
        available={props.availableWelcomeDocuments}
        isOwner={isOwner}
        portalId={props.portalId}
      />
      <FilesSection
        portalId={props.portalId}
        files={props.files}
        isOwner={isOwner}
        currentUserId={props.currentUserId}
        r2Enabled={props.r2Enabled}
        usage={props.storageUsage}
        cap={props.storageCap}
      />
      <MessagesSection
        portalId={props.portalId}
        messages={props.messages}
      />
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 sm:space-y-6 lg:col-span-2">
        {mainSections}
      </div>
      {/* Right-rail: owner-only admin chrome. Clients don't see settings,
          member management, or the raw activity log — those are admin
          concerns that just add noise to the client view. */}
      {isOwner && (
        <div className="space-y-4 sm:space-y-6">
          <PortalSettingsSection
            portalId={props.portalId}
            status={props.portalStatus}
            portalName={props.portalName}
            isOwner={isOwner}
          />
          <MembersSection
            portalId={props.portalId}
            members={props.members}
            pendingInvitations={props.pendingInvitations}
            isOwner={isOwner}
            clientId={props.clientId ?? null}
            clientEmail={props.clientEmail ?? null}
          />
          <ActivitySection activity={props.activity} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sections
// ============================================================================

function WelcomeDocumentsSection({
  documents,
  available,
  isOwner,
  portalId,
}: {
  documents: ViewProps["welcomeDocuments"];
  available: ViewProps["availableWelcomeDocuments"];
  isOwner: boolean;
  portalId: string;
}) {
  return (
    <Card id="portal-welcome" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Welcome guides
        </CardTitle>
        {isOwner && (
          <AttachExistingDialog
            triggerLabel="Attach existing"
            title="Attach a welcome guide"
            description="Pick a welcome document to share in this portal."
            emptyMessage="No welcome documents available to attach."
            items={available.map((doc) => ({
              id: doc.id,
              label: doc.title,
              meta: `${doc.status.replace(/_/g, " ")}${doc.acknowledgement_required ? " · acknowledgement" : ""}`,
            }))}
            onAttach={async (id) => attachWelcomeToPortalAction({
              portalId,
              documentId: id,
            })}
          />
        )}
        {/* "Owner managed" placeholder removed — it added noise to the
            client view without giving them any way to act. */}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            {isOwner
              ? "Attach a welcome document so the client knows how things will run."
              : "No onboarding guides attached yet."}
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {documents.map((d) => {
              const needsAck =
                d.acknowledgement_required && d.status !== "acknowledged";
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">
                      {d.status.replace(/_/g, " ")}
                      {d.acknowledgement_required
                        ? " · acknowledgement required"
                        : ""}
                    </p>
                  </div>
                  {d.public_token && (
                    <Button
                      asChild
                      size="sm"
                      variant={needsAck ? "default" : "outline"}
                      className="h-9 shrink-0"
                    >
                      <Link href={`/w/${d.public_token}`} target="_blank">
                        {needsAck ? "Read & acknowledge" : "Read guide"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ContractsSection({
  contracts,
  available,
  isOwner,
  portalId,
}: {
  contracts: ViewProps["contracts"];
  available: ViewProps["availableContracts"];
  isOwner: boolean;
  portalId: string;
}) {
  return (
    <Card id="portal-contracts" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Contracts
        </CardTitle>
        {isOwner && (
          <AttachExistingDialog
            triggerLabel="Attach existing"
            title="Attach a contract"
            description="Pick a contract to attach to this portal."
            emptyMessage="No contracts available to attach."
            items={available.map((contract) => ({
              id: contract.id,
              label: contract.title,
              meta: contract.status.replace(/_/g, " "),
            }))}
            onAttach={async (id) => attachContractToPortalAction({
              portalId,
              contractId: id,
            })}
          />
        )}
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No contracts attached yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {contracts.map((c) => {
              const needsSign =
                c.status !== "signed" && c.status !== "declined";
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">
                      {c.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  {c.public_token && (
                    <Button
                      asChild
                      size="sm"
                      variant={needsSign ? "default" : "outline"}
                      className="h-9 shrink-0"
                    >
                      <Link href={`/c/${c.public_token}`} target="_blank">
                        {needsSign ? "Review & sign" : "View"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InvoicesSection({
  invoices,
  available,
  isOwner,
  portalId,
}: {
  invoices: ViewProps["invoices"];
  available: ViewProps["availableInvoices"];
  isOwner: boolean;
  portalId: string;
}) {
  return (
    <Card id="portal-invoices" className="scroll-mt-20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" /> Invoices
        </CardTitle>
        {isOwner && (
          <AttachExistingDialog
            triggerLabel="Attach existing"
            title="Attach an invoice"
            description="Pick an invoice to share in this portal."
            emptyMessage="No invoices available to attach."
            items={available.map((invoice) => ({
              id: invoice.id,
              label: invoice.invoice_number,
              meta: `${invoice.currency} ${invoice.total_amount} · ${invoice.status}`,
            }))}
            onAttach={async (id) => attachInvoiceToPortalAction({
              portalId,
              invoiceId: id,
            })}
          />
        )}
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No invoices attached yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {invoices.map((i) => {
              const paid = i.status === "paid";
              const cancelled = i.status === "cancelled";
              return (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-3 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {i.invoice_number}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPortalCurrency(i.currency, i.total_amount)}
                      </span>{" "}
                      ·{" "}
                      <span
                        className={
                          paid
                            ? "font-medium capitalize text-emerald-600 dark:text-emerald-400"
                            : cancelled
                              ? "capitalize text-muted-foreground line-through"
                              : "capitalize"
                        }
                      >
                        {i.status.replace(/_/g, " ")}
                      </span>
                    </p>
                  </div>
                  {i.public_token && (
                    <Button
                      asChild
                      size="sm"
                      variant={paid || cancelled ? "outline" : "default"}
                      className="h-9 shrink-0"
                    >
                      <Link href={`/i/${i.public_token}`} target="_blank">
                        {paid ? "View receipt" : cancelled ? "View" : "Pay invoice"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatPortalCurrency(currency: string, amount: number): string {
  if (!Number.isFinite(amount)) return `${currency} 0`;
  // Use locale formatting so big values read naturally on a phone.
  return `${currency} ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function FilesSection({
  portalId,
  files,
  isOwner,
  currentUserId,
  r2Enabled,
  usage,
  cap,
}: {
  portalId: string;
  files: PortalFileRow[];
  isOwner: boolean;
  currentUserId: string;
  r2Enabled: boolean;
  usage: { totalBytes: number; fileCount: number };
  cap: number;
}) {
  const router = useRouter();
  const usagePct = Number.isFinite(cap) ? Math.min(100, (usage.totalBytes / cap) * 100) : 0;

  async function onDelete(fileId: string) {
    if (!confirm("Delete this file?")) return;
    await deletePortalFileAction({ portalId, fileId });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Files className="h-4 w-4" /> Files
          <span className="ml-2 text-[11px] font-normal text-muted-foreground">
            {formatBytes(usage.totalBytes)}
            {Number.isFinite(cap) ? ` / ${formatBytes(cap)}` : ""}
          </span>
        </CardTitle>
        {r2Enabled && (
          <FileUploadButton portalId={portalId} />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {Number.isFinite(cap) && (
          <div className="h-1 w-full overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
        {!r2Enabled && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300">
            File storage isn&apos;t configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET in your env to enable uploads.
          </p>
        )}
        {files.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No files yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <a
                  href={`/api/portals/${portalId}/files/${f.id}/download`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {formatBytes(f.size_bytes)}
                  </span>
                </a>
                {(isOwner || f.uploaded_by === currentUserId) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => onDelete(f.id)}
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FileUploadButton({ portalId }: { portalId: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onFiles(filelist: FileList | null) {
    if (!filelist || filelist.length === 0) return;
    setPending(true);
    setError(null);
    try {
      for (const file of Array.from(filelist)) {
        // Step 1: presign
        const presignRes = await fetch(
          `/api/portals/${portalId}/files/presign`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: file.size,
            }),
          },
        );
        const presign = (await presignRes.json()) as
          | { ok: true; fileId: string; key: string; putUrl: string }
          | { ok: false; error: string };
        if (!presign.ok) throw new Error(presign.error);

        // Step 2: PUT direct to R2
        const putRes = await fetch(presign.putUrl, {
          method: "PUT",
          body: file,
          headers: {
            "content-type": file.type || "application/octet-stream",
          },
        });
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

        // Step 3: commit
        const commitRes = await fetch(
          `/api/portals/${portalId}/files/commit`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              fileId: presign.fileId,
              key: presign.key,
              filename: file.name,
              mimeType: file.type || "application/octet-stream",
            }),
          },
        );
        const commit = (await commitRes.json()) as
          | { ok: true }
          | { ok: false; error: string };
        if (!commit.ok) throw new Error(commit.error);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Uploading
          </>
        ) : (
          <>
            <Upload /> Upload
          </>
        )}
      </Button>
      {error && (
        <span className="text-[11px] text-destructive">{error}</span>
      )}
    </div>
  );
}

function MessagesSection({
  portalId,
  messages,
}: {
  portalId: string;
  messages: ViewProps["messages"];
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [meetingOpen, setMeetingOpen] = React.useState(false);
  const [meetingTopic, setMeetingTopic] = React.useState("");
  const [meetingTime, setMeetingTime] = React.useState("");
  const [meetingLink, setMeetingLink] = React.useState("https://meet.google.com/new");
  const [meetingNotes, setMeetingNotes] = React.useState("");
  const [meetingPending, setMeetingPending] = React.useState(false);
  const [meetingError, setMeetingError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || body.trim().length === 0) return;
    setPending(true);
    setError(null);
    const res = await postPortalMessageAction({
      portalId,
      body: body.trim(),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  async function onMeetingRequest(e: React.FormEvent) {
    e.preventDefault();
    if (meetingPending) return;
    setMeetingPending(true);
    setMeetingError(null);

    const lines = ["Meeting request"];
    const topic = meetingTopic.trim();
    const time = meetingTime.trim();
    const link = meetingLink.trim();
    const notes = meetingNotes.trim();

    if (topic) lines.push(`Topic: ${topic}`);
    if (time) lines.push(`Proposed time: ${time}`);
    if (link) lines.push(`Meet link: ${link}`);
    if (notes) lines.push(`Notes: ${notes}`);

    const res = await postPortalMessageAction({
      portalId,
      body: lines.join("\n"),
    });

    setMeetingPending(false);
    if (!res.ok) {
      setMeetingError(res.error);
      return;
    }

    setMeetingTopic("");
    setMeetingTime("");
    setMeetingLink("https://meet.google.com/new");
    setMeetingNotes("");
    setMeetingOpen(false);
    router.refresh();
  }

  // Reverse chronological from server → render oldest-first for natural reading.
  const ordered = [...messages].reverse();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" /> Chat
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMeetingError(null);
            setMeetingOpen(true);
          }}
        >
          <Video className="h-3.5 w-3.5" /> Request meeting
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/10 p-3">
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="portal-message" className="text-xs">
                Send a message
              </Label>
              <Textarea
                id="portal-message"
                placeholder="Write a message, ask a question, or share an update..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={8000}
                rows={3}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Keep files in the Files section so they stay organized.
              </p>
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={pending || body.trim().length === 0}
              >
                {pending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Send /> Send message
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
        <Dialog
          open={meetingOpen}
          onOpenChange={(next) => {
            setMeetingOpen(next);
            if (!next) setMeetingError(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a meeting</DialogTitle>
              <DialogDescription>
                Propose a time and drop a Google Meet link if you have one.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onMeetingRequest} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="meeting-topic" className="text-xs">
                  Topic
                </Label>
                <Input
                  id="meeting-topic"
                  placeholder="Project update"
                  value={meetingTopic}
                  onChange={(e) => setMeetingTopic(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meeting-time" className="text-xs">
                  Proposed time
                </Label>
                <Input
                  id="meeting-time"
                  placeholder="Tomorrow, 3pm IST"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meeting-link" className="text-xs">
                  Google Meet link
                </Label>
                <Input
                  id="meeting-link"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
                <Button asChild size="sm" variant="ghost" className="px-0">
                  <a href="https://meet.google.com/new" target="_blank" rel="noreferrer">
                    Create a Google Meet link
                  </a>
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor="meeting-notes" className="text-xs">
                  Notes (optional)
                </Label>
                <Textarea
                  id="meeting-notes"
                  placeholder="What should we cover?"
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  rows={3}
                />
              </div>
              {meetingError && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {meetingError}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMeetingOpen(false)}
                  disabled={meetingPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={meetingPending}>
                  {meetingPending ? <Loader2 className="animate-spin" /> : "Send request"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {ordered.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No messages yet. Use the form above to start.
          </p>
        ) : (
          <ul className="space-y-3">
            {ordered.map((m) => (
              <li key={m.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {m.author?.full_name ?? m.author?.email ?? "Someone"}
                  </span>
                  <span>·</span>
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {m.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PortalSettingsSection({
  portalId,
  status,
  portalName,
  isOwner,
}: {
  portalId: string;
  status: string;
  portalName: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const archived = status === "archived";

  // Two separate error slots so the destructive-dialog error never bleeds
  // back to the card behind it (the prior implementation re-used `error`
  // and the failure message appeared underneath the open dialog instead
  // of inside it).
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  async function onArchive() {
    if (pending || archived) return;
    setPending(true);
    setError(null);
    const res = await archivePortalAction({ portalId });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not deactivate portal.");
      return;
    }
    router.refresh();
  }

  async function onDelete() {
    if (pending) return;
    if (confirmName.trim() !== portalName) {
      setDialogError("Portal name does not match.");
      return;
    }
    setPending(true);
    setDialogError(null);
    const res = await deletePortalAction({ portalId });
    setPending(false);
    if (!res.ok) {
      setDialogError(res.error ?? "Could not delete portal.");
      return;
    }
    setConfirmName("");
    setDeleteOpen(false);
    router.push(PORTAL_DASHBOARD_INDEX);
    router.refresh();
  }

  if (!isOwner) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Portal settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Deactivate to pause client access. Delete to permanently remove the
          portal and all attachments.
        </p>
        <p className="text-[11px] text-muted-foreground">
          You&apos;ll be asked to type the portal name to confirm deletion.
        </p>
        {error && (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            disabled={pending || archived}
          >
            {archived ? "Portal deactivated" : "Deactivate portal"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
            disabled={pending}
          >
            Delete portal
          </Button>
        </div>
        <Dialog
          open={deleteOpen}
          onOpenChange={(next) => {
            setDeleteOpen(next);
            // Clear any previous failure when the user reopens / closes.
            if (!next) setDialogError(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this portal?</DialogTitle>
              <DialogDescription>
                This permanently removes the portal and its attachments. Type
                the portal name to confirm.
                <span className="mt-2 block text-xs text-muted-foreground">
                  Type <strong>{portalName}</strong> to confirm.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="portal-delete-name">Portal name</Label>
              <Input
                id="portal-delete-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={portalName}
              />
              {dialogError && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {dialogError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setConfirmName("");
                  setDeleteOpen(false);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={pending || confirmName.trim().length === 0}
              >
                {pending ? <Loader2 className="animate-spin" /> : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AttachExistingDialog({
  triggerLabel,
  title,
  description,
  emptyMessage,
  items,
  onAttach,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  emptyMessage: string;
  items: Array<{ id: string; label: string; meta?: string }>;
  onAttach: (id: string) => Promise<{ ok: boolean; error?: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAttach() {
    if (!selectedId || pending) return;
    setPending(true);
    setError(null);
    const res = await onAttach(selectedId);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not attach. Please try again.");
      return;
    }
    setSelectedId("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {items.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="attach-select">Select item</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger id="attach-select">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}{item.meta ? ` · ${item.meta}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && (
                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAttach}
              disabled={pending || !selectedId || items.length === 0}
            >
              {pending ? <Loader2 className="animate-spin" /> : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MembersSection({
  portalId,
  members,
  pendingInvitations,
  isOwner,
  clientId,
  clientEmail,
}: {
  portalId: string;
  members: ViewProps["members"];
  pendingInvitations: ViewProps["pendingInvitations"];
  isOwner: boolean;
  clientId: string | null;
  clientEmail: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasClient = members.length > 0;
  const hasPending = pendingInvitations.length > 0;
  const missingClientEmail = !clientEmail;
  const inviteDisabled = hasClient || hasPending || missingClientEmail;

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await invitePortalMemberAction({
      portalId,
      email: email.trim(),
      name: name.trim() || undefined,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEmail("");
    setName("");
    setOpen(false);
    router.refresh();
  }

  async function onRevoke(userId: string) {
    if (!confirm("Revoke this member's access?")) return;
    await revokePortalMemberAction({ portalId, userId });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Client access</CardTitle>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen((o) => !o)}
            disabled={inviteDisabled}
          >
            <UserPlus /> Invite
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isOwner && missingClientEmail && (
          <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Add an email to the client profile before inviting.
            </p>
            {clientId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/clients/${clientId}`}>
                  Add client email
                </Link>
              </Button>
            )}
          </div>
        )}
        {isOwner && (hasClient || hasPending) && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300">
            This portal supports one client at a time. Revoke access or wait
            for the pending invite before inviting another.
          </p>
        )}
        {open && isOwner && !inviteDisabled && (
          <form onSubmit={onInvite} className="space-y-2 rounded-md border p-3">
            <p className="text-[11px] text-muted-foreground">
              Only the client linked to this portal can be invited. Use the
              client email on file.
            </p>
            <div className="space-y-1">
              <Label htmlFor="invite-email" className="text-xs">
                Client email
              </Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-name" className="text-xs">
                Name (optional)
              </Label>
              <Input
                id="invite-name"
                placeholder="Sam"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : "Send invite"}
            </Button>
          </form>
        )}
        {members.length > 1 && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive">
            Multiple clients are attached to this portal. This portal should
            only have one client.
          </p>
        )}
        {members.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No client connected yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {members.map((member) => {
              const displayName = getMemberDisplayName(member.profile);
              const email = getMemberEmail(member.profile);
              const isOwnerMember = member.role === "owner";
              return (
                <li
                  key={member.user_id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {email ?? "No email on file"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isOwnerMember ? "default" : "secondary"}>
                      {isOwnerMember ? "Owner" : "Client"}
                    </Badge>
                    {isOwner && !isOwnerMember && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRevoke(member.user_id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {isOwner && pendingInvitations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Pending invitation
            </p>
            <ul className="divide-y rounded-md border">
              {pendingInvitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Expires {formatDate(inv.expires_at)}
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivitySection({
  activity,
}: {
  activity: ViewProps["activity"];
}) {
  const ordered = [...activity].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No activity yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {ordered.map((item) => {
              const title = formatActivityTitle(item);
              const description = formatActivityDescription(item);
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <span className="mt-0.5">
                    {getActivityIcon(item)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{title}</p>
                    {description && (
                      <p className="text-[11px] text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDate(item.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function getMemberDisplayName(
  profile: ViewProps["members"][number]["profile"],
): string {
  return profile?.full_name ?? profile?.email ?? "Unknown member";
}

function getMemberEmail(
  profile: ViewProps["members"][number]["profile"],
): string | null {
  if (!profile) return null;
  if (profile.full_name && profile.email) return profile.email;
  return profile.email ?? null;
}

function formatBytes(bytes: number): string {
  if (bytes === Infinity) return "Infinity";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatActivityTitle(item: PortalActivityRow): string {
  switch (item.type) {
    case "portal.created":
      return "Portal created";
    case "portal.renamed":
      return "Portal renamed";
    case "portal.member_invited":
      return "Member invited";
    case "portal.member_joined":
      return "Member joined";
    case "portal.member_revoked":
      return "Member revoked";
    case "contract.attached":
      return "Contract attached";
    case "invoice.attached":
      return "Invoice attached";
    case "message.posted":
      return "Message sent";
    case "file.deleted":
      return "File deleted";
    default:
      return item.type.replace(/_/g, " ");
  }
}

function formatActivityDescription(item: PortalActivityRow): string | null {
  const payload = parsePayload(item.payload);
  if (item.type === "portal.renamed" && typeof payload.name === "string") {
    return `Renamed to ${payload.name}`;
  }
  if (item.type === "portal.member_invited" && typeof payload.email === "string") {
    return payload.email;
  }
  if (item.type === "portal.member_joined" && typeof payload.email === "string") {
    return payload.email;
  }
  if (item.type === "contract.attached" && typeof payload.title === "string") {
    return payload.title;
  }
  if (item.type === "invoice.attached" && typeof payload.number === "string") {
    return `Invoice ${payload.number}`;
  }
  if (item.type === "message.posted" && typeof payload.preview === "string") {
    return `\"${payload.preview}\"`;
  }
  if (item.type === "file.deleted" && typeof payload.name === "string") {
    return payload.name;
  }
  if (typeof payload.name === "string") return payload.name;
  if (typeof payload.title === "string") return payload.title;
  if (typeof payload.email === "string") return payload.email;
  return null;
}

function getActivityIcon(item: PortalActivityRow) {
  const className = "h-3.5 w-3.5 text-muted-foreground";
  if (item.type.startsWith("contract.")) return <FileText className={className} />;
  if (item.type.startsWith("invoice.")) return <Receipt className={className} />;
  if (item.type.startsWith("message.")) return <MessageSquare className={className} />;
  if (item.type.startsWith("file.")) return <Paperclip className={className} />;
  if (item.type.startsWith("portal.member")) return <UserPlus className={className} />;
  if (item.type.startsWith("portal.")) return <ShieldCheck className={className} />;
  return <Sparkles className={className} />;
}

function parsePayload(payload: PortalActivityRow["payload"]): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  return payload as Record<string, unknown>;
}