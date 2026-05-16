"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Pencil,
  Trash2,
  FilePlus,
  MoreHorizontal,
  Activity,
  Receipt,
  FileText,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { formatINR } from "@/lib/format";
import { getStateName } from "@/features/gst/state-codes";

import type { ClientRecord } from "../server";
import { ClientFormDialog } from "./client-form-dialog";
import { DeleteClientDialog } from "./delete-client-dialog";
import { getClientDisplayName, getClientInitials } from "../utils";

interface ClientProfileViewProps {
  client: ClientRecord;
  /** Aggregates pre-computed on the server. Keeps the client component dumb. */
  metrics: {
    invoiceCount: number;
    paidTotal: number;
  };
}

/**
 * Read-only profile view for a single client. Edit + delete dialogs are
 * mounted here and route off to server actions.
 */
export function ClientProfileView({ client, metrics }: ClientProfileViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const display = getClientDisplayName(client);
  const initials = getClientInitials(display);
  const createdDate = new Date(client.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5">
        <Link href="/dashboard/clients">
          <ArrowLeft className="h-3.5 w-3.5" /> All clients
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {display}
                </h1>
                {client.gstRegistered ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    GST registered
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unregistered
                  </span>
                )}
              </div>
              {client.businessName && client.fullName !== client.businessName && (
                <p className="text-sm text-muted-foreground">
                  Contact: {client.fullName}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {client.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {client.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Client since {createdDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard/invoices/new">
                <FilePlus /> New invoice
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/invoices?client=${client.id}`}>
                    <Receipt /> Invoices
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 /> Delete client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Paid invoices"
          value={String(metrics.invoiceCount)}
        />
        <StatTile
          label="Paid to date"
          value={formatINR(metrics.paidTotal)}
        />
        <StatTile
          label="Average invoice"
          value={formatINR(
            metrics.invoiceCount > 0 ? metrics.paidTotal / metrics.invoiceCount : 0,
          )}
          subtle={metrics.invoiceCount === 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Activity}
                title="Activity timeline coming soon"
                description="Recent invoices, payments, and notes for this client will show up here."
                className="min-h-[180px]"
              />
            </CardContent>
          </Card>

          {client.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {client.notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Email" value={client.email ?? "—"} />
              <Separator />
              <DetailRow label="Phone" value={client.phone ?? "—"} />
              <Separator />
              <DetailRow
                label="Business name"
                value={client.businessName ?? "—"}
              />
              <Separator />
              <DetailRow
                label="Contact name"
                value={client.fullName}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow
                label="GSTIN"
                value={
                  client.gstRegistered
                    ? (client.gstin ?? "—")
                    : "Not registered"
                }
                mono={client.gstRegistered}
              />
              <Separator />
              <DetailRow
                label="State"
                value={
                  client.stateCode
                    ? `${getStateName(client.stateCode)} (${client.stateCode})`
                    : "—"
                }
              />
              <Separator />
              <DetailRow
                label="Billing address"
                value={client.billingAddress ?? "—"}
                multiline
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />

      <DeleteClientDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        client={client}
        onDeleted={() => router.push("/dashboard/clients")}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          "mt-2 text-xl font-semibold tabular-nums tracking-tight " +
          (subtle ? "text-muted-foreground" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline
          ? "space-y-1"
          : "flex items-center justify-between gap-2"
      }
    >
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={
          (multiline
            ? "block whitespace-pre-line "
            : "truncate text-right ") +
          "font-medium " +
          (mono ? "font-mono text-sm" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
