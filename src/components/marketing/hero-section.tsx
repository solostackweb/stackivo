"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Play,
  Users,
  FolderKanban,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Keka-inspired hero. Asymmetric split — left: tight headline, supporting
 * subhead, two CTAs, trust microcopy. Right: a constellation of floating
 * product UI cards (clients, kanban, AI, invoice, time tracker) on a clean
 * canvas with a soft violet glow. No dark gradient walls, no centered
 * grid-backdrop — light, friendly, premium.
 */
export function HeroSection({ authState }: { authState: MarketingAuthState }) {
  const authed = authState.isAuthenticated;

  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Soft ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.16),transparent_65%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
          {/* ── Left column ───────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-xl"
          >
            <Link
              href="/changelog"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground"
            >
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                New
              </span>
              AI workflows are live in beta
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <h1 className="mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-[54px] lg:text-[64px]">
              Everything you need to{" "}
              <span className="text-primary">run your business</span>
            </h1>

            <p className="mt-6 max-w-lg text-pretty text-[16px] leading-[1.65] text-muted-foreground sm:text-[18px]">
              Stackivo brings your clients, projects, invoices, contracts,
              time tracking and AI workflows into one connected workspace —
              so you stop juggling tools and start shipping work.
            </p>

            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {authed ? (
                <Button asChild size="lg" className="h-12 rounded-full px-6 text-[14.5px] font-semibold">
                  <Link href="/dashboard" data-cta="hero_dashboard">
                    Open workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="h-12 rounded-full px-6 text-[14.5px] font-semibold shadow-lg shadow-primary/25">
                    <Link href="/signup" data-cta="hero_primary">
                      Get free trial <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-border bg-background px-6 text-[14.5px] font-medium">
                    <Link href="/demo" data-cta="hero_demo">
                      <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                      Take a tour
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              {["Free up to 5 clients", "No credit card", "Set up in 2 minutes"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ── Right column: floating product cards ──────────── */}
          <HeroVisual />
        </div>

        {/* Trust strip — light pill band, Keka style */}
        <div className="mt-20 sm:mt-24">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-secondary/60 px-6 py-7 sm:flex-row sm:gap-10 sm:px-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:max-w-[160px] sm:border-r sm:border-border sm:pr-10">
              Trusted by modern teams
            </p>
            <div className="flex flex-1 flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[15px] font-semibold tracking-tight text-muted-foreground/80 sm:justify-between">
              {LOGOS.map((name) => (
                <span key={name} className="opacity-80 transition hover:opacity-100">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const LOGOS = [
  "Northwind",
  "Atlas Collective",
  "Mercer & Bell",
  "Praxis Labs",
  "Holloway",
  "Sundial",
];

/* ───────────────── Floating product visual ───────────────── */

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
      className="relative mx-auto h-[480px] w-full max-w-[620px] sm:h-[540px] lg:h-[560px]"
    >
      {/* Soft halo behind the cluster */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-8 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_70%)] blur-2xl"
      />

      {/* Card 1 — Clients */}
      <FloatCard
        className="left-0 top-4 w-[270px] sm:w-[300px]"
        delay={0.15}
        rotate={-2}
      >
        <CardHeader icon={<Users className="h-3.5 w-3.5" />} title="Clients" trailing="12 active" tone="violet" />
        <div className="mt-3 space-y-2">
          {[
            { n: "Atlas Collective", t: "Retainer", c: "bg-emerald-500" },
            { n: "Northwind Studio", t: "Active", c: "bg-primary" },
            { n: "Mercer & Bell", t: "Proposal", c: "bg-amber-500" },
          ].map((r) => (
            <div key={r.n} className="flex items-center justify-between rounded-lg bg-secondary/60 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-[9px] font-bold text-primary">
                  {r.n.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="text-[12px] font-medium">{r.n}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${r.c}`} /> {r.t}
              </span>
            </div>
          ))}
        </div>
      </FloatCard>

      {/* Card 2 — Project / kanban */}
      <FloatCard
        className="right-0 top-0 w-[260px] sm:w-[290px]"
        delay={0.25}
        rotate={2.5}
      >
        <CardHeader icon={<FolderKanban className="h-3.5 w-3.5" />} title="Brand Refresh · Q3" trailing="On track" tone="emerald" />
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            { label: "Todo", n: 5, tone: "bg-muted-foreground/40" },
            { label: "Doing", n: 3, tone: "bg-primary" },
            { label: "Done", n: 8, tone: "bg-emerald-500" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg bg-secondary/60 p-2">
              <div className="mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{c.label}</span><span>{c.n}</span>
              </div>
              <div className="space-y-1">
                <div className={`h-1 w-full rounded ${c.tone}/60`} />
                <div className={`h-1 w-3/4 rounded ${c.tone}/40`} />
                <div className={`h-1 w-1/2 rounded ${c.tone}/30`} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Due Thu</span>
          <div className="flex -space-x-1.5">
            {["RK", "JM", "AS"].map((i) => (
              <span key={i} className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[8px] font-bold text-primary ring-2 ring-card">{i}</span>
            ))}
          </div>
        </div>
      </FloatCard>

      {/* Card 3 — Invoice */}
      <FloatCard
        className="left-6 bottom-12 w-[240px] sm:w-[260px]"
        delay={0.35}
        rotate={1.5}
      >
        <CardHeader icon={<CircleDollarSign className="h-3.5 w-3.5" />} title="Invoice · INV-0142" trailing="Paid" tone="emerald" />
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total · GST 18%</span>
          <span className="text-lg font-semibold tracking-tight">₹86,400</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
        </div>
        <p className="mt-2 text-[10.5px] text-muted-foreground">Settled via Razorpay · 2 days ago</p>
      </FloatCard>

      {/* Card 4 — AI prompt */}
      <FloatCard
        className="right-2 bottom-6 w-[270px] sm:w-[300px]"
        delay={0.45}
        rotate={-2}
        glow
      >
        <CardHeader icon={<Sparkles className="h-3.5 w-3.5" />} title="Ask Stackivo" trailing="grounded" tone="violet" />
        <p className="mt-3 text-[12.5px] leading-snug text-foreground">
          &ldquo;Draft a status note for{" "}
          <span className="font-mono text-primary">Atlas Collective</span>{" "}
          based on this week&apos;s shipped tasks.&rdquo;
        </p>
        <div className="mt-3 space-y-1">
          <div className="h-1.5 w-11/12 rounded bg-foreground/12" />
          <div className="h-1.5 w-3/4 rounded bg-foreground/10" />
          <div className="h-1.5 w-5/6 rounded bg-foreground/8" />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
          </span>
          Reading workspace context · 9 sources
        </div>
      </FloatCard>

      {/* Card 5 — small doc badge */}
      <FloatCard
        className="left-1/2 top-1/2 hidden w-[180px] -translate-x-1/2 -translate-y-1/2 sm:block"
        delay={0.55}
        rotate={-1}
        compact
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/12 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold">SOW · v3 signed</p>
            <p className="text-[10px] text-muted-foreground">Riya K · 2m ago</p>
          </div>
        </div>
      </FloatCard>
    </motion.div>
  );
}

function FloatCard({
  children,
  className,
  delay = 0,
  rotate = 0,
  glow,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  rotate?: number;
  glow?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay }}
      whileHover={{ y: -4, rotate: 0, transition: { duration: 0.3 } }}
      className={`absolute rounded-2xl border border-border/80 bg-card ${compact ? "p-3" : "p-4"} shadow-[0_18px_40px_-12px_hsl(var(--foreground)/0.18)] backdrop-blur ${glow ? "ring-1 ring-primary/20" : ""} ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

function CardHeader({
  icon,
  title,
  trailing,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  trailing?: string;
  tone?: "violet" | "emerald";
}) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "bg-primary/10 text-primary";
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-md ${toneClasses}`}>{icon}</span>
        <span className="text-[12px] font-semibold tracking-tight">{title}</span>
      </div>
      {trailing ? (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
