"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  FileSignature,
  Clock,
  BellRing,
  CircleDollarSign,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Keka-inspired hero — clean white canvas, heavy black headline, friendly
 * illustration cards on the right depicting Stackivo's real features:
 * invoices, contracts with e-signature, time tracking, and due reminders.
 */
export function HeroSection({ authState }: { authState: MarketingAuthState }) {
  const authed = authState.isAuthenticated;

  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-10">
          {/* ── Left ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-xl"
          >
            <h1 className="text-balance text-[40px] font-extrabold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[52px] lg:text-[60px]">
              Everything you need to run your business
            </h1>

            <p className="mt-6 max-w-lg text-[16.5px] leading-[1.65] text-muted-foreground sm:text-[17.5px]">
              Stackivo is the all-in-one workspace for invoicing, contracts
              with e-signature, time tracking, and automatic payment
              reminders — so you spend less time chasing and more time doing
              the work.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {authed ? (
                <Button asChild size="lg" className="h-12 rounded-full px-6 text-[14.5px] font-bold">
                  <Link href="/dashboard" data-cta="hero_dashboard">
                    Open workspace
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="h-12 rounded-full bg-primary px-6 text-[14.5px] font-bold text-primary-foreground hover:bg-primary/90">
                    <Link href="/signup" data-cta="hero_primary">Get free trial</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-foreground/15 bg-background px-6 text-[14.5px] font-semibold text-foreground hover:bg-secondary">
                    <Link href="/demo" data-cta="hero_demo">Take a tour</Link>
                  </Button>
                </>
              )}
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              {["14-day free trial", "No credit card needed", "Setup in minutes"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ── Right: feature cards collage ─────────────────── */}
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Floating feature cards ───────────────── */

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
      className="relative mx-auto h-[460px] w-full max-w-[560px] sm:h-[520px]"
    >
      {/* Invoice card — top left */}
      <FloatCard className="left-0 top-2 w-[230px] sm:w-[250px]" delay={0.1}>
        <CardHeader icon={<CircleDollarSign className="h-3.5 w-3.5" />} title="Invoice · INV-0142" trailing="PAID" tone="emerald" />
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total · GST 18%</span>
          <span className="text-[17px] font-bold tracking-tight">₹86,400</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
        <p className="mt-2 text-[10.5px] text-muted-foreground">Settled · 2 days ago</p>
      </FloatCard>

      {/* Contract / e-sign card — top right */}
      <FloatCard className="right-0 top-0 w-[240px] sm:w-[260px]" delay={0.2}>
        <CardHeader icon={<FileSignature className="h-3.5 w-3.5" />} title="Service Agreement" trailing="SIGNED" tone="violet" />
        <div className="mt-3 rounded-lg bg-secondary/70 p-3">
          <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">E-signature</p>
          <p className="mt-1 font-serif text-[20px] italic leading-none text-foreground">Riya Kapoor</p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Signed · 14 Jun 2026</p>
        </div>
      </FloatCard>

      {/* Time tracking — middle */}
      <FloatCard className="left-4 top-[42%] w-[260px] sm:w-[280px]" delay={0.3}>
        <CardHeader icon={<Clock className="h-3.5 w-3.5" />} title="Time tracker" trailing="LIVE" tone="violet" />
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] text-muted-foreground">Atlas Collective · Design</p>
            <p className="mt-0.5 font-mono text-[22px] font-bold tabular-nums tracking-tight text-foreground">
              01:24:36
            </p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-current" />
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-primary/20" style={{ height: `${h / 4}px` }} />
          ))}
        </div>
      </FloatCard>

      {/* Reminder card — bottom right */}
      <FloatCard className="right-2 bottom-2 w-[240px] sm:w-[260px]" delay={0.4}>
        <CardHeader icon={<BellRing className="h-3.5 w-3.5" />} title="Payment reminder" trailing="SENT" tone="amber" />
        <p className="mt-3 text-[12px] leading-snug text-foreground">
          Friendly nudge sent to{" "}
          <span className="font-semibold">Northwind Studio</span> · invoice
          due in 3 days.
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Auto-follow-up every 7 days
        </div>
      </FloatCard>

      {/* Tiny doc badge bottom left */}
      <FloatCard className="left-2 bottom-6 hidden w-[180px] sm:block" delay={0.5} compact>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold">SOW · v3</p>
            <p className="text-[10px] text-muted-foreground">Awaiting sign</p>
          </div>
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </FloatCard>
    </motion.div>
  );
}

function FloatCard({
  children,
  className,
  delay = 0,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`absolute rounded-2xl border border-border bg-card ${compact ? "p-3" : "p-4"} shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] ${className ?? ""}`}
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
  tone?: "violet" | "emerald" | "amber";
}) {
  const tones = {
    violet: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
  } as const;
  const pillTones = {
    violet: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/15 text-amber-700",
  } as const;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-md ${tones[tone ?? "violet"]}`}>{icon}</span>
        <span className="text-[12px] font-bold tracking-tight">{title}</span>
      </div>
      {trailing ? (
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${pillTones[tone ?? "violet"]}`}>
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
