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
          className="text-xs font-semibold text-primary transition-colors hover:text-primary/80"
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
              className="min-h-[220px]"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="hidden pl-6 text-[11px] font-semibold uppercase tracking-wider md:table-cell">
                    Invoice
                  </TableHead>
                  <TableHead className="pl-4 text-[11px] font-semibold uppercase tracking-wider md:pl-0">
                    Client
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">
                    Amount
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="pr-4 text-[11px] font-semibold uppercase tracking-wider md:pr-6">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id} className="transition-colors">
                    <TableCell className="hidden pl-6 font-semibold md:table-cell">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="transition-colors hover:text-primary"
                      >
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell className="pl-4 md:pl-0">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="flex items-center gap-2 transition-colors hover:text-primary"
                      >
                        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-indigo-500/10 text-[10px] font-bold text-primary">
                            {inv.clientInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[110px] truncate text-sm font-medium sm:max-w-none">
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
                    <TableCell className="pr-4 text-sm text-muted-foreground md:pr-6">
                      {formatDate(inv.issueDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
