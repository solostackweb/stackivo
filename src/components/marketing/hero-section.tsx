"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Editorial hero — magazine-grade composition. Asymmetric two-column grid
 * with serif-display breakthrough word, rotating verb ticker, animated
 * orb mesh, dotted grid, and a logo marquee underneath. The mockup is
 * tilted in 3D for product immediacy.
 */

const ROTATING_NOUNS = ["business.", "agency.", "studio.", "team.", "practice."];

export function HeroSection({ authState }: { authState: MarketingAuthState }) {
  return (
    <section className="relative isolate overflow-hidden border-b bg-background">
      {/* Animated mesh orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-[10%] -top-[20%] h-[55vw] w-[55vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(243_75%_55%/0.22),transparent_60%)] blur-3xl animate-floaty" />
        <div className="absolute -right-[8%] top-[10%] h-[42vw] w-[42vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(280_70%_60%/0.18),transparent_60%)] blur-3xl animate-floaty [animation-delay:-4s]" />
        <div className="absolute bottom-[-25%] left-[30%] h-[40vw] w-[40vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(262_83%_64%/0.14),transparent_60%)] blur-3xl animate-floaty [animation-delay:-8s]" />
      </div>

      {/* Editorial dotted grid + noise */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-editorial-dots opacity-50 mask-radial-soft" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-noise opacity-[0.035]" />

      <div className="relative mx-auto w-full max-w-[1480px] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-12 lg:pb-32 lg:pt-28 xl:px-16">
        {/* Eyebrow row — top meta */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80 sm:mb-14"
        >
          <span className="hidden sm:inline">Vol. 01 · The Workspace Issue</span>
          <span className="inline-flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            </span>
            Now in private beta · MMXXVI
          </span>
          <span className="hidden sm:inline">Made for teams 1–500</span>
        </motion.div>

        {/* Asymmetric grid */}
        <div className="grid items-end gap-y-14 lg:grid-cols-12 lg:gap-x-10">
          {/* Headline — left, takes 7 cols */}
          <div className="lg:col-span-7">
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
              className="text-balance text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] sm:text-[64px] lg:text-[88px] xl:text-[104px]"
            >
              Run your entire{" "}
              <span className="relative inline-block align-bottom">
                <span className="inline-flex h-[1em] w-[5.3ch] overflow-hidden align-bottom sm:w-[5.5ch]">
                  <span className="flex flex-col animate-ticker-y font-serif italic text-gradient">
                    {[...ROTATING_NOUNS, ROTATING_NOUNS[0]].map((w, i) => (
                      <span key={i} className="h-[1em] leading-[0.98]">{w}</span>
                    ))}
                  </span>
                </span>
              </span>
              <br />
              From one quiet, <span className="font-serif italic text-foreground/85">unhurried</span> workspace.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-8 max-w-[34rem] text-pretty text-[15.5px] leading-[1.75] text-muted-foreground sm:text-[17px]"
            >
              Stackivo is the operating layer for modern teams — clients,
              projects, tasks, documents, collaboration, automations, and
              AI workflows in one connected surface. Not another tool.
              <span className="text-foreground/80"> The last one you&apos;ll add.</span>
            </motion.p>

            <HeroCtas authState={authState} />
          </div>

          {/* Mockup — right, takes 5 cols, tilted */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
            className="relative lg:col-span-5"
            style={{ perspective: "1800px" }}
          >
            <div
              className="relative origin-bottom-right transition-transform duration-700 ease-out hover:rotate-0 hover:scale-[1.02] lg:rotate-[-1.5deg]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Glow halo behind mockup */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/25 via-violet-500/15 to-fuchsia-500/10 blur-3xl"
              />
              {/* Frame */}
              <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-card/95 shadow-editorial ring-1 ring-foreground/[0.03] backdrop-blur-sm">
                <DashboardMockup />
              </div>

              {/* Floating chip — top */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="absolute -top-5 left-6 hidden items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/80 shadow-soft-lg backdrop-blur lg:flex"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                Live workspace
              </motion.div>

              {/* Floating chip — bottom */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="absolute -bottom-4 -left-4 hidden flex-col rounded-2xl border border-border/80 bg-background/95 p-3 shadow-soft-lg backdrop-blur lg:flex"
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Active today</span>
                <span className="text-xl font-semibold tabular-nums">2,418</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trusted-by marquee — full bleed */}
      <div className="relative border-t border-border/60 bg-background/60 py-7 sm:py-9">
        <div className="mb-3 text-center text-[10.5px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
          The operating layer for modern teams worldwide
        </div>
        <div className="mask-fade-r relative overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-14 whitespace-nowrap pl-14 text-[22px] font-serif italic text-muted-foreground/55 sm:gap-20 sm:text-[26px]">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span key={i} className="inline-flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const LOGOS = [
  "Northwind Studio",
  "Atlas Collective",
  "Mercer & Bell",
  "Field Notes Co.",
  "Praxis Labs",
  "Holloway",
  "Sundial",
  "Cobalt Type",
  "Ferment Studio",
  "Loomwright",
];

function HeroCtas({ authState }: { authState: MarketingAuthState }) {
  const authed = authState.isAuthenticated;
  return (
    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
      {authed ? (
        <Button asChild size="lg" className="btn-gradient h-12 min-w-[210px] rounded-full border-0 text-[15px] font-semibold">
          <Link href="/dashboard" data-cta="hero_dashboard">
            Open workspace <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <>
          <Button asChild size="lg" className="btn-gradient h-12 min-w-[210px] rounded-full border-0 text-[15px] font-semibold">
            <Link href="/signup" data-cta="hero_primary">
              Create your workspace <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="group h-12 min-w-[150px] rounded-full text-[15px] font-medium hover:bg-foreground/5">
            <Link href="/demo" data-cta="hero_demo">
              Watch the 90s tour{" "}
              <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background transition-transform group-hover:translate-x-0.5">
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          </Button>
        </>
      )}
      <p className="mt-1 text-[12.5px] font-medium text-muted-foreground sm:ml-3 sm:mt-0">
        Free for 5 seats · No credit card · 2-minute setup
      </p>
    </div>
  );
}
