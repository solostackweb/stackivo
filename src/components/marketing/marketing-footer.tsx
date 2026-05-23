import Link from "next/link";
import { Zap } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { MarketingAuthState } from "@/features/marketing/types";
import { NewsletterForm } from "./newsletter-form";

const PRODUCT_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Workflow", href: "/#workflow" },
  { label: "GST invoicing", href: "/#gst" },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
  { label: "Changelog", href: "/changelog" },
];

const TOOLS_LINKS = [
  { label: "Free tools overview", href: "/tools" },
  { label: "Hourly rate calculator", href: "/tools/freelance-rate-calculator" },
  { label: "GST calculator", href: "/tools/gst-calculator" },
  {
    label: "Late-payment calculator",
    href: "/tools/late-payment-interest-calculator",
  },
  { label: "Blog", href: "/blog" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Talk to us", href: "/talk" },
  { label: "Security", href: "/security" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export function MarketingFooter({
  authState,
}: {
  authState: MarketingAuthState;
}) {
  const accountLinks = authState.isAuthenticated
    ? [
        { label: "Dashboard", href: "/dashboard" },
        ...(authState.showUpgradeNudge
          ? [
              {
                label: "Upgrade to Pro",
                href: "/dashboard/settings/billing?upgrade=clients",
              },
            ]
          : []),
      ]
    : [
        { label: "Start free", href: "/signup" },
        { label: "Log in", href: "/login" },
        { label: "Client portal access", href: "/portal-access" },
        { label: "Reset password", href: "/forgot-password" },
      ];

  const columns = [
    { heading: "Product", links: PRODUCT_LINKS },
    { heading: "Free tools", links: TOOLS_LINKS },
    { heading: "Account", links: accountLinks },
    { heading: "Company", links: COMPANY_LINKS },
  ];

  return (
    <footer className="relative border-t bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto w-full max-w-[1400px] px-5 py-14 sm:px-8 sm:py-16 lg:px-10 xl:px-14 2xl:px-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-md shadow-primary/20">
                <Zap className="h-4 w-4" />
              </span>
              <span className="text-base">{siteConfig.name}</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              The freelance workflow built for independent professionals.
              Clients, invoices, contracts, projects — one clean place.
            </p>
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Newsletter
              </p>
              <p className="text-xs text-muted-foreground">
                Monthly: what shipped, what&rsquo;s next, India freelancing tips.
              </p>
              <NewsletterForm
                source="footer"
                ctaLabel="Subscribe"
                successLabel="Subscribed."
                compact
              />
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="space-y-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Built for independent professionals.
          </p>
          <p className="font-medium">Made in India · For the world</p>
        </div>
      </div>
    </footer>
  );
}
