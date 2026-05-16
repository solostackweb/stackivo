"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Receipt,
  Files,
  MessageSquare,
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
  invitePortalMemberAction,
  postPortalMessageAction,
  deletePortalFileAction,
  revokePortalMemberAction,
} from "../actions";
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
  role: PortalRole;
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
  invoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    currency: string;
    status: string;
    public_token: string | null;
  }>;
  welcomeDocuments: Array<{
    id: string;
    title: string;
    status: string;
    public_token: string | null;
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
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <WelcomeDocumentsSection
          documents={props.welcomeDocuments}
          isOwner={isOwner}
        />
        <ContractsSection
          contracts={props.contracts}
          isOwner={isOwner}
        />
        <InvoicesSection invoices={props.invoices} isOwner={isOwner} />
        <FilesSection
          portalId={props.portalId}
          files={props.files}
          isOwner={isOwner}
          r2Enabled={props.r2Enabled}
          usage={props.storageUsage}
          cap={props.storageCap}
        />
        <MessagesSection
          portalId={props.portalId}
          messages={props.messages}
        />
      </div>
      <div className="space-y-6">
        <MembersSection
          portalId={props.portalId}
          members={props.members}
          pendingInvitations={props.pendingInvitations}
          isOwner={isOwner}
        />
        <ActivitySection activity={props.activity} />
      </div>
    </div>
  );
}

// ============================================================================
// Sections
// ============================================================================

function WelcomeDocumentsSection({
  documents,
  isOwner,
}: {
  documents: ViewProps["welcomeDocuments"];
  isOwner: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Welcome guides
        </CardTitle>
        {isOwner && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/welcome">Attach existing</Link>
          </Button>
        )}
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
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {d.status.replace(/_/g, " ")}
                    {d.acknowledgement_required ? " · acknowledgement required" : ""}
                  </p>
                </div>
                {d.public_token && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                  >
                    <Link href={`/w/${d.public_token}`} target="_blank">
                      Open <ExternalLink />
                    </Link>
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

function ContractsSection({
  contracts,
  isOwner,
}: {
  contracts: ViewProps["contracts"];
  isOwner: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Contracts
        </CardTitle>
        {isOwner && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/contracts">Attach existing</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No contracts attached yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {contracts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
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
                    variant="outline"
                    className="shrink-0"
                  >
                    <Link href={`/c/${c.public_token}`} target="_blank">
                      Open <ExternalLink />
                    </Link>
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

function InvoicesSection({
  invoices,
  isOwner,
}: {
  invoices: ViewProps["invoices"];
  isOwner: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" /> Invoices
        </CardTitle>
        {isOwner && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/invoices">Attach existing</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No invoices attached yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {invoices.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {i.invoice_number}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {i.currency} {i.total_amount} ·{" "}
                    <span className="capitalize">{i.status}</span>
                  </p>
                </div>
                {i.public_token && (
                  <Button
                    asChild
                    size="sm"
                    variant={i.status === "paid" ? "outline" : "default"}
                    className="shrink-0"
                  >
                    <Link href={`/i/${i.public_token}`} target="_blank">
                      {i.status === "paid" ? (
                        <>
                          View <ExternalLink />
                        </>
                      ) : (
                        <>
                          Pay <ExternalLink />
                        </>
                      )}
                    </Link>
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

function FilesSection({
  portalId,
  files,
  isOwner,
  r2Enabled,
  usage,
  cap,
}: {
  portalId: string;
  files: PortalFileRow[];
  isOwner: boolean;
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
                {(isOwner || true) && (
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

  // Reverse chronological from server → render oldest-first for natural reading.
  const ordered = [...messages].reverse();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" /> Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ordered.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No comments yet. Start the thread below.
          </p>
        ) : (
          <ul className="space-y-3">
            {ordered.map((m) => (
              <li
                key={m.id}
                className="rounded-md border bg-muted/20 p-3"
              >
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
        <form onSubmit={onSubmit} className="space-y-2">
          <Textarea
            placeholder="Write a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
            rows={3}
            required
          />
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
                  <Send /> Post
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MembersSection({
  portalId,
  members,
  pendingInvitations,
  isOwner,
}: {
  portalId: string;
  members: ViewProps["members"];
  pendingInvitations: ViewProps["pendingInvitations"];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
        <CardTitle className="text-base">Members</CardTitle>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen((o) => !o)}
          >
            <UserPlus /> Invite
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {open && isOwner && (
          <form onSubmit={onInvite} className="space-y-2 rounded-md border p-3">
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
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.profile?.full_name ?? m.profile?.email ?? m.user_id.slice(0, 8)}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {m.profile?.email}
                </p>
              </div>
              <Badge
                variant={m.role === "owner" ? "default" : "secondary"}
                className="capitalize"
              >
                {m.role}
              </Badge>
              {isOwner && m.role !== "owner" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRevoke(m.user_id)}
                  aria-label="Revoke"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {isOwner && pendingInvitations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Pending invitations
            </p>
            <ul className="space-y-1.5">
              {pendingInvitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-xs"
                >
                  <span className="truncate">{inv.email}</span>
                  <span className="shrink-0 text-muted-foreground">
                    expires {new Date(inv.expires_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivitySection({ activity }: { activity: PortalActivityRow[] }) {
  if (activity.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nothing yet — actions in this portal will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-xs">
          {activity.slice(0, 12).map((a) => (
            <li key={a.id} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {humanizeActivity(a.type)}
                </p>
                <p className="text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "∞";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log10(bytes) / 3));
  return `${(bytes / Math.pow(1000, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function humanizeActivity(type: string): string {
  switch (type) {
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
    case "file.uploaded":
      return "File uploaded";
    case "file.deleted":
      return "File deleted";
    case "message.posted":
      return "New comment";
    case "contract.attached":
      return "Contract attached";
    case "contract.signed":
      return "Contract signed";
    case "invoice.attached":
      return "Invoice attached";
    case "invoice.paid":
      return "Invoice paid";
    default:
      return type.replace(/[._]/g, " ");
  }
}
