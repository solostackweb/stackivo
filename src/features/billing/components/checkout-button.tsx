"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startCheckoutAction } from "../actions";
import type { BillingCycle, CheckoutSession } from "../types";

interface CheckoutButtonProps {
  plan: "pro" | "business";
  cycle: BillingCycle;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  disabled?: boolean;
}

/**
 * One-click upgrade button.
 *
 * 1. Calls `startCheckoutAction` (server) to create the Razorpay
 *    subscription + Razorpay customer if needed.
 * 2. Opens the Razorpay Checkout popup via the JS SDK.
 * 3. On success, refreshes the page so the new state lands. The webhook
 *    is the source of truth for unlocking features — the on-success
 *    handler just gives instant feedback.
 */
export function CheckoutButton({
  plan,
  cycle,
  label,
  variant = "default",
  size = "default",
  className,
  disabled,
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const launch = React.useCallback(
    (session: CheckoutSession) => {
      if (typeof window === "undefined" || !window.Razorpay) {
        // SDK still loading — fall back to hosted page if available.
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
        description: `${plan === "pro" ? "Pro" : "Business"} · ${cycle === "yearly" ? "Yearly" : "Monthly"}`,
        prefill: session.prefill,
        notes: session.notes,
        theme: { color: "#2563eb" },
        handler: () => {
          toast.success("Payment received. Activating your plan…");
          // Webhook will set status=active. Refresh after a short delay
          // to give it time to land; user will also see the polling state.
          setTimeout(() => router.refresh(), 1500);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.open();
    },
    [plan, cycle, router],
  );

  const onClick = React.useCallback(async () => {
    setLoading(true);
    const result = await startCheckoutAction({ plan, cycle });
    if (!result.ok) {
      setLoading(false);
      toast.error(result.error);
      return;
    }
    launch(result.data);
  }, [plan, cycle, launch]);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || loading}
        onClick={onClick}
      >
        {loading
          ? "Opening checkout…"
          : label ?? `Upgrade to ${plan === "pro" ? "Pro" : "Business"}`}
      </Button>
    </>
  );
}
