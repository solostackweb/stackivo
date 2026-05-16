"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";

import type { InvoiceRecord } from "../server";
import {
  buildInvoiceColumns,
  type InvoiceColumnLookup,
} from "./invoices-columns";
import { InvoicesSummary } from "./invoices-summary";
import { InvoicesToolbar } from "./invoices-toolbar";
import { InvoicesBulkActions } from "./invoices-bulk-actions";
import { InvoiceMobileCard } from "./invoice-mobile-card";
import {
  deleteInvoiceAction,
  setInvoiceStatusAction,
} from "../actions";

interface InvoicesListViewProps {
  invoices: InvoiceRecord[];
  clients: Array<{ id: string; name: string }>;
}

/**
 * Orchestrator for the invoices list. Receives the authoritative snapshot
 * from the server page; mutations route through real server actions and a
 * `router.refresh()` re-hydrates the snapshot.
 */
export function InvoicesListView({
  invoices,
  clients,
}: InvoicesListViewProps) {
  const router = useRouter();
  const [pendingDeleteIds, setPendingDeleteIds] = React.useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const lookup: InvoiceColumnLookup = React.useMemo(
    () => ({ clientNameById: new Map(clients.map((c) => [c.id, c.name])) }),
    [clients],
  );

  const clientOptions = React.useMemo(() => {
    const present = new Set(
      invoices.map((i) => i.clientId).filter(Boolean) as string[],
    );
    return clients
      .filter((c) => present.has(c.id))
      .map((c) => ({ value: c.id, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [invoices, clients]);

  // --- single-row actions used inside column dropdowns ---------------------

  const runStatusChange = (
    invoice: InvoiceRecord,
    next: "paid",
  ) => {
    const fd = new FormData();
    fd.set("id", invoice.id);
    fd.set("status", next);
    startTransition(async () => {
      const res = await setInvoiceStatusAction(undefined, fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${invoice.invoiceNumber} marked as paid`,
      );
      router.refresh();
    });
  };

  const handleMarkPaid = (invoice: InvoiceRecord) =>
    runStatusChange(invoice, "paid");
  const handleDelete = (invoice: InvoiceRecord) => {
    setPendingDeleteIds([invoice.id]);
    setBulkDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (pendingDeleteIds.length === 0) return;
    const ids = [...pendingDeleteIds];
    startTransition(async () => {
      let okCount = 0;
      for (const id of ids) {
        const fd = new FormData();
        fd.set("id", id);
        const res = await deleteInvoiceAction(undefined, fd);
        if (res.ok) okCount += 1;
        else toast.error(res.error);
      }
      if (okCount > 0) {
        toast.success(
          `${okCount} invoice${okCount === 1 ? "" : "s"} deleted`,
        );
      }
      setPendingDeleteIds([]);
      setBulkDeleteOpen(false);
      router.refresh();
    });
  };

  const columns = React.useMemo(
    () =>
      buildInvoiceColumns({
        onMarkPaid: handleMarkPaid,
        onDelete: handleDelete,
        lookup,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lookup],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Track, send, and reconcile invoices across your clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/dashboard/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        </div>
      </div>

      <InvoicesSummary invoices={invoices} />

      <DataTable
        columns={columns}
        data={invoices}
        initialPageSize={10}
        onRowClick={(inv) => router.push(`/dashboard/invoices/${inv.id}`)}
        toolbar={(table) => (
          <InvoicesToolbar table={table} clientOptions={clientOptions} />
        )}
        mobileCard={(invoice, { isSelected, toggleSelected, onOpen }) => (
          <InvoiceMobileCard
            invoice={invoice}
            clientName={
              invoice.clientId
                ? (lookup.clientNameById.get(invoice.clientId) ?? null)
                : null
            }
            isSelected={isSelected}
            onToggleSelected={toggleSelected}
            onOpen={onOpen}
            onMarkPaid={() => handleMarkPaid(invoice)}
            onDelete={() => handleDelete(invoice)}
          />
        )}
        emptyState={
          invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice to start tracking payments."
              action={{ label: "New invoice", href: "/dashboard/invoices/new" }}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No invoices match your filters"
              description="Try adjusting your search, status, or client filter."
            />
          )
        }
        bulkBar={(table) => {
          const selected = table.getFilteredSelectedRowModel().rows;
          const count = selected.length;
          return (
            <InvoicesBulkActions
              selectedCount={count}
              onMarkPaid={() => {
                const targets = selected
                  .map((r) => r.original)
                  .filter((i) => i.status !== "paid" && i.status !== "draft");
                if (targets.length === 0) {
                  toast("Nothing to mark as paid");
                  return;
                }
                startTransition(async () => {
                  let okCount = 0;
                  for (const inv of targets) {
                    const fd = new FormData();
                    fd.set("id", inv.id);
                    fd.set("status", "paid");
                    const res = await setInvoiceStatusAction(undefined, fd);
                    if (res.ok) okCount += 1;
                  }
                  toast.success(
                    `${okCount} invoice${okCount === 1 ? "" : "s"} marked as paid`,
                  );
                  table.resetRowSelection();
                  router.refresh();
                });
              }}
              onExport={() =>
                toast(
                  `Export coming soon (${count} selected)`,
                )
              }
              onDelete={() => {
                setPendingDeleteIds(selected.map((r) => r.original.id));
                setBulkDeleteOpen(true);
              }}
              onClear={() => table.resetRowSelection()}
            />
          );
        }}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDeleteIds.length} invoice
              {pendingDeleteIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected invoice
              {pendingDeleteIds.length === 1 ? "" : "s"} and any associated
              line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteIds([])}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
