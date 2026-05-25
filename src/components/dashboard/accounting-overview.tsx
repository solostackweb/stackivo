import {
  CircleDashed,
  CircleAlert,
  FolderKanban,
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
 * cash-collected, plus an operational counterweight (active projects).
 *
 * Four tiles, deliberately chosen:
 *   1. Collected revenue (paid invoices — real money in bank).
 *   2. Outstanding (issued but unpaid — receivables / accrued income).
 *   3. Overdue (subset of outstanding that's past due).
 *   4. Active projects (operational state, not money).
 *
 * Anything beyond these belongs on a feature-specific page, not the
 * dashboard.
 */
export interface AccountingOverviewProps {
  collectedAllTime: number;
  outstanding: number;
  overdueAmount: number;
  activeProjects: number;
}

export function AccountingOverview({
  collectedAllTime,
  outstanding,
  overdueAmount,
  activeProjects,
}: AccountingOverviewProps) {
  const overdueShare =
    outstanding > 0 ? Math.min(100, (overdueAmount / outstanding) * 100) : 0;

  return (
    <Card className="border-border/60 shadow-sm shadow-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] font-semibold tracking-tight">Business overview</CardTitle>
        <CardDescription className="text-[13px]">
          Issued invoices are <span className="font-medium text-foreground/70">receivables</span>,
          not revenue — cash collected is what actually moved into your bank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="stagger-children grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile
            icon={Wallet}
            label="Collected"
            value={formatINR(collectedAllTime, { compact: true })}
            sub="Paid invoices · all time"
            tone="success"
          />
          <Tile
            icon={CircleDashed}
            label="Outstanding"
            value={formatINR(outstanding, { compact: true })}
            sub="Issued but unpaid"
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
          <Tile
            icon={FolderKanban}
            label="Active projects"
            value={String(activeProjects)}
            sub={activeProjects === 1 ? "1 in flight" : "Currently in flight"}
            tone="default"
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
        "card-lift flex items-start justify-between gap-3 rounded-xl border p-4 transition-all",
        tone === "default" && "border-border/60 bg-card",
        tone === "success" && "border-emerald-500/15 bg-emerald-500/[0.03]",
        tone === "warning" && "border-amber-500/15 bg-amber-500/[0.03]",
        tone === "danger" && "border-destructive/15 bg-destructive/[0.03]",
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </p>
        <p className="font-mono text-lg font-bold tabular-nums tracking-tight sm:text-[22px]">
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground/70">{sub}</p>
      </div>
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
          tone === "default" && "bg-gradient-to-br from-primary/12 to-violet-500/8 text-primary ring-primary/15",
          tone === "success" && "bg-emerald-500/12 text-emerald-600 ring-emerald-500/18 dark:text-emerald-400",
          tone === "warning" && "bg-amber-500/12 text-amber-600 ring-amber-500/18 dark:text-amber-400",
          tone === "danger" && "bg-destructive/12 text-destructive ring-destructive/18",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}
