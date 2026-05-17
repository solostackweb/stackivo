import {
  CircleDashed,
  CircleAlert,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Accounting overview — explicit separation of invoice-issued vs.
 * cash-collected.
 *
 * This widget exists because aggregate dashboards trick freelancers into
 * thinking issued invoices are revenue. They aren't — they're receivables.
 * Each tile below is labelled in plain accounting language so the
 * distinction is unmistakable.
 *
 * Inputs are the new shape returned by `getInvoiceAggregates()`:
 *   - totalInvoiced    : everything ever billed (drafts excluded).
 *   - collectedAllTime : actual money received (paid invoices).
 *   - outstanding      : issued but unpaid — i.e. accrued income.
 *   - overdueAmount    : subset of outstanding that's past due.
 *
 * Replaces the stubbed `PendingPayments` placeholder.
 */
export interface AccountingOverviewProps {
  totalInvoiced: number;
  collectedAllTime: number;
  outstanding: number;
  overdueAmount: number;
}

export function AccountingOverview({
  totalInvoiced,
  collectedAllTime,
  outstanding,
  overdueAmount,
}: AccountingOverviewProps) {
  const overdueShare =
    outstanding > 0 ? Math.min(100, (overdueAmount / outstanding) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accounting overview</CardTitle>
        <CardDescription>
          Invoices issued are <span className="font-medium">receivables</span>,
          not revenue. Cash collected is what actually moved into your bank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile
            icon={Receipt}
            label="Total invoiced"
            value={formatINR(totalInvoiced, { compact: true })}
            sub="Issued amount"
            tone="default"
          />
          <Tile
            icon={Wallet}
            label="Collected (all time)"
            value={formatINR(collectedAllTime, { compact: true })}
            sub="Paid invoices only"
            tone="success"
          />
          <Tile
            icon={CircleDashed}
            label="Outstanding"
            value={formatINR(outstanding, { compact: true })}
            sub="Accrued / receivable"
            tone="warning"
          />
          <Tile
            icon={CircleAlert}
            label="Overdue"
            value={formatINR(overdueAmount, { compact: true })}
            sub={
              outstanding > 0
                ? `${overdueShare.toFixed(0)}% of outstanding`
                : "Nothing past due"
            }
            tone="danger"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface TileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone: "default" | "success" | "warning" | "danger";
}

function Tile({ icon: Icon, label, value, sub, tone }: TileProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border p-3",
        tone === "default" && "bg-card",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/[0.04]",
        tone === "warning" && "border-amber-500/20 bg-amber-500/[0.04]",
        tone === "danger" && "border-destructive/20 bg-destructive/[0.04]",
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums tracking-tight">
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1",
          tone === "default" && "bg-primary/10 text-primary ring-primary/15",
          tone === "success" &&
            "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
          tone === "warning" &&
            "bg-amber-500/15 text-amber-700 ring-amber-500/20 dark:text-amber-400",
          tone === "danger" &&
            "bg-destructive/15 text-destructive ring-destructive/20",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}
