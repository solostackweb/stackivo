"use client";

/**
 * Three-option payment-method picker (updated 0034).
 *
 * Methods offered:
 *
 *   1. Route Checkout  (stackivo_managed)
 *      Client pays via Razorpay Checkout — cards, UPI, net banking,
 *      international. ~2-3% Razorpay fee. Payout to freelancer bank T+2.
 *
 *   2. Smart Collect UPI  (upi_smart)
 *      Per-invoice virtual UPI VPA; invoice auto-marks paid on payment.
 *      Indian UPI only. ~1.77% Razorpay fee. Payout T+2.
 *
 *   3. UPI Direct  (upi_manual)
 *      Client pays freelancer's UPI directly. Zero fee. Freelancer confirms
 *      each payment manually.
 *
 * Both 1 and 2 share the same bank-account form and Razorpay registration.
 * The `methodType` hidden field switches which invoice presentation is used.
 */

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
  CreditCard,
  QrCode,
  Smartphone,
  ShieldCheck,
  CircleCheckBig,
  CircleAlert,
  Zap,
  Building2,
  ChevronDown,
  ChevronUp,
  IndianRupee,
} from "lucide-react";
import {
  setBankPaymentMethodAction,
  setUpiManualMethodAction,
  setFeePassthroughAction,
  clearPaymentMethodAction,
  type ActionResult,
} from "../actions-payment-methods";
import type { PaymentMethodSummary } from "../payment-methods";

interface Props {
  summary: PaymentMethodSummary;
  /** Pre-fill for bank form (non-sensitive fields only). */
  initialBank?: {
    accountHolderName: string | null;
    ifsc: string | null;
  };
  initialUpiVpa: string | null;
}

export function PaymentMethodPicker({
  summary,
  initialBank,
  initialUpiVpa,
}: Props) {
  return (
    <div className="space-y-6">
      <StatusStrip summary={summary} />

      <div className="grid gap-4 lg:grid-cols-3">
        <BankCard
          methodType="stackivo_managed"
          active={summary.type === "stackivo_managed"}
          initial={initialBank}
          summary={summary}
          title="Route Checkout"
          description="Cards, UPI, net banking & international. Invoice auto-marks paid."
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          feeNote="~2–3% Razorpay fee"
          badge={null}
        />
        <BankCard
          methodType="upi_smart"
          active={summary.type === "upi_smart"}
          initial={initialBank}
          summary={summary}
          title="Smart Collect UPI"
          description="Auto-generated UPI per invoice. Invoice auto-marks paid on payment."
          icon={<Zap className="h-4 w-4 text-muted-foreground" />}
          feeNote="~1.77% Razorpay fee"
          badge="Recommended"
        />
        <UpiManualCard
          active={summary.type === "upi_manual"}
          initialVpa={initialUpiVpa}
          maskedVpa={summary.upiVpaMasked}
        />
      </div>

      {(summary.type === "stackivo_managed" || summary.type === "upi_smart") && (
        <FeePassthroughPanel summary={summary} />
      )}
    </div>
  );
}

// --- Status strip -----------------------------------------------------------

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

  const label =
    summary.type === "stackivo_managed"
      ? "Route Checkout"
      : summary.type === "upi_smart"
        ? "Smart Collect UPI"
        : "UPI Direct";

  const detail =
    summary.type === "stackivo_managed" || summary.type === "upi_smart"
      ? `${summary.bankName ?? "Bank"} ••••${summary.bankAccountLast4}`
      : summary.upiVpaMasked;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
      <div className="flex items-center gap-2.5">
        <CircleCheckBig className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          <span className="font-semibold">{label}</span> active
          {detail ? (
            <>
              {" "}—{" "}
              <span className="font-mono text-muted-foreground">{detail}</span>
            </>
          ) : null}
        </span>
        {(summary.type === "stackivo_managed" || summary.type === "upi_smart") &&
          !summary.routeRegistered && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              <CircleAlert className="h-3 w-3" />
              Razorpay registration pending
            </span>
          )}
        {(summary.type === "stackivo_managed" || summary.type === "upi_smart") &&
          summary.routeRegistered && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Razorpay verified
            </span>
          )}
      </div>
      <ClearMethodButton />
    </div>
  );
}

function ClearMethodButton() {
  const [pending, start] = React.useTransition();
  const confirm = useConfirm();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: "Turn off online payments?",
          description:
            "Clients won't be able to pay invoices online until you re-enable a method.",
          confirmLabel: "Turn off",
          variant: "destructive",
        });
        if (!ok) return;
        start(async () => {
          await clearPaymentMethodAction();
        });
      }}
    >
      {pending ? "Turning off…" : "Turn off"}
    </Button>
  );
}

// --- Shared bank-account card (Route Checkout + Smart Collect) -------------

function BankCard({
  methodType,
  active,
  initial,
  summary,
  title,
  description,
  icon,
  feeNote,
  badge,
}: {
  methodType: "stackivo_managed" | "upi_smart";
  active: boolean;
  initial?: Props["initialBank"];
  summary: PaymentMethodSummary;
  title: string;
  description: string;
  icon: React.ReactNode;
  feeNote: string;
  badge: string | null;
}) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    setBankPaymentMethodAction,
    undefined,
  );

  const routeOk = active && summary.routeRegistered;
  const routePending = active && !summary.routeRegistered;

  return (
    <Card
      className={
        active
          ? "border-primary/30 bg-primary/[0.02]"
          : badge
            ? "border-emerald-500/20 bg-emerald-500/[0.02]"
            : ""
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {badge && !active ? (
              <Badge
                variant="secondary"
                className="bg-emerald-500/15 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
              >
                {badge}
              </Badge>
            ) : null}
            {active ? <ActiveBadge /> : null}
          </div>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <IndianRupee className="h-3 w-3" />
          {feeNote}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Razorpay registration status badge when active */}
        {routeOk && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Bank verified with Razorpay
          </div>
        )}
        {routePending && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            Re-save to complete Razorpay registration
          </div>
        )}

        <form action={action} className="space-y-3">
          {/* Hidden: tells server action which invoice UI to use */}
          <input type="hidden" name="methodType" value={methodType} />

          <div className="space-y-1.5">
            <Label htmlFor={`${methodType}-name`} className="text-xs">
              Account holder name
            </Label>
            <Input
              id={`${methodType}-name`}
              name="accountHolderName"
              placeholder="As it appears on your bank account"
              defaultValue={initial?.accountHolderName ?? ""}
              required
              className="h-8 text-sm"
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${methodType}-account`} className="text-xs">
              Bank account number
            </Label>
            <Input
              id={`${methodType}-account`}
              name="bankAccountNumber"
              placeholder={
                summary.bankAccountLast4 && active
                  ? `Currently ••••${summary.bankAccountLast4} — re-enter to update`
                  : "000000000000"
              }
              required
              autoComplete="off"
              inputMode="numeric"
              className="h-8 font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${methodType}-ifsc`} className="text-xs">
                IFSC code
              </Label>
              <Input
                id={`${methodType}-ifsc`}
                name="ifsc"
                placeholder="HDFC0001234"
                defaultValue={initial?.ifsc ?? ""}
                required
                maxLength={11}
                className="h-8 font-mono text-sm uppercase"
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${methodType}-pan`} className="text-xs">
                PAN
              </Label>
              <Input
                id={`${methodType}-pan`}
                name="pan"
                placeholder="ABCDE1234F"
                required
                maxLength={10}
                className="h-8 font-mono text-sm uppercase"
                style={{ textTransform: "uppercase" }}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3 w-3 align-text-top" />
            IFSC is verified against Razorpay&apos;s bank directory. PAN is
            stored for Razorpay compliance. Bank account number is never shown
            in full after saving.
          </div>

          {state && !state.ok && (
            <FieldError
              error={state.error}
              field={"field" in state ? state.field : undefined}
            />
          )}
          {state?.ok && (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              {state.message}
            </p>
          )}

          <div className="flex justify-end">
            <BankSubmitButton active={active} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BankSubmitButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving & verifying…" : active ? "Update details" : "Enable"}
    </Button>
  );
}

// --- UPI Manual card -------------------------------------------------------

function UpiManualCard({
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
    <Card className={active ? "border-primary/30 bg-primary/[0.02]" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">UPI Direct</CardTitle>
          </div>
          {active ? <ActiveBadge /> : null}
        </div>
        <CardDescription className="text-xs">
          Client pays to your UPI ID directly. Free, instant, India only.
          You confirm each payment manually.
        </CardDescription>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <IndianRupee className="h-3 w-3" />
          Zero fee
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <form action={action} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="u-vpa" className="text-xs">
              UPI ID
            </Label>
            <Input
              id="u-vpa"
              name="vpa"
              placeholder="yourname@okhdfcbank"
              defaultValue={initialVpa ?? ""}
              required
              autoComplete="off"
              className="h-8 text-sm"
            />
            {maskedVpa && !initialVpa && (
              <p className="text-[11px] text-muted-foreground">
                Currently: {maskedVpa}. Re-enter to update.
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <QrCode className="mr-1 inline h-3 w-3 align-text-top" />
            Clients see a QR code on every invoice. Once you spot the transfer
            in your bank, mark the invoice paid — Stackivo generates the
            receipt automatically.
          </div>

          {state && !state.ok && (
            <FieldError error={state.error} />
          )}
          {state?.ok && (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              {state.message}
            </p>
          )}

          <div className="flex justify-end">
            <UpiSubmitButton active={active} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UpiSubmitButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : active ? "Update UPI ID" : "Enable"}
    </Button>
  );
}

// --- Fee passthrough panel -------------------------------------------------

function FeePassthroughPanel({ summary }: { summary: PaymentMethodSummary }) {
  const [expanded, setExpanded] = React.useState(false);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    setFeePassthroughAction,
    undefined,
  );

  const defaultPercent =
    summary.feePassthrough.percent ??
    (summary.type === "upi_smart" ? 1.77 : 2.0);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Transaction fee passthrough</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              summary.feePassthrough.enabled
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {summary.feePassthrough.enabled ? "On" : "Off"}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-muted-foreground">
            When enabled, the Razorpay transaction fee appears as a separate
            line item on the invoice, charged to the client. When off, you
            absorb the fee from what you receive.
          </p>
          <form action={action} className="space-y-3">
            <div className="flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="enabled"
                  value="true"
                  defaultChecked={summary.feePassthrough.enabled}
                  className="accent-primary"
                />
                Pass fee to client
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="enabled"
                  value="false"
                  defaultChecked={!summary.feePassthrough.enabled}
                  className="accent-primary"
                />
                I absorb the fee
              </label>
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fee rate (%)</Label>
                <Input
                  name="percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  defaultValue={defaultPercent}
                  className="h-8 w-24 text-sm"
                />
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Razorpay charges{" "}
                {summary.type === "upi_smart" ? "~1.77%" : "~2%"} + 18% GST.
                Suggested:{" "}
                {summary.type === "upi_smart" ? "2.09%" : "2.36%"} to cover GST.
              </p>
            </div>

            {state && !state.ok && (
              <p className="text-xs text-destructive">{state.error}</p>
            )}
            {state?.ok && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {state.message}
              </p>
            )}

            <div className="flex justify-end">
              <FeeSubmitButton />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FeeSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? "Saving…" : "Save fee settings"}
    </Button>
  );
}

// --- Shared helpers --------------------------------------------------------

function ActiveBadge() {
  return (
    <Badge className="shrink-0 bg-emerald-500/15 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">
      <CircleCheckBig className="mr-1 h-2.5 w-2.5" />
      Active
    </Badge>
  );
}

function FieldError({
  error,
  field,
}: {
  error: string;
  field?: string;
}) {
  return (
    <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-3 py-2">
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      <p className="text-xs text-destructive">
        {field ? <span className="font-medium capitalize">{field}: </span> : null}
        {error}
      </p>
    </div>
  );
}
