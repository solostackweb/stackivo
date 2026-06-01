"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MarketingAuthState } from "@/features/marketing/types";

export function CtaBand({ authState }: { authState: MarketingAuthState }) {
  const authed = authState.isAuthenticated;
  return (
    <section className="relative isolate overflow-hidden border-y border-border/60 bg-foreground text-background">
      {/* Mesh + grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[10%] -top-[30%] h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(243_75%_60%/0.55),transparent_60%)] blur-3xl animate-floaty" />
        <div className="absolute -right-[10%] bottom-[-30%] h-[55vw] w-[55vw] rounded-full bg-[radial-gradient(circle_at_center,hsl(280_70%_60%/0.45),transparent_60%)] blur-3xl animate-floaty [animation-delay:-6s]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-noise opacity-[0.06]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:56px_56px] mask-radial-soft"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white/70 backdrop-blur">
            <span className="h-1 w-1 rounded-full bg-white" />
            Get started in minutes
          </span>

          <motion.h2
            initial={{ y: 16 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-6 text-balance text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[52px] lg:text-[64px]"
          >
            {authed ? "Welcome back to your workspace." : "Run your business from one place."}
          </motion.h2>

          <p className="mt-7 max-w-xl text-pretty text-[15px] leading-[1.75] text-white/60 sm:text-[17px]">
            {authed
              ? "Jump back into clients, projects, documents, and AI workflows — without leaving the Stackivo flow."
              : "Bring clients, projects, and your whole team into one connected platform. Free to start. No credit card. Two minutes."}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {authed ? (
              <Button asChild size="lg" className="h-12 min-w-[210px] rounded-full bg-background text-foreground hover:bg-background/90">
                <Link href="/dashboard" data-cta="cta_band_dashboard">
                  Open workspace <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-12 min-w-[220px] rounded-full bg-background text-foreground hover:bg-background/90">
                  <Link href="/signup" data-cta="cta_band_primary">
                    Create your workspace <ArrowUpRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="h-12 min-w-[150px] rounded-full text-white hover:bg-white/10">
                  <Link href="/demo" data-cta="cta_band_demo">Book a demo</Link>
                </Button>
              </>
            )}
          </div>
          <p className="mt-5 text-[11.5px] font-medium uppercase tracking-[0.18em] text-white/40">
            No credit card · Cancel anytime · SOC-grade security
          </p>
        </div>
      </div>
    </section>
  );
}
