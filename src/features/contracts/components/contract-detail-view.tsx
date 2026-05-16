"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { getClientInitials } from "@/features/clients/utils";

import type { ContractRecord } from "../server";
import type { ClientRecord } from "@/features/clients/server";
import { CONTRACT_KIND_LABEL } from "../status";
import { ContractStatusBadge } from "./contract-status-badge";
import {
  deleteContractAction,
  setContractStatusAction,
} from "../actions";
import { sendContractAction } from "../delivery";
import { ensureContractTokenAction } from "../actions";
import { SignatureMark } from "./signature-mark";
import { useProfile } from "@/features/profile/context";

interface ContractDetailViewProps {
  contract: ContractRecord;
  client: ClientRecord | null;
  clientName: string | null;
}

interface ParsedSection {
  heading: string;
  body: string;
}

function parseSections(content: string | null): {
  sections: ParsedSection[];
  raw: string | null;
} {
  if (!content) return { sections: [], raw: null };
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const sections = parsed
        .filter(
          (s): s is ParsedSection =>
            !!s && typeof s.heading === "string" && typeof s.body === "string",
        )
        .map((s) => ({ heading: s.heading, body: s.body }));
      if (sections.length > 0) return { sections, raw: null };
    }
  } catch {
    // fall through
  }
  return { sections: [], raw: content };
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ContractDetailView({
  contract,
  client,
  clientName,
}: ContractDetailViewProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const { sections, raw } = React.useMemo(
    () => parseSections(contract.content),
    [contract.content],
  );

  const isSignable =
    contract.status === "draft" ||
    contract.status === "sent" ||
    contract.status === "viewed";

  const runStatusAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  };

  const handleSendForSignature = () => {
    if (!client) {
      toast.error("This contract has no client attached.");
      return;
    }
    if (!client.email?.trim()) {
      toast.error("Add an email to the client before sending.");
      return;
    }
    runStatusAction(async () => {
      const res = await sendContractAction({ contractId: contract.id });
      if (!res.ok) throw new Error(res.error);
      const token = res.data?.token;
      if (!token) {
        toast.success("Sent for signature");
        router.refresh();
        return;
      }
      const shareUrl = `${window.location.origin}/c/${token}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Sent for signature. Share link copied to clipboard.");
      } catch {
        toast.success("Sent for signature");
      }
      router.refresh();
    });
  };

  const handleMark = (status: "signed" | "declined") => {
    const fd = new FormData();
    fd.set("id", contract.id);
    fd.set("status", status);
    runStatusAction(async () => {
      const res = await setContractStatusAction(undefined, fd);
      if (!res.ok) throw new Error(res.error);
      toast.success(`Marked ${status}`);
      router.refresh();
    });
  };

  const handleDelete = () => {
    const fd = new FormData();
    fd.set("id", contract.id);
    runStatusAction(async () => {
      const res = await deleteContractAction(undefined, fd);
      if (!res.ok) throw new Error(res.error);
      toast.success("Contract deleted");
      router.push("/dashboard/contracts");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/dashboard/contracts" aria-label="Back to contracts">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 text-sm">
            <Link
              href="/dashboard/contracts"
              className="text-muted-foreground hover:text-foreground"
            >
              Contracts
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium">{contract.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSignable && (
            <Button size="sm" onClick={handleSendForSignature}>
              <Send /> {contract.status === "draft" ? "Send for signature" : "Resend"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              startTransition(async () => {
                try {
                  const res = await ensureContractTokenAction({ contractId: contract.id });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  const token = res.data?.token;
                  if (!token) {
                    toast.error("Could not create share link.");
                    return;
                  }
                  const url = `${window.location.origin}/c/${token}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Share link copied to clipboard.");
                  } catch {
                    // Fallback: open the link in a new tab so user can copy
                    window.open(url, "_blank");
                    toast.success("Share link opened in a new tab.");
                  }
                } catch (e) {
                  toast.error((e as Error).message);
                }
              });
            }}
          >
            Copy share link
          </Button>
          {contract.status !== "signed" && contract.status !== "declined" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMark("signed")}
            >
              <CheckCircle2 /> Mark signed
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {contract.status !== "declined" && (
                <DropdownMenuItem onSelect={() => handleMark("declined")}>
                  <XCircle className="h-3.5 w-3.5" /> Mark declined
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        {/* LEFT — content */}
        <Card>
          <CardContent className="space-y-6 p-8">
            <header className="border-b pb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {CONTRACT_KIND_LABEL[contract.kind]}
              </p>
              <h1
                className="mt-1 text-2xl font-semibold tracking-tight"
                style={{
                  fontFamily: '"Georgia", "Times New Roman", serif',
                }}
              >
                {contract.title}
              </h1>
              {clientName && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Prepared for{" "}
                  <span className="font-medium text-foreground">
                    {clientName}
                  </span>
                </p>
              )}
            </header>

            {sections.length > 0 ? (
              <div className="space-y-6 text-sm leading-relaxed">
                {sections.map((s, i) => (
                  <section key={i}>
                    <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.heading}
                    </h2>
                    <p className="whitespace-pre-line text-muted-foreground">
                      {s.body || (
                        <span className="italic text-muted-foreground/60">
                          (empty)
                        </span>
                      )}
                    </p>
                  </section>
                ))}
              </div>
            ) : raw ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {raw}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No content yet.
              </p>
            )}

            {contract.kind === "contract" && (
              <section className="border-t pt-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Signature record
                  </p>
                  {contract.status === "signed" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Final signed document
                    </span>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DashboardSignatureBlock
                    role="Freelancer"
                    name={
                      profile?.legalName ??
                      profile?.businessName ??
                      profile?.fullName ??
                      "Freelancer"
                    }
                    email={profile?.businessEmail ?? profile?.email}
                    signedAt={profile?.signatureUpdatedAt ?? contract.createdAt}
                    signature={{
                      type: profile?.signatureType ?? null,
                      imageUrl: profile?.signatureImageUrl,
                      textValue: profile?.signatureTextValue,
                      fontFamily: profile?.signatureFontFamily,
                    }}
                    fallback="Signature on file"
                  />
                  <DashboardSignatureBlock
                    role="Client"
                    name={clientName ?? "Client"}
                    email={client?.email}
                    signedAt={contract.signedAt}
                    signature={{
                      type: contract.signatureType,
                      imageUrl: contract.signatureImageUrl,
                      textValue: contract.signatureTextValue,
                      fontFamily: contract.signatureFontFamily,
                    }}
                    fallback="Awaiting signature"
                  />
                </div>
              </section>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — metadata */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="space-y-4 p-5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    <ContractStatusBadge status={contract.status} />
                  </div>
                </div>
                {contract.valueAmount != null && contract.valueAmount > 0 && (
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Value
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {formatINR(contract.valueAmount)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t pt-3">
                <MetaRow
                  label="Kind"
                  value={CONTRACT_KIND_LABEL[contract.kind]}
                />
                {client && (
                  <MetaRow
                    label="Client"
                    value={
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="inline-flex items-center gap-2 hover:underline"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {getClientInitials(clientName ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{clientName}</span>
                      </Link>
                    }
                  />
                )}
                <MetaRow label="Created" value={formatDate(contract.createdAt)} />
                {contract.sentAt && (
                  <MetaRow label="Sent" value={formatDate(contract.sentAt)} />
                )}
                {contract.viewedAt && (
                  <MetaRow
                    label="Viewed"
                    value={formatDate(contract.viewedAt)}
                  />
                )}
                {contract.signedAt && (
                  <MetaRow
                    label="Signed"
                    value={formatDate(contract.signedAt)}
                  />
                )}
                {contract.expiresAt && (
                  <MetaRow
                    label="Expires"
                    value={formatDate(contract.expiresAt)}
                  />
                )}
                {contract.projectId && (
                  <MetaRow
                    label="Project"
                    value={
                      <Link
                        href={`/dashboard/projects/${contract.projectId}`}
                        className="hover:underline"
                      >
                        View
                      </Link>
                    }
                  />
                )}
                {contract.publicToken && (
                  <MetaRow
                    label="Sign URL"
                    value={
                      <code className="truncate font-mono text-[11px] text-muted-foreground">
                        /c/{contract.publicToken}
                      </code>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this contract?"
        description="This will permanently remove the contract from your workspace. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function DashboardSignatureBlock({
  role,
  name,
  email,
  signedAt,
  signature,
  fallback,
}: {
  role: string;
  name: string;
  email?: string | null;
  signedAt?: string | null;
  signature: React.ComponentProps<typeof SignatureMark>["signature"];
  fallback: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {role}
      </p>
      <div className="mt-4 flex h-20 items-end border-b border-dashed pb-2">
        <SignatureMark
          signature={signature}
          fallbackName={fallback}
          alt={`${role} signature`}
        />
      </div>
      <div className="mt-3 text-sm">
        <p className="font-semibold">{name}</p>
        {email && <p className="text-xs text-muted-foreground">{email}</p>}
        {signedAt && (
          <p className="mt-1 text-xs text-success">
            Signed on {formatDate(signedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 text-xs")}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-sm">{value}</span>
    </div>
  );
}
