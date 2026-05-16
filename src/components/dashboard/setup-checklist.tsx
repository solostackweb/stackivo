"use client";

/**
 * Dashboard setup checklist.
 *
 * Surfaces the three setup tasks that used to gate onboarding
 * (invoice preferences, signature, first client) as a friendly,
 * dismissable card on the dashboard home. Each item has its own
 * deep-link to the relevant settings / dashboard area.
 *
 * The card:
 *   - Auto-hides when all three items are done.
 *   - Can be dismissed via the X button (localStorage flag).
 *   - "Invoice preferences" has no robust DB signal, so it&rsquo;s
 *     marked done when the user clicks through to settings/invoice
 *     (we set a `visited` localStorage flag).
 */

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  FileText,
  PenLine,
  UserPlus,
  X,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const DISMISS_KEY = "stackivo:dashboard:setup_checklist_dismissed";
const INVOICE_VISITED_KEY = "stackivo:dashboard:invoice_prefs_visited";

interface Props {
  /** True when the user already has a saved signature (any type). */
  hasSignature: boolean;
  /** True when the user has created at least one client. */
  hasClient: boolean;
}

export function DashboardSetupChecklist({ hasSignature, hasClient }: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [invoiceVisited, setInvoiceVisited] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
      setInvoiceVisited(localStorage.getItem(INVOICE_VISITED_KEY) === "1");
    } catch {
      // ignore — localStorage unavailable
    }
  }, []);

  const onDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const markInvoiceVisited = () => {
    setInvoiceVisited(true);
    try {
      localStorage.setItem(INVOICE_VISITED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // Defer rendering until after hydration so the server-rendered HTML
  // and client state line up.
  if (!mounted) return null;
  if (dismissed) return null;

  const items: Array<{
    label: string;
    description: string;
    href: string;
    icon: React.ReactNode;
    done: boolean;
    onClick?: () => void;
  }> = [
    {
      label: "Set your invoice defaults",
      description:
        "Prefix, default due days, and footer notes — used on every invoice you send.",
      href: "/dashboard/settings/invoice",
      icon: <FileText className="h-4 w-4" />,
      done: invoiceVisited,
      onClick: markInvoiceVisited,
    },
    {
      label: "Add your signature",
      description:
        "Draw, type, or upload — appears on every PDF and contract.",
      href: "/dashboard/settings/branding",
      icon: <PenLine className="h-4 w-4" />,
      done: hasSignature,
    },
    {
      label: "Add your first client",
      description:
        "Once a client is on file, every workflow gets faster — invoices, contracts, time, all auto-link.",
      href: "/dashboard/clients/new",
      icon: <UserPlus className="h-4 w-4" />,
      done: hasClient,
    },
  ];

  const remaining = items.filter((i) => !i.done).length;
  // All complete — hide silently.
  if (remaining === 0) return null;

  const total = items.length;
  const done = total - remaining;
  const percent = Math.round((done / total) * 100);

  return (
    <Card className="relative overflow-hidden p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
      />
      <button
        type="button"
        aria-label="Dismiss setup checklist"
        onClick={onDismiss}
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Finish setting up
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {done} / {total}
          </span>
        </div>
        <h3 className="mt-1 text-base font-semibold tracking-tight">
          {remaining === 1
            ? "One more thing and you're fully set up."
            : `${remaining} quick things to wrap up your setup.`}
        </h3>

        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="mt-5 space-y-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={item.onClick}
                aria-disabled={item.done}
                className={`group flex items-start gap-3 rounded-lg border bg-background/60 p-3 transition hover:border-primary/40 hover:bg-background ${
                  item.done ? "opacity-60" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center ${
                    item.done ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      item.done ? "line-through" : ""
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                {!item.done ? (
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition group-hover:text-foreground">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
