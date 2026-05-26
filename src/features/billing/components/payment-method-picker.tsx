"use client";

/**
 * Payment method picker — redesigned.
 *
 * Layout: method selector strip (3 cards) → single form panel below.
 * No duplicate forms. Clean whitespace. Progressive disclosure.
 */

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Zap,
  Smartphone,
  ShieldCheck,
  CircleCheckBig,
  CircleAlert,
  IndianRupee,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  setBankPaymentMethodAction,
  setUpiManualMethodAction,
  setFeePassthroughAction,
  clearPaymentMethodAction,
  type ActionResult,
} from "../actions-payment-methods";
import type { PaymentMethodSummary } from "../payment-methods";

type MethodId = "stackivo_managed" | "upi_smart" | "upi_manual";

interface Props {
  summary: PaymentMethodSummary;
  initialBank?: { accountHolderName: string | null; ifsc: string | null };
  initialUpiVpa: string | null;
}

// ─── method metadata ────────────────────────────────────────────────────────

const METHODS: {
  id: MethodId;
  icon: React.ReactNode;
  title: string;
  tag: string;
  tagColor: string;
  description: string;
  fee: string;
  feeColor: string;
  locked?: boolean;
  lockedReason?: string;
}[] = [
  {
    id: "stackivo_managed",
    icon: <CreditCard className="h-5 w-5" />,
    title: "Route Checkout",
    tag: "Recommended",
    tagColor:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    description: "Cards, UPI, net banking & international payments.",
    fee: "~2–3% fee",
    feeColor: "text-slate-500",
  },
  {
    id: "upi_manual",
    icon: <Smartphone className="h-5 w-5" />,
    title: "UPI Direct",
    tag: "Zero fee",
    tagColor:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    description: "Client pays your UPI directly. You confirm manually.",
    fee: "Free",
    feeColor: "text-emerald-600 dark:text-emerald-400 font-medium",
  },
  {
    id: "upi_smart",
    icon: <Zap className="h-5 w-5" />,
    title: "Smart Collect",
    tag: "Coming soon",
    tagColor:
      "bg-muted text-muted-foreground border border-border",
    description: "Auto virtual UPI per invoice. Marks paid instantly.",
    fee: "~1.77% fee",
    feeColor: "text-slate-500",
    locked: true,
    lockedReason: "Requires Proprietorship or Company account on Razorpay.",
  },
];

// ─── root ────────────────────────────────────────────────────────────────────

export function PaymentMethodPicker({ summary, initialBank, initialUpiVpa }: Props) {
  const [selected, setSelected] = React.useState<MethodId | null>(
    summary.type ?? null,
  );

  return (
    <div className="space-y-4">
      {/* active banner */}
      {summary.type && <ActiveBanner summary={summary} />}

      {/* method selector */}
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          {summary.type ? "Switch payment method" : "Choose a payment method"}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METHODS.map((m) => (
            <MethodCard
              key={m.id}
              method={m}
              isActive={summary.type === m.id}
              isSelected={selected === m.id}
              onSelect={() => !m.locked && setSelected(m.id)}
            />
          ))}
        </div>
      </div>

      {/* form panel — never shown for locked methods */}
      {selected && !METHODS.find((m) => m.id === selected)?.locked && (
        <FormPanel
          selected={selected}
          summary={summary}
          initialBank={initialBank}
          initialUpiVpa={initialUpiVpa}
        />
      )}

      {/* fee passthrough */}
      {(summary.type === "stackivo_managed" || summary.type === "upi_smart") && (
        <FeePassthroughRow summary={summary} />
      )}
    </div>
  );
}

// ─── active banner ────────────────────────────────────────────────────────────

function ActiveBanner({ summary }: { summary: PaymentMethodSummary }) {
  const [pending, start] = React.useTransition();
  const confirm = useConfirm();

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

  const verified =
    (summary.type === "stackivo_managed" || summary.type === "upi_smart") &&
    summary.routeRegistered;

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">{label}</p>
          {detail && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {detail}
            </p>
          )}
        </div>
        {verified && (
          <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 sm:flex">
            <ShieldCheck className="h-3 w-3" />
            Razorpay verified
          </span>
        )}
        {(summary.type === "stackivo_managed" || summary.type === "upi_smart") &&
          !verified && (
            <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400 sm:flex">
              <CircleAlert className="h-3 w-3" />
              Registration pending
            </span>
          )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 text-xs text-muted-foreground"
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
    </div>
  );
}

// ─── method card (selector) ──────────────────────────────────────────────────

function MethodCard({
  method,
  isActive,
  isSelected,
  onSelect,
}: {
  method: (typeof METHODS)[number];
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const highlighted = isSelected || isActive;
  const locked = method.locked;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      className={[
        "group relative flex w-full flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-150",
        locked
          ? "cursor-not-allowed border-border/50 bg-muted/20 opacity-60"
          : highlighted
            ? "border-primary/40 bg-primary/[0.03] ring-1 ring-primary/20"
            : "border-border bg-card hover:border-border/80 hover:bg-muted/30",
      ].join(" ")}
    >
      {/* top row: icon + badges */}
      <div className="flex w-full items-start justify-between gap-2">
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            locked
              ? "bg-muted text-muted-foreground/50"
              : highlighted
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-muted/80",
          ].join(" ")}
        >
          {method.icon}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {isActive && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              Active
            </span>
          )}
          {method.tag && !isActive && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${method.tagColor}`}>
              {method.tag}
            </span>
          )}
          {locked && (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
        </div>
      </div>

      {/* title + description */}
      <div>
        <p className="text-sm font-semibold leading-none">{method.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {locked ? method.lockedReason : method.description}
        </p>
      </div>

      {/* fee */}
      <div className="flex items-center gap-1">
        <IndianRupee className="h-3 w-3 text-muted-foreground" />
        <span className={`text-xs ${method.feeColor}`}>{method.fee}</span>
      </div>

      {/* selected indicator */}
      {isSelected && !locked && (
        <span className="absolute right-3 top-3">
          <CircleCheckBig className="h-4 w-4 text-primary" />
        </span>
      )}
    </button>
  );
}

// ─── form panel ──────────────────────────────────────────────────────────────

function FormPanel({
  selected,
  summary,
  initialBank,
  initialUpiVpa,
}: {
  selected: MethodId;
  summary: PaymentMethodSummary;
  initialBank: Props["initialBank"];
  initialUpiVpa: string | null;
}) {
  const isBankMethod =
    selected === "stackivo_managed" || selected === "upi_smart";

  return (
    <div className="rounded-xl border bg-card">
      {/* panel header */}
      <div className="border-b px-5 py-4">
        <p className="text-sm font-semibold">
          {isBankMethod ? "Bank account details" : "UPI ID"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isBankMethod
            ? "Your IFSC is verified live. PAN is stored for Razorpay compliance."
            : "Clients will see a QR code on every invoice. Confirm each payment manually."}
        </p>
      </div>

      <div className="px-5 py-5">
        {isBankMethod ? (
          <BankForm
            methodType={selected as "stackivo_managed" | "upi_smart"}
            summary={summary}
            initial={initialBank}
          />
        ) : (
          <UpiForm initialVpa={initialUpiVpa} maskedVpa={summary.upiVpaMasked} />
        )}
      </div>
    </div>
  );
}

// ─── bank form ───────────────────────────────────────────────────────────────

function BankForm({
  methodType,
  summary,
  initial,
}: {
  methodType: "stackivo_managed" | "upi_smart";
  summary: PaymentMethodSummary;
  initial: Props["initialBank"];
}) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    setBankPaymentMethodAction,
    undefined,
  );

  const isActive = summary.type === methodType;
  const routeOk = isActive && summary.routeRegistered;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="methodType" value={methodType} />

      {/* registration status */}
      {routeOk && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Bank account verified with Razorpay
        </div>
      )}

      {/* name */}
      <Field label="Account holder name" htmlFor="b-name">
        <Input
          id="b-name"
          name="accountHolderName"
          placeholder="As it appears on your bank statement"
          defaultValue={initial?.accountHolderName ?? ""}
          required
          autoComplete="name"
        />
      </Field>

      {/* account number */}
      <Field
        label="Bank account number"
        htmlFor="b-acct"
        hint={
          isActive && summary.bankAccountLast4
            ? `Currently on file: ••••${summary.bankAccountLast4}. Re-enter to update.`
            : undefined
        }
      >
        <Input
          id="b-acct"
          name="bankAccountNumber"
          placeholder="Enter your bank account number"
          required
          autoComplete="off"
          inputMode="numeric"
          className="font-mono tracking-wide"
        />
      </Field>

      {/* IFSC + PAN side by side */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="IFSC code" htmlFor="b-ifsc">
          <Input
            id="b-ifsc"
            name="ifsc"
            placeholder="e.g. HDFC0001234"
            defaultValue={initial?.ifsc ?? ""}
            required
            maxLength={11}
            className="font-mono uppercase tracking-widest"
            style={{ textTransform: "uppercase" }}
          />
        </Field>
        <Field label="PAN" htmlFor="b-pan">
          <Input
            id="b-pan"
            name="pan"
            placeholder="e.g. ABCDE1234F"
            required
            maxLength={10}
            className="font-mono uppercase tracking-widest"
            style={{ textTransform: "uppercase" }}
            autoComplete="off"
          />
        </Field>
      </div>

      {/* hint row */}
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        IFSC is verified against Razorpay&apos;s bank directory. Account number
        is never displayed in full after saving.
      </p>

      {/* feedback */}
      {state && !state.ok && <FormError error={state.error} />}
      {state?.ok && <FormSuccess message={state.message} />}

      {/* submit */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <BankSubmit isActive={isActive} />
      </div>
    </form>
  );
}

function BankSubmit({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      {pending ? (
        "Verifying & saving…"
      ) : isActive ? (
        "Update details"
      ) : (
        <>
          Enable <ArrowRight className="h-3.5 w-3.5" />
        </>
      )}
    </Button>
  );
}

// ─── upi form ────────────────────────────────────────────────────────────────

function UpiForm({
  initialVpa,
  maskedVpa,
}: {
  initialVpa: string | null;
  maskedVpa: string | null;
}) {
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    setUpiManualMethodAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-5">
      <Field
        label="UPI ID"
        htmlFor="u-vpa"
        hint={
          maskedVpa && !initialVpa
            ? `Currently: ${maskedVpa}. Re-enter to update.`
            : undefined
        }
      >
        <Input
          id="u-vpa"
          name="vpa"
          placeholder="yourname@okhdfcbank"
          defaultValue={initialVpa ?? ""}
          required
          autoComplete="off"
        />
      </Field>

      {state && !state.ok && <FormError error={state.error} />}
      {state?.ok && <FormSuccess message={state.message} />}

      <div className="flex justify-end pt-1">
        <UpiSubmit />
      </div>
    </form>
  );
}

function UpiSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      {pending ? (
        "Saving…"
      ) : (
        <>
          Enable <ArrowRight className="h-3.5 w-3.5" />
        </>
      )}
    </Button>
  );
}

// ─── fee passthrough row ─────────────────────────────────────────────────────

function FeePassthroughRow({ summary }: { summary: PaymentMethodSummary }) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState<ActionResult | undefined, FormData>(
    setFeePassthroughAction,
    undefined,
  );

  const defaultPercent =
    summary.feePassthrough.percent ??
    (summary.type === "upi_smart" ? 1.77 : 2.0);

  return (
    <div className="rounded-xl border bg-card">
      {/* collapsed row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <IndianRupee className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Transaction fee passthrough</p>
            <p className="text-xs text-muted-foreground">
              {summary.feePassthrough.enabled
                ? `Passing ${summary.feePassthrough.percent ?? defaultPercent}% fee to client`
                : "You absorb the Razorpay fee"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              summary.feePassthrough.enabled
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {summary.feePassthrough.enabled ? "On" : "Off"}
          </span>
          <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* expanded form */}
      {open && (
        <div className="border-t px-5 pb-5 pt-4">
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            When <strong>on</strong>, Razorpay&apos;s fee appears as a separate
            line item charged to the client. When <strong>off</strong>, it comes
            out of what you receive.
          </p>
          <form action={action} className="space-y-4">
            {/* toggle */}
            <div className="flex gap-6">
              {[
                { value: "true", label: "Pass fee to client" },
                { value: "false", label: "I absorb the fee" },
              ].map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="enabled"
                    value={value}
                    defaultChecked={
                      value === "true"
                        ? summary.feePassthrough.enabled
                        : !summary.feePassthrough.enabled
                    }
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* rate */}
            <div className="flex items-end gap-3">
              <Field label="Fee rate (%)" htmlFor="fp-pct" className="w-28">
                <Input
                  id="fp-pct"
                  name="percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  defaultValue={defaultPercent}
                />
              </Field>
              <p className="mb-[3px] text-xs text-muted-foreground">
                Razorpay charges{" "}
                {summary.type === "upi_smart" ? "~1.77%" : "~2%"} + 18% GST.
                Suggested:{" "}
                <span className="font-medium text-foreground">
                  {summary.type === "upi_smart" ? "2.09%" : "2.36%"}
                </span>{" "}
                to fully cover it.
              </p>
            </div>

            {state && !state.ok && <FormError error={state.error} />}
            {state?.ok && <FormSuccess message={state.message} />}

            <div className="flex justify-end">
              <FeeSubmit />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FeeSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

// ─── shared primitives ───────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FormError({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      <p className="text-xs text-destructive">{error}</p>
    </div>
  );
}

function FormSuccess({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950">
      <CircleCheckBig className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <p className="text-xs text-emerald-700 dark:text-emerald-400">
        {message ?? "Saved."}
      </p>
    </div>
  );
}
