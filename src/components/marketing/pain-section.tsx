"use client";

import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Section } from "./section";

const PAINS = [
  "Five tabs to answer one client question",
  "Tasks in one app, files in another, decisions in a third",
  "Slack threads that never become work",
  "Status updates copy-pasted on Sunday night",
  "AI tools that don't know who your clients are",
  "Tools built for departments, not for teams",
];

const FIXES = [
  "One surface — clients, projects, docs, threads, AI",
  "Files, tasks, and decisions live with the project",
  "Threads that turn into tasks in one click",
  "Auto-generated weekly recaps from real activity",
  "AI grounded in your workspace, not the public web",
  "Built for the whole team — from solo to studio",
];

export function PainSection() {
  return (
    <Section size="wide" className="relative isolate overflow-hidden border-y bg-secondary/40">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-editorial-grid opacity-30 mask-fade-b" />

      <div className="mx-auto max-w-3xl">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          The problem
        </span>
        <h2 className="mt-4 text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[52px] lg:text-[68px]">
          The modern team toolbox is{" "}
          <span className="font-serif italic text-gradient">spectacularly broken.</span>
        </h2>
        <p className="mt-6 max-w-xl text-pretty text-[15.5px] leading-[1.75] text-muted-foreground sm:text-[17px]">
          You shouldn&apos;t need a project manager, a CRM, a docs tool, a
          chat app, and three AI subscriptions to deliver one piece of work.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative mt-16 grid grid-cols-1 overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-soft-lg md:grid-cols-2"
      >
        {/* Divider */}
        <div aria-hidden className="absolute inset-y-8 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-border to-transparent md:block" />

        <div className="p-8 sm:p-12">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <X className="h-4 w-4" />
            </span>
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Without Stackivo</h3>
          </div>
          <ul className="space-y-4">
            {PAINS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-[1.55] text-muted-foreground line-through decoration-destructive/40 decoration-[1.5px] underline-offset-4">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/50" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative bg-background/50 p-8 sm:p-12">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <ArrowRight className="h-4 w-4" />
            </span>
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">With Stackivo</h3>
          </div>
          <ul className="space-y-4">
            {FIXES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px] leading-[1.55] text-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </Section>
  );
}
