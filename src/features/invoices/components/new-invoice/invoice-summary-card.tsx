"use client";

import * as React from "react";
import { CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { InvoiceTotalsBreakdown } from "./invoice-totals";
import type { InvoiceTotals } from "../../schema";

interface InvoiceSummaryCardProps {
  totals: InvoiceTotals;
  gstRate: number;
  taxMode: "intra" | "inter";
  dueDate?: string;
}

/**
 * Reusable summary card shown in the sticky sidebar while creating an invoice.
 * Pure presentational — pure function of `(totals, gstRate, taxMode)`.
 */
export function InvoiceSummaryCard({
  totals,
  gstRate,
  taxMode,
  dueDate,
}: InvoiceSummaryCardProps) {
  const dueDateLabel = dueDate
    ? new Date(dueDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Invoice summary
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {formatINR(totals.total)}
          </p>
        </div>

        <InvoiceTotalsBreakdown
          totals={totals}
          gstRate={gstRate}
          taxMode={taxMode}
        />

        {dueDateLabel && (
          <div className="flex items-center justify-center gap-2 rounded-md bg-success/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-success">
            <CalendarCheck className="h-3.5 w-3.5" />
            Due on {dueDateLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
