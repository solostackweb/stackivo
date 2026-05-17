"use client";

/**
 * Two-option payment-method picker.
 *
 * Replaces the legacy `PaymentsConnectForm` (which asked freelancers to
 * paste a Razorpay key id + secret — that approach is gone).
 *
 * Layout:
 *   - Header strip showing the currently-active method (or "none yet").
 *   - Two side-by-side cards. UPI carries the "Recommended" badge.
 *   - Each card holds its own form; submitting one switches the active
 *     method to that one.
 *
 * No client-side payment SDKs run here — this is purely a settings form.
 */

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  QrCode,
  ShieldCheck,
  Sparkles,
  CircleCheckBig,
} from "lucide-react";
import {
  setManagedPaymentMethodAction,
  setUpiManualMethodAction,
  clearPaymentMethodAction,
  type ActionResult,
} from "../actions-payment-methods";
import type { PaymentMethodSummary } from "../payment-methods";

interface Props {
  summary: PaymentMethodSummary;
  /** Pre-fill for the bank form when re-opening with managed already set. */
  initialManaged?: {
    accountHolderName: string | null;
    bankName: string | null;
    ifsc: string | null;
  };
  initialUpiVpa: string | null;
}

export function PaymentMethodPicker({
  summary,
  initialManaged,
  initialUpiVpa,
}: Props) {
  return (
    <div className="space-y-6">
      <StatusStrip summary={summary} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ManagedCard
          active={summary.type === "stackivo_managed"}
          initial={initialManaged}
          last4={summary.bankAccountLast4}
          bankName={summary.bankName}
        />
        <UpiCard
          active={summary.type === "upi_manual"}
          initialVpa={initialUpiVpa}
          maskedVpa={summary.upiVpaMasked}
        />
      </div>
    </div>
  );
}

// --- Status strip ----------------------------------------------------------

function StatusStrip({ summary }: { summary: PaymentMethodSummary }) {
  if (!summary.type) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm">
        <span className="font-medium">No payment method set up yet.</span>{" "}
        <span className="text-muted-foreground">
          Pick one of the options below to start accepting invoice payments.
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <CircleCheckBig className="h-4 w-4 text-emerald-600" />
        {summary.type === "stackivo_managed" ? (
          <span>
            <span className="font-medium">Stackivo Managed</span> active —
            payouts to {summary.bankName ?? "your bank"} ending{" "}
            <span className="font-mono">•••• {summary.bankAccountLast4}</span>
          </span>
        ) : (
          <span>
            <span className="font-medium">UPI</span> active —{" "}
            <span className="font-mono">{summary.upiVpaMasked}</span>
          </span>
        )}
      </div>
      <ClearMethodButton />
    </div>
  );
}

function ClearMethodButton() {
  const [pending, start] = React.useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Turn off online payments? Clients won't be able to pay invoices through Stackivo until you re-enable a method.",
          )
        ) {
          return;
        }
        start(async () => {
          await clearPaymentMethodAction();
        });
      }}
    >
      {pending ? "Turning off…" : "Turn off"}
    </Button>
  );
}

// --- Managed card ----------------------------------------------------------

function ManagedCard({
  active,
  initial,
  last4,
  bankName,
}: {
  active: boolean;
  initial?: Props["initialManaged"];
  last4: string | null;
  bankName: string | null;
}) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    setManagedPaymentMethodAction,
    undefined,
  );

  return (
    <Card className={active ? "border-primary/30 bg-primary/[0.02]" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Stackivo Managed Payments</CardTitle>
          </div>
          {active ? <ActiveBadge /> : null}
        </div>
        <CardDescription>
          Clients pay through Stackivo. Invoices auto-mark as paid. We pay
          out to your bank within 1-2 business days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-name">Account holder name</Label>
            <Input
              id="m-name"
              name="accountHolderName"
              placeholder="As it appears on your bank account"
              defaultValue={initial?.accountHolderName ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-account">Bank account number</Label>
            <Input
              id="m-account"
              name="bankAccountNumber"
              placeholder={last4 ? `•••• •••• ${last4}` : "0000 0000 0000 00"}
              required
              autoComplete="off"
              inputMode="numeric"
            />
            {last4 ? (
              <p className="text-[11px] text-muted-foreground">
                Currently on file ends in {last4}. Re-enter to update.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-ifsc">IFSC</Label>
              <Input
                id="m-ifsc"
                name="ifsc"
                placeholder="HDFC0001234"
                defaultValue={initial?.ifsc ?? ""}
                required
                maxLength={11}
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-bank">Bank name</Label>
              <Input
                id="m-bank"
                name="bankName"
                placeholder="HDFC Bank"
                defaultValue={initial?.bankName ?? bankName ?? ""}
                required
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 align-text-top" />
            Payments are processed securely through Stackivo. Payouts are
            transferred to your bank account within 1-2 business days.
            Applicable transaction fees may be deducted.
          </div>

          <ResultBanner state={state} />
          <SubmitButton active={active} idleLabel="Use Stackivo Managed" />
        </form>
      </CardContent>
    </Card>
  );
}

// --- UPI card --------------------------------------------------------------

function UpiCard({
  active,
  initialVpa,
  maskedVpa,
}: {
  active: boolean;
  initialVpa: string | null;
  maskedVpa: string | null;
}) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    setUpiManualMethodAction,
    undefined,
  );

  return (
    <Card
      className={
        active
          ? "border-primary/30 bg-primary/[0.02]"
          : "border-amber-500/30 bg-amber-500/[0.03]"
      }
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">UPI Manual Payments</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-amber-500/15 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Recommended
            </Badge>
            {active ? <ActiveBadge /> : null}
          </div>
        </div>
        <CardDescription>
          Clients scan a QR code generated from your UPI ID. Money lands in
          your account instantly. Mark each invoice paid once received.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-vpa">UPI ID</Label>
            <Input
              id="u-vpa"
              name="vpa"
              placeholder="yourname@okhdfcbank"
              defaultValue={initialVpa ?? ""}
              required
              autoComplete="off"
            />
            {maskedVpa && !initialVpa ? (
              <p className="text-[11px] text-muted-foreground">
                Currently on file: {maskedVpa}. Re-enter to update.
              </p>
            ) : null}
          </div>

          <div className="rounded-md border bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Payments are received directly into your UPI account. Since they
            happen outside Stackivo, you confirm each one manually from the
            invoice page — we then generate the client&apos;s receipt.
          </div>

          <ResultBanner state={state} />
          <SubmitButton active={active} idleLabel="Use UPI payments" />
        </form>
      </CardContent>
    </Card>
  );
}

// --- Shared bits -----------------------------------------------------------

function ActiveBadge() {
  return (
    <Badge className="bg-emerald-500/15 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15">
      Active
    </Badge>
  );
}

function ResultBanner({ state }: { state: ActionResult | undefined }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p className="rounded-md bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
        {state.message ?? "Saved."}
      </p>
    );
  }
  return (
    <p className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
      {state.error}
    </p>
  );
}

function SubmitButton({
  active,
  idleLabel,
}: {
  active: boolean;
  idleLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : active ? "Update details" : idleLabel}
      </Button>
    </div>
  );
}
