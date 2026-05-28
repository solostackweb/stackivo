"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncCrispConversationsAction } from "@/features/support/actions";

export function CrispSyncButton() {
  const [pending, setPending] = React.useState(false);

  async function handleSync() {
    setPending(true);
    const result = await syncCrispConversationsAction();
    setPending(false);

    if (!result.ok) {
      toast.error(result.error ?? "Crisp sync failed");
      return;
    }

    toast.success(`Synced ${result.data?.count ?? 0} Crisp conversations`);
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={pending}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      Sync Crisp
    </button>
  );
}
