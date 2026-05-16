import * as React from "react";
import { cn } from "@/lib/utils";
import type { ContractStatusRow } from "@/lib/supabase/types";
import { CONTRACT_STATUS_LABEL } from "../status";

const STATUS_STYLES: Record<ContractStatusRow, string> = {
  draft: "bg-muted text-muted-foreground ring-muted-foreground/20",
  sent: "bg-primary/10 text-primary ring-primary/20",
  viewed: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-400",
  signed: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  declined: "bg-destructive/10 text-destructive ring-destructive/20",
  expired: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
};

const STATUS_DOT: Record<ContractStatusRow, string> = {
  draft: "bg-muted-foreground/60",
  sent: "bg-primary",
  viewed: "bg-violet-500",
  signed: "bg-emerald-500",
  declined: "bg-destructive",
  expired: "bg-amber-500",
};

export function ContractStatusBadge({
  status,
  className,
}: {
  status: ContractStatusRow;
  className?: string;
}) {
  const isLive = status === "sent" || status === "viewed";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {isLive ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              STATUS_DOT[status],
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      </span>
      {CONTRACT_STATUS_LABEL[status]}
    </span>
  );
}
