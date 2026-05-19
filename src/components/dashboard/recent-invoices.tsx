import * as React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import type { InvoiceFeedItem } from "@/features/dashboard/server";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "./status-badge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function RecentInvoices({ items }: { items: InvoiceFeedItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-bold tracking-tight">Recent invoices</CardTitle>
          <CardDescription className="text-xs">
            Latest activity across your invoices
          </CardDescription>
        </div>
        <Link
          href="/dashboard/invoices"
          className="shrink-0 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice to start tracking billing and payments."
              action={{ label: "Create invoice", href: "/dashboard/invoices/new" }}
              className="min-h-[200px]"
            />
          </div>
        ) : (
          <>
            {/* ── Mobile: stacked cards (hidden on md+) ── */}
            <ul className="divide-y md:hidden">
              {items.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border">
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-indigo-500/10 text-[10px] font-bold text-primary">
                        {inv.clientInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {inv.clientName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {inv.number} · {formatDateShort(inv.issueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatINR(inv.amount)}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* ── Desktop: proper table (hidden below md) ── */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 text-[11px] font-semibold uppercase tracking-wider">
                      Invoice
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                      Client
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">
                      Amount
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="pr-6 text-[11px] font-semibold uppercase tracking-wider">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((inv) => (
                    <TableRow key={inv.id} className="transition-colors">
                      <TableCell className="pl-6 font-semibold">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="transition-colors hover:text-primary"
                        >
                          {inv.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="flex items-center gap-2 transition-colors hover:text-primary"
                        >
                          <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-indigo-500/10 text-[10px] font-bold text-primary">
                              {inv.clientInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="max-w-[140px] truncate text-sm font-medium">
                            {inv.clientName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatINR(inv.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-sm text-muted-foreground">
                        {formatDate(inv.issueDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
