"use client";

/**
 * ThreadStatusBar — inline status / priority controls in the thread header.
 * Renders as a row of select dropdowns + resolve/reopen button.
 */

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import {
  updateThreadStatusAction,
  updateThreadPriorityAction,
  updateThreadCategoryAction,
} from "@/features/support/actions";
import { cn } from "@/lib/utils";
import type { SupportThread, SupportStatus, SupportPriority, SupportCategory } from "@/features/support/types";

interface Props {
  thread: SupportThread;
}

const STATUSES: SupportStatus[] = ["new", "open", "waiting", "resolved", "closed"];
const PRIORITIES: SupportPriority[] = ["low", "normal", "high", "urgent"];
const CATEGORIES: (SupportCategory | "")[] = [
  "", "billing", "bug", "how-to", "feature-request", "account", "onboarding",
];

export function ThreadStatusBar({ thread }: Props) {
  const [pending, setPending] = React.useState<string | null>(null);
  const isResolved = thread.status === "resolved" || thread.status === "closed";

  async function change<T>(key: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(key);
    const res = await fn();
    setPending(null);
    if (res.ok) toast.success("Updated");
    else toast.error(res.error ?? "Update failed");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status select */}
      <select
        value={thread.status}
        disabled={!!pending}
        onChange={(e) =>
          change("status", () =>
            updateThreadStatusAction(thread.id, e.target.value as SupportStatus),
          )
        }
        className="h-7 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Priority select */}
      <select
        value={thread.priority}
        disabled={!!pending}
        onChange={(e) =>
          change("priority", () =>
            updateThreadPriorityAction(thread.id, e.target.value as SupportPriority),
          )
        }
        className="h-7 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Category select */}
      <select
        value={thread.category ?? ""}
        disabled={!!pending}
        onChange={(e) =>
          change("category", () =>
            updateThreadCategoryAction(
              thread.id,
              (e.target.value as SupportCategory) || null,
            ),
          )
        }
        className="h-7 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        <option value="">No category</option>
        {CATEGORIES.filter(Boolean).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Resolve / Reopen */}
      <button
        type="button"
        disabled={!!pending}
        onClick={() =>
          change("resolve", () =>
            updateThreadStatusAction(
              thread.id,
              isResolved ? "open" : "resolved",
            ),
          )
        }
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors disabled:opacity-50",
          isResolved
            ? "border border-border/60 bg-background text-foreground hover:bg-accent"
            : "bg-emerald-600 text-white hover:bg-emerald-700",
        )}
      >
        {pending === "resolve" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isResolved ? (
          <RotateCcw className="h-3.5 w-3.5" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        {isResolved ? "Reopen" : "Resolve"}
      </button>
    </div>
  );
}
