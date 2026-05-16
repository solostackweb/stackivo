"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelSubscriptionAction } from "../actions";
import { env } from "@/config/env";
import { crisp } from "@/features/support/crisp-provider";

interface Props {
  /** Date the user keeps Pro until (current_period_end). */
  cancelsOn: string | null;
  className?: string;
}

/**
 * Cancels at end of current period. Razorpay continues to bill nothing
 * after that date. Customers keep paid features until the period ends.
 */
export function CancelSubscriptionButton({ cancelsOn, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const formattedDate = cancelsOn
    ? new Date(cancelsOn).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const onConfirm = async () => {
    setLoading(true);
    const res = await cancelSubscriptionAction({ immediate: false });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      formattedDate
        ? `Subscription will end on ${formattedDate}.`
        : "Subscription cancelled.",
    );
    setOpen(false);
    router.refresh();
  };

  const chatAvailable = env.crispWebsiteId !== "";

  const onChatFirst = () => {
    crisp.event("cancel_flow_chat_diverted");
    crisp.message(
      "Hi — saw you're on the cancel page. Got 60 seconds? I'm the founder; if there's a feature missing or something not working, I'd love to fix it before you go.",
    );
    crisp.open();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          disabled={loading}
        >
          Cancel subscription
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel your Stackivo subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            {formattedDate
              ? `You'll keep all paid features until ${formattedDate}, then your account will revert to the Free plan. You can reactivate any time.`
              : "Your subscription will end at the close of the current billing period."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {chatAvailable ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
            <div className="font-medium text-emerald-700 dark:text-emerald-300">
              Before you go — got 60 seconds?
            </div>
            <p className="mt-1 text-muted-foreground">
              Stackivo is built by a solo founder. If something&apos;s missing
              or broken, chat with us first — we may fix it on the spot or
              offer a discount.
            </p>
            <button
              type="button"
              onClick={onChatFirst}
              disabled={loading}
              className="mt-2 inline-flex h-7 items-center rounded-md bg-emerald-600 px-3 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Chat with the founder
            </button>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            disabled={loading}
          >
            {loading ? "Cancelling…" : "Cancel at period end"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
