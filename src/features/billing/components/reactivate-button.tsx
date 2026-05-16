"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reactivateSubscriptionAction } from "../actions";
import type { CheckoutSession } from "../types";

interface Props {
  className?: string;
}

/**
 * Reactivate a cancelled / expired subscription.
 *
 * If the user is mid-period and only flagged `cancel_at_period_end`,
 * we just clear the flag. Otherwise we open a fresh Razorpay checkout
 * for the same plan + cycle.
 */
export function ReactivateButton({ className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const launchCheckout = (session: CheckoutSession) => {
    if (typeof window === "undefined" || !window.Razorpay) {
      if (session.shortUrl) {
        window.location.href = session.shortUrl;
        return;
      }
      toast.error("Checkout failed to load. Please refresh and try again.");
      return;
    }
    const rzp = new window.Razorpay({
      key: session.keyId,
      subscription_id: session.subscriptionId,
      name: "Stackivo",
      description: "Reactivate subscription",
      prefill: session.prefill,
      notes: session.notes,
      theme: { color: "#2563eb" },
      handler: () => {
        toast.success("Welcome back! Reactivating your plan…");
        setTimeout(() => router.refresh(), 1500);
      },
      modal: { ondismiss: () => setLoading(false) },
    });
    rzp.open();
  };

  const onClick = async () => {
    setLoading(true);
    const res = await reactivateSubscriptionAction();
    if (!res.ok) {
      setLoading(false);
      toast.error(res.error);
      return;
    }
    if (res.status === "kept") {
      toast.success("Subscription will continue. Cancellation reverted.");
      setLoading(false);
      router.refresh();
      return;
    }
    launchCheckout(res.checkout);
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <Button
        type="button"
        size="sm"
        className={className}
        disabled={loading}
        onClick={onClick}
      >
        {loading ? "Working…" : "Reactivate subscription"}
      </Button>
    </>
  );
}
