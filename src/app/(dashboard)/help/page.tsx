/**
 * /help — in-app support hub.
 *
 * Three sections:
 *   1. FAQ links (deep links to Zoho Desk help center articles, or to
 *      placeholders if `NEXT_PUBLIC_ZOHO_DESK_HELP_URL` isn't set).
 *   2. Bug-report / contact form (POSTs to Zoho Desk → Brevo fallback).
 *   3. Direct contact methods.
 *
 * Lives inside the (dashboard) route group so the support layer
 * (Crisp + floating button) mounts; users hit it via the floating
 * `<SupportButton/>` "Report a bug" link or directly from the URL.
 */

import type { Metadata } from "next";
import { BookOpen, MessageCircle, Mail } from "lucide-react";
import { env } from "@/config/env";
import { getServerSupabase } from "@/lib/supabase/server";
import { BugReportForm } from "@/features/support/bug-report-form";

export const metadata: Metadata = {
  title: "Help & support",
  description: "Get help, browse articles, or report a bug.",
};

export const dynamic = "force-dynamic";

interface FaqArticle {
  /** URL slug appended to the help-center base, OR a full URL. */
  href: string;
  title: string;
  description: string;
}

const FAQS: FaqArticle[] = [
  {
    href: "/portal/kb/articles/cancel-subscription",
    title: "How do I cancel my subscription?",
    description: "Cancel anytime — keep paid features until period end.",
  },
  {
    href: "/portal/kb/articles/update-payment-method",
    title: "Update my payment method",
    description: "Switch the card / UPI used for renewals.",
  },
  {
    href: "/portal/kb/articles/why-was-i-charged",
    title: "Why was I charged?",
    description: "Understanding your billing cycle and invoices.",
  },
  {
    href: "/portal/kb/articles/gst-invoice",
    title: "Get a GST tax invoice",
    description: "Download a GSTIN-bearing invoice for compliance.",
  },
  {
    href: "/portal/kb/articles/reset-password",
    title: "Reset my password",
    description: "Set a new password via the password-reset flow.",
  },
  {
    href: "/portal/kb/articles/enable-mfa",
    title: "Enable multi-factor authentication",
    description: "Add a TOTP authenticator to your account.",
  },
  {
    href: "/portal/kb/articles/plan-comparison",
    title: "Free vs Pro vs Business",
    description: "Plan limits and which features unlock when.",
  },
  {
    href: "/portal/kb/articles/export-data",
    title: "Export my data",
    description: "Download a JSON bundle of everything you own.",
  },
  {
    href: "/portal/kb/articles/delete-account",
    title: "Delete my account",
    description: "Permanently close your Stackivo account.",
  },
  {
    href: "/portal/kb/articles/email-deliverability",
    title: "I'm not receiving emails",
    description: "Common reasons + how to whitelist Stackivo.",
  },
];

export default async function HelpPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  const helpBase = env.zohoDeskHelpUrl;
  const articles = FAQS.map((a) => ({
    ...a,
    fullHref: helpBase ? `${helpBase}${a.href}` : null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Help &amp; support</h1>
        <p className="text-sm text-muted-foreground">
          Browse help articles, chat with the founder, or send a detailed report.
        </p>
      </header>

      {/* FAQ deep-links */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Common questions
          </h2>
        </div>
        {!helpBase ? (
          <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            The knowledge base isn&apos;t published yet. Use the form below or
            email <code>support@stackivo.me</code> directly — we&apos;ll reply
            within a few hours during waking hours (IST).
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {articles.map((a) => (
              <li key={a.href}>
                <a
                  href={a.fullHref ?? "#"}
                  target={a.fullHref ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="block rounded-md border bg-card p-3 transition hover:border-foreground/30 hover:bg-muted/30"
                >
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.description}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Direct contact */}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {env.crispWebsiteId ? (
          <div className="rounded-md border bg-card p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              Chat now
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Open the chat icon at the bottom-right or press the support
              button at any time. Average reply time: under 2 hours during
              waking hours (IST).
            </p>
          </div>
        ) : null}
        <div className="rounded-md border bg-card p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Mail className="h-4 w-4" />
            Email
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Send a detailed message to{" "}
            <a
              href="mailto:support@stackivo.me"
              className="text-foreground underline hover:opacity-80"
            >
              support@stackivo.me
            </a>
            . Replies come from the same address.
          </p>
        </div>
      </section>

      {/* Bug-report / contact form */}
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Send a detailed report</h2>
        <p className="text-xs text-muted-foreground">
          Best for bugs, feature requests, or anything that needs context. The
          founder reviews every report personally.
        </p>
        <BugReportForm showEmail={!isLoggedIn} initialEmail={user?.email ?? ""} />
      </section>
    </div>
  );
}
