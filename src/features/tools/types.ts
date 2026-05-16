/**
 * Shared types for the free public calculators under `/tools`.
 *
 * Calculators live at marketing-route paths and are intentionally
 * standalone — no auth, no database, pure client-side math. Each
 * one ends with a "Continue inside Stackivo" CTA that funnels into
 * /signup attributed via `data-cta` so PostHog tracks tool → signup
 * conversion.
 */

export interface ToolMeta {
  /** Slug used in the URL: `/tools/<slug>` */
  slug: string;
  /** Title used in the listing card + the page H1. */
  title: string;
  /** Short tagline shown on the listing card and in metadata description. */
  tagline: string;
  /** Optional eyebrow shown above the H1. */
  eyebrow?: string;
  /** Lucide icon name (rendered from a small icon map in the index page). */
  icon: "Calculator" | "FileText" | "Clock";
  /** What real problem this calculator solves, in one sentence. */
  helps: string;
}

export const TOOLS: readonly ToolMeta[] = [
  {
    slug: "freelance-rate-calculator",
    title: "Freelance hourly rate calculator",
    tagline:
      "Reverse-engineer the hourly rate you need from your target take-home income.",
    eyebrow: "Pricing",
    icon: "Calculator",
    helps:
      "Stop guessing your rate. Plug in income, expenses, and realistic billable hours — get the number.",
  },
  {
    slug: "gst-calculator",
    title: "GST calculator (India)",
    tagline:
      "Compute CGST + SGST or IGST split for any invoice amount, inclusive or exclusive.",
    eyebrow: "Tax",
    icon: "FileText",
    helps:
      "Built for Indian freelancers: handles place-of-supply (intra-state vs inter-state) and reverse calculation.",
  },
  {
    slug: "late-payment-interest-calculator",
    title: "Late payment interest calculator",
    tagline:
      "Calculate the interest a client owes on an overdue invoice — per MSME / contract terms.",
    eyebrow: "Recovery",
    icon: "Clock",
    helps:
      "MSMED Act allows 18% p.a. compound interest on overdue payments. Compute exactly what you can claim.",
  },
] as const;

export function getToolMeta(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
