"use client";

import { motion } from "framer-motion";
import {
  Users,
  FolderKanban,
  CheckSquare,
  Workflow,
  Sparkles,
} from "lucide-react";

const STEPS = [
  {
    icon: Users,
    title: "Bring in the client.",
    description:
      "Capture context once. Stackivo carries it across every project, document, and thread — so nobody re-explains the brief.",
  },
  {
    icon: FolderKanban,
    title: "Scope the work.",
    description:
      "Spin up a project, draft the brief, attach the contract. The whole engagement gets a single, searchable home.",
  },
  {
    icon: CheckSquare,
    title: "Ship the work.",
    description:
      "Tasks, files, decisions, presence — all on one surface. The team stays in flow; the client stays in the loop.",
  },
  {
    icon: Workflow,
    title: "Let automation handle the seams.",
    description:
      "Handoffs, reminders, status updates, external pings — Stackivo moves the work between humans without glue code.",
  },
  {
    icon: Sparkles,
    title: "Close with AI on your side.",
    description:
      "Recaps, summaries, next-step drafts — grounded in the actual workspace, ready to send the moment work wraps.",
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="relative isolate overflow-hidden border-y bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-editorial-dots opacity-30 mask-radial-soft" />
      <div className="mx-auto w-full max-w-[1480px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40 xl:px-16">
        {/* Two-column intro */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              The arc · Five movements
            </span>
            <h2 className="mt-4 text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[44px] lg:text-[56px]">
              From first hello to{" "}
              <span className="font-serif italic text-gradient">final invoice.</span>
            </h2>
            <p className="mt-6 max-w-md text-pretty text-[15.5px] leading-[1.75] text-muted-foreground">
              Every engagement follows the same arc. Stackivo is the
              rails underneath — quietly composing the work as your team
              moves through it.
            </p>
          </div>

          <ol className="relative lg:col-span-7">
            <div aria-hidden className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            {STEPS.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ x: 16 }}
                whileInView={{ x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                className="group relative flex gap-6 pb-12 last:pb-0"
              >
                <div className="relative z-10 grid h-[56px] w-[56px] shrink-0 place-items-center rounded-2xl border border-border/70 bg-background shadow-soft-lg transition-all duration-500 group-hover:border-primary/40 group-hover:scale-105">
                  <s.icon className="h-5 w-5 text-foreground/80 transition-colors group-hover:text-primary" />
                  <span className="absolute -right-1 -top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-foreground text-[9px] font-bold text-background">
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 pt-1.5">
                  <h3 className="text-balance text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-[14.5px] leading-[1.7] text-muted-foreground sm:text-[15.5px]">
                    {s.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
