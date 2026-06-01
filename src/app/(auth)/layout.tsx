"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Workflow,
  Layers,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StackivoLogo, StackivoMark } from "@/components/brand/stackivo-logo";

/**
 * Editorial split-screen auth. Inky brand panel with animated mesh,
 * editorial serif quote, and a clean form panel on the right.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Left brand panel — desktop only */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-foreground px-10 py-12 text-background lg:flex xl:w-[44%] xl:px-14">
        {/* Animated orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-[20%] -top-[15%] h-[60%] w-[60%] rounded-full bg-[radial-gradient(circle_at_center,hsl(243_75%_60%/0.55),transparent_60%)] blur-3xl animate-floaty" />
          <div className="absolute -bottom-[15%] -right-[10%] h-[55%] w-[55%] rounded-full bg-[radial-gradient(circle_at_center,hsl(280_70%_60%/0.42),transparent_60%)] blur-3xl animate-floaty [animation-delay:-5s]" />
          <div className="absolute left-[25%] top-[40%] h-[40%] w-[40%] rounded-full bg-[radial-gradient(circle_at_center,hsl(262_83%_60%/0.32),transparent_60%)] blur-3xl animate-floaty [animation-delay:-9s]" />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:52px_52px] mask-fade-b" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-noise opacity-[0.06]" />

        {/* Top: Logo + meta */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Stackivo home"
            className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-background"
          >
            <StackivoMark className="h-9 w-9 rounded-xl shadow-lg shadow-primary/30" />
            <span className="text-[17px]">Stackivo</span>
          </Link>
          <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-background/40 xl:inline">
            Vol. 01 · MMXXVI
          </span>
        </div>

        {/* Middle: Editorial quote + value props */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative z-10 space-y-10"
        >
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-background/45">
              Trusted by modern teams
            </span>
          </div>

          <blockquote className="space-y-6">
            <p className="font-serif text-[28px] leading-[1.15] text-background/95 xl:text-[32px]">
              &ldquo;We replaced four tools with Stackivo.{" "}
              <span className="italic-serif text-background/70">
                Clients, projects, docs, and automations
              </span>{" "}
              all live together — our team finally works in one place.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/50 to-violet-500/40 text-sm font-semibold ring-1 ring-background/20">
                RK
              </div>
              <div>
                <p className="text-sm font-medium text-background">Riya Kapoor</p>
                <p className="text-[12px] text-background/45">
                  Founder · Northwind Studio
                </p>
              </div>
            </div>
          </blockquote>

          <div className="space-y-3 border-t border-background/10 pt-7">
            <ValueProp icon={Layers} label="Clients, projects, and documents in one place" />
            <ValueProp icon={Workflow} label="Automations that move work forward" />
            <ValueProp icon={Sparkles} label="AI workflows grounded in your workspace" />
          </div>
        </motion.div>

        {/* Bottom: Back link + meta row */}
        <div className="relative z-10 flex items-center justify-between text-[12px] text-background/40">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-background/90"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <span className="font-mono uppercase tracking-[0.18em]">SOC-grade · EU & US</span>
        </div>
      </aside>

      {/* Right form panel */}
      <main
        className="relative flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 3rem)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 3rem)",
        }}
      >
        {/* Soft mesh on form panel */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-editorial-dots opacity-30 mask-radial-soft" />

        <div className="mb-10 flex justify-center lg:hidden">
          <Link href="/" aria-label="Stackivo home">
            <StackivoLogo />
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-[380px]"
        >
          {children}
        </motion.div>

        <p className="absolute bottom-6 hidden font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground/50 lg:block">
          The workspace for modern teams
        </p>
      </main>
    </div>
  );
}

function ValueProp({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background/[0.08] ring-1 ring-background/12">
        <Icon className="h-3.5 w-3.5 text-background/70" />
      </span>
      <span className="text-[13px] text-background/65">{label}</span>
    </div>
  );
}
