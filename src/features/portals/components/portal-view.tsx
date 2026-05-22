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
  File,
  FileImage,
  FileArchive,
  FileCode,
  Music,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
import { UpdatesSection } from "./updates-section";
import { MeetingsSection } from "./meetings-section";
import type {
  PortalActivityRow,
  PortalFileRow,
  PortalMessageRow,
  PortalRole,
  PortalUpdateRow,
  PortalUpdateReactionRow,
  PortalMeetingRow,
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
  r2Enabled: boolean;
  updates: Array<
    PortalUpdateRow & {
      author: { full_name: string | null; email: string | null } | null;
      reactions: Array<
        PortalUpdateReactionRow & {
          profile: { full_name: string | null; email: string | null } | null;
        }
      >;
    }
  >;
  meetings: Array<
    PortalMeetingRow & {
      requester: { full_name: string | null; email: string | null } | null;
    }
  >;
}

/**
 * Single canonical portal view — rendered on both the freelancer dashboard
 * (/dashboard/portal/<id>) and the client workspace (/portal/<id>).
 * `role` drives which controls are visible; server actions also re-check.
 */
export function PortalView(props: ViewProps) {
  const isOwner = props.role === "owner";

  // Owner: Updates → Meetings → Contracts → Invoices → Welcome → Files → Chat
  // Client: Updates → Meetings → Invoices → Contracts → Welcome → Files → Chat
  const mainSections = isOwner ? (
    <>
      <UpdatesSection
        portalId={props.portalId}
        updates={props.updates}
        isOwner={isOwner}
        currentUserId={props.currentUserId}
      />
      <MeetingsSection
        portalId={props.portalId}
        meetings={props.meetings}
        isOwner={isOwner}
        currentUserId={props.currentUserId}
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
  ) : (
    <>
      <UpdatesSection
        portalId={props.portalId}
        updates={props.updates}
        isOwner={isOwner}
        currentUserId={props.currentUserId}
      />
      <MeetingsSection
        portalId={props.portalId}
        meetings={props.meetings}
        isOwner={isOwner}
        currentUserId={props.currentUserId}
      />
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
    // pb-20 reserves space for the mobile bottom nav bar (hidden on sm+)
    <div className="relative pb-20 sm:pb-0">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {mainSections}
        </div>

        {/* Right rail — owner-only admin chrome */}
        {isOwner && (
          <div className="space-y-4">
            {/* Members first — most actionable for the freelancer */}
            <MembersSection
              portalId={props.portalId}
              members={props.members}
              pendingInvitations={props.pendingInvitations}
              isOwner={isOwner}
              clientId={props.clientId ?? null}
              clientEmail={props.clientEmail ?? null}
            />
            <ActivitySection activity={props.activity} />
            {/* Settings last — destructive actions should be out of the way */}
            <PortalSettingsSection
              portalId={props.portalId}
              status={props.portalStatus}
              portalName={props.portalName}
              isOwner={isOwner}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom nav — anchor-scroll to key sections */}
      <MobileNavBar />
    </div>
  );
}

// ============================================================================
// Mobile bottom navigation
// ============================================================================

function MobileNavBar() {
  const items = [
    { href: "#portal-updates",  icon: MessageSquare, label: "Updates" },
    { href: "#portal-meetings", icon: Video,         label: "Meetings" },
    { href: "#portal-files",    icon: Files,         label: "Files"    },
    { href: "#portal-chat",     icon: Send,          label: "Chat"     },
  ] as const;

  return (
    <nav
      aria-label="Portal sections"
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden"
    >
      <div className="flex items-stretch justify-around">
        {items.map(({ href, icon: Icon, label }) => (
          <a
            key={href}
            href={href}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

// ============================================================================
// Section: Welcome guides
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
    <Card id="portal-welcome" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Welcome guides
        </CardTitle>
        {isOwner && (
          <AttachExistingDialog
            triggerLabel="Attach"
            title="Attach a welcome guide"
            description="Pick a welcome document to share in this portal."
            emptyMessage="No welcome documents available to attach."
            items={available.map((doc) => ({
              id: doc.id,
              label: doc.title,
              meta: `${doc.status.replace(/_/g, " ")}${doc.acknowledgement_required ? " · ack" : ""}`,
            }))}
            onAttach={async (id) => attachWelcomeToPortalAction({ portalId, documentId: id })}
          />
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-7 w-7 text-muted-foreground/30" />}
            message={isOwner ? "Attach a welcome guide to onboard your client." : "No onboarding guides attached yet."}
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {documents.map((d) => {
              const needsAck = d.acknowledgement_required && d.status !== "acknowledged";
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                      {d.status.replace(/_/g, " ")}
                      {d.acknowledgement_required ? " · acknowledgement required" : ""}
                    </p>
                  </div>
                  {d.public_token && (
                    <Button
                      asChild
                      size="sm"
                      variant={needsAck ? "default" : "outline"}
                      className="h-8 shrink-0"
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

// ============================================================================
// Section: Contracts
// ============================================================================

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
  const pendingCount = contracts.filter(
    (c) => c.status !== "signed" && c.status !== "declined",
  ).length;

  return (
    <Card id="portal-contracts" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Contracts
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              {pendingCount} to sign
            </span>
          )}
        </CardTitle>
        {isOwner && (
          <AttachExistingDialog
            triggerLabel="Attach"
            title="Attach a contract"
            description="Pick a contract to attach to this portal."
            emptyMessage="No contracts available to attach."
            items={available.map((c) => ({
              id: c.id,
              label: c.title,
              meta: c.status.replace(/_/g, " "),
            }))}
            onAttach={async (id) => attachContractToPortalAction({ portalId, contractId: id })}
          />
        )}
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-7 w-7 text-muted-foreground/30" />}
            message="No contracts attached yet."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {contracts.map((c) => {
              const needsSign = c.status !== "signed" && c.status !== "declined";
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                      {c.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  {c.public_token && (
                    <Button
                      asChild
                      size="sm"
                      variant={needsSign ? "default" : "outline"}
                      className="h-8 shrink-0"
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

// ============================================================================
// Section: Invoices
// ============================================================================

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
  const unpaidCount = invoices.filter(
    (i) => i.status !== "paid" && i.status !== "cancelled",
  ).length;

  return (
    <Card id="portal-invoices" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Invoices
          {unpaidCount > 0 && (
            <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
              {unpaidCount} unpaid
            </span>
          )}
        </CardTitle>
        {isOwner && (
          <AttachExistingDialog
            triggerLabel="Attach"
            title="Attach an invoice"
            description="Pick an invoice to share in this portal."
            emptyMessage="No invoices available to attach."
            items={available.map((i) => ({
              id: i.id,
              label: i.invoice_number,
              meta: `${i.currency} ${i.total_amount} · ${i.status}`,
            }))}
            onAttach={async (id) => attachInvoiceToPortalAction({ portalId, invoiceId: id })}
          />
        )}
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-7 w-7 text-muted-foreground/30" />}
            message="No invoices attached yet."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {invoices.map((i) => {
              const paid = i.status === "paid";
              const cancelled = i.status === "cancelled";
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.invoice_number}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground">
                        {formatPortalCurrency(i.currency, i.total_amount)}
                      </span>
                      {" · "}
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
                      className="h-8 shrink-0"
                    >
                      <Link href={`/i/${i.public_token}`} target="_blank">
                        {paid ? "View receipt" : cancelled ? "View" : "Pay now"}
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

// ============================================================================
// Section: Files
// ============================================================================

// Map MIME type → icon component
function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const cls = className ?? "h-4 w-4 shrink-0";
  if (mimeType.startsWith("image/"))  return <FileImage   className={cls} />;
  if (mimeType.startsWith("video/"))  return <Film        className={cls} />;
  if (mimeType.startsWith("audio/"))  return <Music       className={cls} />;
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("document"))
                                      return <FileText    className={cls} />;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gzip") || mimeType.includes("archive"))
                                      return <FileArchive className={cls} />;
  if (mimeType.startsWith("text/code") || mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("json"))
                                      return <FileCode    className={cls} />;
  if (mimeType.startsWith("text/"))   return <FileText    className={cls} />;
  return <File className={cls} />;
}

const CATEGORY_LABEL: Record<string, string> = {
  contract:     "Contract",
  deliverable:  "Deliverable",
  asset:        "Asset",
  invoice:      "Invoice",
  meeting_note: "Meeting note",
  misc:         "",
};

const CATEGORY_STYLE: Record<string, string> = {
  contract:     "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  deliverable:  "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  asset:        "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  invoice:      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  meeting_note: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  misc:         "",
};

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
  const confirm = useConfirm();
  const usagePct = Number.isFinite(cap) && cap > 0
    ? Math.min(100, (usage.totalBytes / cap) * 100)
    : 0;

  async function onDelete(fileId: string, fileName: string) {
    const ok = await confirm({
      title: `Delete "${fileName}"?`,
      description: "This file will be permanently removed from the portal.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await deletePortalFileAction({ portalId, fileId });
    router.refresh();
  }

  return (
    <Card id="portal-files" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Files className="h-4 w-4 text-muted-foreground" />
          Files
          <span className="text-[11px] font-normal text-muted-foreground">
            {formatBytes(usage.totalBytes)}
            {Number.isFinite(cap) ? ` / ${formatBytes(cap)}` : ""}
          </span>
        </CardTitle>
        {r2Enabled && <FileUploadButton portalId={portalId} />}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Storage bar */}
        {Number.isFinite(cap) && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={usagePct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-[width] ${usagePct > 90 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}

        {/* R2 not configured warning */}
        {!r2Enabled && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300">
            File storage isn&apos;t configured. Set{" "}
            <code className="font-mono">R2_ACCOUNT_ID</code>,{" "}
            <code className="font-mono">R2_ACCESS_KEY_ID</code>,{" "}
            <code className="font-mono">R2_SECRET_ACCESS_KEY</code>,{" "}
            <code className="font-mono">R2_BUCKET</code> in your environment to
            enable uploads.
          </p>
        )}

        {files.length === 0 ? (
          <EmptyState
            icon={<Files className="h-7 w-7 text-muted-foreground/30" />}
            message="No files shared yet."
            hint={r2Enabled ? "Upload files to share them with your client." : undefined}
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {files.map((f) => {
              const catLabel = CATEGORY_LABEL[f.category ?? "misc"] ?? "";
              const catStyle = CATEGORY_STYLE[f.category ?? "misc"] ?? "";
              return (
                <li
                  key={f.id}
                  className="group flex items-center gap-3 px-3 py-2.5"
                >
                  {/* File type icon */}
                  <span className="shrink-0 text-muted-foreground">
                    <FileTypeIcon mimeType={f.mime_type ?? ""} />
                  </span>

                  {/* Name + category */}
                  <a
                    href={`/api/portals/${portalId}/files/${f.id}/download`}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 hover:underline"
                  >
                    <span className="truncate text-sm font-medium leading-tight">
                      {f.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {catLabel && (
                        <span className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-medium ${catStyle}`}>
                          {catLabel}
                        </span>
                      )}
                      {formatBytes(f.size_bytes)}
                    </span>
                  </a>

                  {/* Delete */}
                  {(isOwner || f.uploaded_by === currentUserId) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => onDelete(f.id, f.name)}
                      aria-label={`Delete ${f.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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
        const presignRes = await fetch(`/api/portals/${portalId}/files/presign`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
        });
        const presign = (await presignRes.json()) as
          | { ok: true; fileId: string; key: string; putUrl: string }
          | { ok: false; error: string };
        if (!presign.ok) throw new Error(presign.error);

        // Step 2: PUT direct to R2
        const putRes = await fetch(presign.putUrl, {
          method: "PUT",
          body: file,
          headers: { "content-type": file.type || "application/octet-stream" },
        });
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

        // Step 3: commit
        const commitRes = await fetch(`/api/portals/${portalId}/files/commit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileId: presign.fileId,
            key: presign.key,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
          }),
        });
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
        className="h-8"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        {pending ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
        ) : (
          <><Upload className="h-3.5 w-3.5" /> Upload</>
        )}
      </Button>
      {error && (
        <span className="max-w-[140px] truncate text-[11px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Section: Chat
// ============================================================================

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || body.trim().length === 0) return;
    setPending(true);
    setError(null);
    const res = await postPortalMessageAction({ portalId, body: body.trim() });
    setPending(false);
    if (!res.ok) { setError(res.error); return; }
    setBody("");
    router.refresh();
  }

  // Server returns newest-first → render oldest-first for natural chat reading
  const ordered = [...messages].reverse();

  return (
    <Card id="portal-chat" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compose */}
        <div className="rounded-lg border bg-muted/20 p-3">
          <form onSubmit={onSubmit} className="space-y-2.5">
            <Textarea
              id="portal-message"
              placeholder="Write a message, ask a question, or share a quick note…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              rows={3}
              required
              aria-label="Message"
            />
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                For files, use the Files section above.
              </p>
              <Button
                type="submit"
                size="sm"
                className="h-8 shrink-0"
                disabled={pending || body.trim().length === 0}
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Send</>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Message thread */}
        {ordered.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-7 w-7 text-muted-foreground/30" />}
            message="No messages yet."
            hint="Use the form above to start the conversation."
          />
        ) : (
          <ul className="space-y-2.5">
            {ordered.map((m) => (
              <li key={m.id} className="rounded-lg border bg-card p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {m.author?.full_name ?? m.author?.email ?? "Someone"}
                  </span>
                  <span aria-hidden>·</span>
                  <time dateTime={m.created_at} className="tabular-nums">
                    {getRelativeTime(m.created_at)}
                  </time>
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

// ============================================================================
// Section: Portal settings (owner only, destructive — lives at bottom of rail)
// ============================================================================

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
  const [error, setError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState("");
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const archived = status === "archived";

  async function onArchive() {
    if (pending || archived) return;
    setPending(true);
    setError(null);
    const res = await archivePortalAction({ portalId });
    setPending(false);
    if (!res.ok) { setError(res.error ?? "Could not deactivate portal."); return; }
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
    if (!res.ok) { setDialogError(res.error ?? "Could not delete portal."); return; }
    setConfirmName("");
    setDeleteOpen(false);
    router.push(PORTAL_DASHBOARD_INDEX);
    router.refresh();
  }

  if (!isOwner) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          Portal settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Deactivate to pause client access. Delete to permanently remove the
          portal and all attachments.
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
            className="w-full"
          >
            {archived ? "Portal deactivated" : "Deactivate portal"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { setError(null); setDeleteOpen(true); }}
            disabled={pending}
            className="w-full"
          >
            Delete portal
          </Button>
        </div>

        <Dialog
          open={deleteOpen}
          onOpenChange={(next) => { setDeleteOpen(next); if (!next) setDialogError(null); }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this portal?</DialogTitle>
              <DialogDescription>
                This permanently removes the portal and all attachments. Type
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
                onClick={() => { setConfirmName(""); setDeleteOpen(false); }}
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

// ============================================================================
// Section: Members (owner right-rail, shown first)
// ============================================================================

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
  const confirm = useConfirm();
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
    if (!res.ok) { setError(res.error); return; }
    setEmail(""); setName(""); setOpen(false);
    router.refresh();
  }

  async function onRevoke(userId: string) {
    const ok = await confirm({
      title: "Revoke access?",
      description: "This member will immediately lose access to the portal.",
      confirmLabel: "Revoke",
      variant: "destructive",
    });
    if (!ok) return;
    await revokePortalMemberAction({ portalId, userId });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          Client access
        </CardTitle>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setOpen((o) => !o)}
            disabled={inviteDisabled}
          >
            Invite
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isOwner && missingClientEmail && (
          <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Add an email to the client profile before inviting.
            </p>
            {clientId && (
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link href={`/dashboard/clients/${clientId}`}>
                  Add client email
                </Link>
              </Button>
            )}
          </div>
        )}
        {isOwner && (hasClient || hasPending) && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-300">
            One client per portal. Revoke current access before inviting another.
          </p>
        )}
        {open && isOwner && !inviteDisabled && (
          <form onSubmit={onInvite} className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1">
              <Label htmlFor="invite-email" className="text-xs">Client email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-name" className="text-xs">Name (optional)</Label>
              <Input
                id="invite-name"
                placeholder="Sam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>
            )}
            <Button type="submit" size="sm" className="h-7 w-full text-xs" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : "Send invite"}
            </Button>
          </form>
        )}

        {members.length === 0 && pendingInvitations.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
            No client connected yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {members.map((member) => {
              const displayName = getMemberDisplayName(member.profile);
              const memberEmail = getMemberEmail(member.profile);
              const isOwnerMember = member.role === "owner";
              return (
                <li key={member.user_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    {memberEmail && (
                      <p className="text-[11px] text-muted-foreground">{memberEmail}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={isOwnerMember ? "default" : "secondary"} className="text-[10px]">
                      {isOwnerMember ? "Owner" : "Client"}
                    </Badge>
                    {isOwner && !isOwnerMember && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onRevoke(member.user_id)}>
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
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Pending</p>
            <ul className="divide-y rounded-lg border">
              {pendingInvitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Expires {formatDate(inv.expires_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Pending</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Section: Activity feed (timeline style)
// ============================================================================

const ACTIVITY_LIMIT = 12;

function getActivityDotColor(type: string): string {
  if (type.startsWith("meeting."))      return "bg-violet-500";
  if (type.startsWith("update."))       return "bg-sky-500";
  if (type.startsWith("file."))         return "bg-amber-500";
  if (type.startsWith("contract."))     return "bg-blue-500";
  if (type.startsWith("invoice."))      return "bg-emerald-500";
  if (type.startsWith("portal.member")) return "bg-pink-500";
  return "bg-muted-foreground/40";
}

function ActivitySection({ activity }: { activity: ViewProps["activity"] }) {
  const ordered = [...activity].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const visible = ordered.slice(0, ACTIVITY_LIMIT);
  const hiddenCount = ordered.length - visible.length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-7 w-7 text-muted-foreground/30" />}
            message="No activity yet."
          />
        ) : (
          <>
            <ol className="relative space-y-0">
              {visible.map((item, index) => {
                const title = formatActivityTitle(item);
                const description = formatActivityDescription(item);
                const isLast = index === visible.length - 1 && hiddenCount === 0;
                return (
                  <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* Connecting line */}
                    {!isLast && (
                      <div className="absolute left-[6px] top-[14px] bottom-0 w-px bg-border" />
                    )}
                    {/* Colored dot */}
                    <div
                      className={`relative z-10 mt-[3px] h-3.5 w-3.5 shrink-0 rounded-full ${getActivityDotColor(item.type)}`}
                    />
                    {/* Content */}
                    <div className="min-w-0 flex-1 pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-tight">{title}</p>
                        <time
                          dateTime={item.created_at}
                          className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
                        >
                          {getRelativeTime(item.created_at)}
                        </time>
                      </div>
                      {description && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {hiddenCount > 0 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                + {hiddenCount} older event{hiddenCount > 1 ? "s" : ""}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Shared: AttachExistingDialog
// ============================================================================

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
    if (!res.ok) { setError(res.error ?? "Could not attach. Please try again."); return; }
    setSelectedId("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
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

// ============================================================================
// Shared: EmptyState
// ============================================================================

function EmptyState({
  icon,
  message,
  hint,
}: {
  icon: React.ReactNode;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint && (
        <p className="text-xs text-muted-foreground/70">{hint}</p>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatPortalCurrency(currency: string, amount: number): string {
  if (!Number.isFinite(amount)) return `${currency} 0`;
  return `${currency} ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatBytes(bytes: number): string {
  if (bytes === Infinity) return "∞";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getRelativeTime(iso: string): string {
  const diffMs   = Date.now() - Date.parse(iso);
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)   return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7)   return `${diffDays}d ago`;
  if (diffDays < 30)  return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getMemberDisplayName(
  profile: ViewProps["members"][number]["profile"],
): string {
  return profile?.full_name ?? profile?.email ?? "Unknown member";
}

function getMemberEmail(
  profile: ViewProps["members"][number]["profile"],
): string | null {
  return profile?.email ?? null;
}

function formatActivityTitle(item: PortalActivityRow): string {
  switch (item.type) {
    case "portal.created":            return "Portal created";
    case "portal.renamed":            return "Portal renamed";
    case "portal.member_invited":     return "Client invited";
    case "portal.member_joined":      return "Client joined";
    case "portal.member_revoked":     return "Access revoked";
    case "contract.attached":         return "Contract attached";
    case "invoice.attached":          return "Invoice attached";
    case "message.posted":            return "Message sent";
    case "file.uploaded":             return "File uploaded";
    case "file.deleted":              return "File deleted";
    case "update.posted":             return "Update posted";
    case "update.acknowledged":       return "Update acknowledged";
    case "update.approved":           return "Update approved";
    case "update.revision_requested": return "Revision requested";
    case "update.comment":            return "Comment added";
    case "meeting.requested":         return "Meeting requested";
    case "meeting.accepted":          return "Meeting confirmed";
    case "meeting.declined":          return "Meeting declined";
    case "meeting.completed":         return "Meeting completed";
    default:
      return item.type.replace(/[._]/g, " ");
  }
}

function formatActivityDescription(item: PortalActivityRow): string | null {
  const payload = parsePayload(item.payload);
  if (typeof payload.name === "string")    return payload.name;
  if (typeof payload.title === "string")   return payload.title;
  if (typeof payload.topic === "string")   return payload.topic;
  if (typeof payload.email === "string")   return payload.email;
  if (typeof payload.number === "string")  return `Invoice ${payload.number}`;
  if (typeof payload.preview === "string") return `"${payload.preview}"`;
  return null;
}

function parsePayload(payload: PortalActivityRow["payload"]): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload as Record<string, unknown>;
}
