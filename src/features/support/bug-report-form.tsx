"use client";

/**
 * Bug-report / contact form rendered on `/help`.
 *
 * Client component because we want optimistic state + per-field error
 * surfacing; submission goes through the `submitBugReportAction()`
 * server action, which writes to Zoho Desk (or falls back to email).
 */

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { submitBugReportAction } from "./actions";
import type { SupportCategory } from "./types";
import { useTrack } from "@/lib/analytics/track";

const CATEGORY_OPTIONS: Array<{ value: SupportCategory; label: string; hint: string }> = [
  { value: "bug", label: "Bug / something is broken", hint: "Crashes, errors, broken behaviour" },
  { value: "billing", label: "Billing / payments", hint: "Refunds, double charges, invoices" },
  { value: "account", label: "Account / login", hint: "Can't sign in, MFA, account access" },
  { value: "how-to", label: "How do I…?", hint: "I can't figure out how to do X" },
  { value: "feature-request", label: "Feature request", hint: "I wish Stackivo could…" },
  { value: "onboarding", label: "Getting started", hint: "Stuck on first-day setup" },
];

interface Props {
  /** Defaults email field for logged-out users. */
  initialEmail?: string;
  /** When true, the email input is shown (logged-out flow). */
  showEmail?: boolean;
}

export function BugReportForm({ initialEmail, showEmail }: Props) {
  const pathname = usePathname();
  const track = useTrack();
  const [category, setCategory] = React.useState<SupportCategory>("bug");
  const [summary, setSummary] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [email, setEmail] = React.useState(initialEmail ?? "");
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState<{
    via: "zoho_desk" | "email_fallback";
  } | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (summary.trim().length < 5) {
      toast.error("Please write at least 5 characters in the summary.");
      return;
    }
    if (details.trim().length < 10) {
      toast.error("Please add at least 10 characters of detail.");
      return;
    }
    setPending(true);
    const res = await submitBugReportAction({
      category,
      summary: summary.trim(),
      details: details.trim(),
      page: pathname,
      ...(showEmail ? { email: email.trim() } : {}),
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not submit. Please email support@stackivo.me.");
      return;
    }
    setSuccess({ via: res.via ?? "email_fallback" });
    setSummary("");
    setDetails("");
    track("marketing.contact.submitted", {
      category,
      via: res.via ?? "email_fallback",
      page: pathname ?? "",
    });
  };

  if (success) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
        <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">
          Got it — thanks
        </h3>
        <p className="mt-1 text-muted-foreground">
          {success.via === "zoho_desk"
            ? "We've created a ticket and sent you a confirmation email. The founder usually replies within a few hours during waking hours (IST)."
            : "We've forwarded your report to the support inbox. The founder usually replies within a few hours during waking hours (IST)."}
        </p>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="mt-3 text-xs font-medium text-emerald-700 underline hover:opacity-80 dark:text-emerald-300"
        >
          Send another report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What&apos;s this about?
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-xs transition hover:border-foreground/30 ${
                category === opt.value
                  ? "border-foreground bg-muted/30"
                  : "border-border"
              }`}
            >
              <input
                type="radio"
                name="category"
                value={opt.value}
                checked={category === opt.value}
                onChange={() => setCategory(opt.value)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {showEmail ? (
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Your email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="block h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label
          htmlFor="summary"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          One-line summary
        </label>
        <input
          id="summary"
          type="text"
          required
          maxLength={250}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="e.g. Razorpay checkout shows blank page"
          className="block h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="details"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          What happened? What did you expect?
        </label>
        <textarea
          id="details"
          required
          maxLength={5_000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={6}
          placeholder="Steps to reproduce, what went wrong, any error message…"
          className="block w-full rounded-md border bg-background p-3 text-sm"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Plain text — screenshots can follow up by email.</span>
          <span>{details.length} / 5000</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-4 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {pending ? "Sending…" : "Send to support"}
      </button>
    </form>
  );
}
