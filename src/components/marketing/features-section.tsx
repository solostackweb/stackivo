"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Clock,
  FileText,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal, StaggerReveal, StaggerItem } from "./motion";
import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Column span on desktop: 1-3 out of 6. */
  span?: 2 | 3;
  /** Row span on desktop — used for the tall featured tiles. */
  rowSpan?: 1 | 2;
  /** Optional visual accent for the hero tile. */
  accent?: boolean;
}

/**
 * Bento-style asymmetric grid. Two featured tiles span wider, the rest
 * fill the negative space. Feels closer to Linear / Notion than a flat
 * uniform 4×2 grid.
 */
const FEATURES: Feature[] = [
  {
    icon: Receipt,
    title: "Invoicing that just works",
    description:
      "Send polished invoices in seconds. Simple invoices for non-registered freelancers; full CGST/SGST/IGST split when you need GST — Stackivo handles the difference for you.",
    span: 3,
    accent: true,
  },
  {
    icon: BarChart3,
    title: "Pulse analytics",
    description:
      "Revenue trends, top clients, time analytics, and contract-backed income. Your business, clearly.",
    span: 3,
  },
  {
    icon: Users,
    title: "Client management",
    description:
      "Clean records with billing addresses and contact history. Works for B2C, B2B, and everything in between.",
    span: 2,
  },
  {
    icon: FileText,
    title: "Contracts & proposals",
    description:
      "Draft, send and track with public signing links and a full status timeline.",
    span: 2,
  },
  {
    icon: Briefcase,
    title: "Project workspaces",
    description:
      "Tie invoices, contracts, time and files to a project. See where every engagement stands.",
    span: 2,
  },
  {
    icon: Clock,
    title: "Time tracking",
    description:
      "One-tap timer or manual entries. Billable rates flow directly into invoices.",
    span: 2,
  },
  {
    icon: Wallet,
    title: "Payments",
    description:
      "Sent · viewed · paid · overdue. Cash flow at a glance, never lose a payment.",
    span: 2,
  },
  {
    icon: ShieldCheck,
    title: "Compliance when you need it",
    description:
      "GSTIN validation, place-of-supply rules, immutable history — only switched on when you turn GST on. Audit-ready from day one.",
    span: 2,
  },
];

export function FeaturesSection() {
  return (
    <Section id="features" size="wide" className="relative">
      <Reveal>
        <SectionHeading
          eyebrow="Everything in one place"
          title="One workspace. Every part of your freelance business."
          subtitle="Stop stitching together five tools. Stackivo handles every operational workflow — from client onboarding to revenue analytics."
        />
      </Reveal>

      <StaggerReveal
        className="mt-10 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:mt-14 lg:grid-cols-6"
        amount={0.1}
      >
        {FEATURES.map((f) => (
          <StaggerItem
            key={f.title}
            className={cn(
              f.span === 3 && "lg:col-span-3",
              f.span === 2 && "lg:col-span-2",
            )}
          >
            <FeatureTile feature={f} />
          </StaggerItem>
        ))}
      </StaggerReveal>
    </Section>
  );
}

function FeatureTile({ feature }: { feature: Feature }) {
  const { icon: Icon, title, description, accent } = feature;
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/[0.04] sm:p-6",
        accent && "bg-gradient-to-br from-primary/[0.04] via-card to-card",
      )}
    >
      {accent ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-500/[0.08] blur-2xl"
          />
        </>
      ) : null}
      <span
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-background text-primary shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
          accent &&
            "border-primary bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-md shadow-primary/20",
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="space-y-2">
        <h3 className="text-base font-semibold tracking-tight lg:text-lg">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground lg:text-[15px]">
          {description}
        </p>
      </div>
    </div>
  );
}
