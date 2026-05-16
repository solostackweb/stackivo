"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshSubscriptionAction } from "../actions";

export function SyncBillingButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await refreshSubscriptionAction();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Billing status synced");
          router.refresh();
        });
      }}
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      Sync status
    </Button>
  );
}
