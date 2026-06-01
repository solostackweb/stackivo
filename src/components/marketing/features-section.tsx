"use client";

import { motion } from "framer-motion";
import {
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  MessagesSquare,
  Workflow,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Bento-style features section. Asymmetric grid with mini product
 * visuals instead of a flat icon list. Each tile is a small product
 * surface — clients table, kanban, doc, automation flow, AI prompt.
 */

export function FeaturesSection() {
  return (
    <section id="features" className="relative isolate overflow-hidden border-b bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent" />

      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
        <SectionIntro />

        {/* Bento grid */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-6 sm:gap-5 lg:grid-cols-12">
          <Tile className="sm:col-span-3 lg:col-span-5" tag="01 · Clients" title="Every client, one source of truth." body="Contacts, history, files, threads. Context that travels with the work.">
            <ClientsVisual />
          </Tile>
          <Tile className="sm:col-span-3 lg:col-span-7" tag="02 · Projects & Tasks" title="Plan, scope, ship — without switching tabs." body="Briefs, tasks, documents, deliverables — connected on one timeline.">
            <KanbanVisual />
          </Tile>
          <Tile className="sm:col-span-3 lg:col-span-4" tag="03 · Documents" title="Drafts → signatures. Inline." body="Edit, comment, sign — versioned, tied to the right client.">
            <DocVisual />
          </Tile>
          <Tile className="sm:col-span-3 lg:col-span-4" tag="04 · Collaboration" title="Decisions stay close to the work." body="Threads, mentions, presence — never buried in another app.">
            <CollabVisual />
          </Tile>
          <Tile className="sm:col-span-6 lg:col-span-4" tag="05 · Automations" title="Glue code, retired." body="Triggers, handoffs, reminders that move work forward.">
            <AutomationVisual />
          </Tile>
          <Tile className="sm:col-span-6 lg:col-span-12" tag="06 · AI Workflows" title="AI that knows your workspace, not the internet." body="Drafts, summaries, next-step suggestions grounded in your real clients, projects, and documents — never a generic chatbot." big>
            <AiVisual />
          </Tile>
        </div>
      </div>
    </section>
  );
}

function SectionIntro() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start lg:items-center lg:text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
        <span className="h-1 w-1 rounded-full bg-primary" />
        The product
      </span>
      <h2 className="mt-5 text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[52px] lg:text-[68px]">
        One workspace.{" "}
        <span className="font-serif italic text-gradient">Seven disciplines.</span>
      </h2>
      <p className="mt-6 max-w-2xl text-pretty text-[15.5px] leading-[1.75] text-muted-foreground sm:text-[17px]">
        Stop stitching together five tools that don&apos;t talk to each other.
        Stackivo is one connected surface for everything modern teams do —
        from the first hello to the final invoice.
      </p>
    </div>
  );
}

interface TileProps {
  className?: string;
  tag: string;
  title: string;
  body: string;
  big?: boolean;
  children: React.ReactNode;
}

function Tile({ className, tag, title, body, big, children }: TileProps) {
  return (
    <motion.article
      initial={{ y: 24 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className={`group relative isolate flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-7 backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-soft-lg sm:p-8 ${big ? "lg:p-12" : ""} ${className ?? ""}`}
    >
      {/* Hover gradient overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.04] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <header className="flex items-start justify-between">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">{tag}</span>
        <ArrowUpRight className="h-4 w-4 -translate-y-0.5 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1.5 group-hover:text-foreground" />
      </header>
      <h3 className={`mt-4 text-balance font-semibold tracking-[-0.02em] ${big ? "text-2xl sm:text-[30px] lg:text-[38px]" : "text-xl sm:text-[22px]"}`}>
        {title}
      </h3>
      <p className={`mt-3 max-w-md text-[14.5px] leading-[1.7] text-muted-foreground ${big ? "lg:text-[16.5px]" : ""}`}>
        {body}
      </p>
      <div className={`mt-7 flex-1 ${big ? "min-h-[260px]" : "min-h-[170px]"}`}>{children}</div>
    </motion.article>
  );
}

/* ───────── Mini visuals ───────── */

function ClientsVisual() {
  const rows = [
    { name: "Atlas Collective", tag: "Retainer", color: "bg-emerald-500" },
    { name: "Northwind Studio", tag: "Active", color: "bg-primary" },
    { name: "Mercer & Bell", tag: "Proposal", color: "bg-amber-500" },
    { name: "Field Notes Co.", tag: "Paused", color: "bg-muted-foreground/60" },
  ];
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-3">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-foreground/[0.03]">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/15 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
              {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <span className="font-medium">{r.name}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${r.color}`} /> {r.tag}
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanVisual() {
  const cols = [
    { name: "Backlog", n: 8, tone: "bg-muted-foreground/30" },
    { name: "In progress", n: 3, tone: "bg-primary" },
    { name: "Review", n: 2, tone: "bg-amber-500" },
    { name: "Shipped", n: 6, tone: "bg-emerald-500" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {cols.map((c, idx) => (
        <div key={c.name} className="rounded-xl border border-border/60 bg-background/60 p-2.5">
          <div className="mb-2.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${c.tone}`} />{c.name}</span>
            <span>{c.n}</span>
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-md bg-foreground/[0.04] p-2">
                <div className="mb-1.5 h-1.5 w-3/4 rounded bg-foreground/15" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted-foreground">SK-{142 + idx * 7 + i}</span>
                  <span className={`h-3 w-3 rounded-full ${c.tone}/70 ring-2 ring-background`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocVisual() {
  return (
    <div className="relative space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Statement of Work · v3</span>
      </div>
      <div className="h-2 w-4/5 rounded bg-foreground/15" />
      <div className="h-2 w-3/5 rounded bg-foreground/10" />
      <div className="h-2 w-11/12 rounded bg-foreground/8" />
      <div className="h-2 w-2/3 rounded bg-foreground/10" />
      <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Signed · Riya K.
      </div>
    </div>
  );
}

function CollabVisual() {
  return (
    <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/60 p-4">
      {[
        { who: "RK", txt: "Approved the v3 brief — ship by Thursday.", t: "2m" },
        { who: "JM", txt: "Pulled the contract into project.", t: "12m" },
        { who: "AI", txt: "Suggested 3 follow-up tasks.", t: "1h", ai: true },
      ].map((m, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold ${m.ai ? "bg-gradient-to-br from-primary/30 to-violet-500/30 text-primary ring-1 ring-primary/30" : "bg-foreground/10"}`}>
            {m.who}
          </span>
          <div className="min-w-0 flex-1">
            <div className="rounded-xl rounded-tl-sm bg-foreground/[0.04] px-3 py-2 text-[12.5px] leading-snug">{m.txt}</div>
            <span className="ml-1 text-[10px] text-muted-foreground">{m.t} ago</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AutomationVisual() {
  const Step = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-[12px] font-medium">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </div>
  );
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <Step icon={CheckSquare} label="When task moves to 'Review'" />
      <div className="ml-4 h-3 w-px bg-border" />
      <Step icon={MessagesSquare} label="Post to #design channel" />
      <div className="ml-4 h-3 w-px bg-border" />
      <Step icon={Users} label="Notify client lead" />
      <div className="ml-4 h-3 w-px bg-border" />
      <Step icon={Workflow} label="Create follow-up in 3 days" />
    </div>
  );
}

function AiVisual() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Ask Stackivo
        </div>
        <p className="text-[14px] leading-relaxed text-foreground">
          &ldquo;Draft a status note for <span className="font-mono text-primary">Atlas Collective</span>
          {" "}based on this week&apos;s shipped tasks and time entries.&rdquo;
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"><span className="absolute inset-0 animate-ping rounded-full bg-primary/60" /></span>
          Reading workspace context
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.05] to-violet-500/[0.04] p-5">
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Generated draft</span>
          <span className="font-mono text-[10px] text-primary">grounded · 9 sources</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-11/12 rounded bg-foreground/15" />
          <div className="h-2 w-4/5 rounded bg-foreground/12" />
          <div className="h-2 w-full rounded bg-foreground/10" />
          <div className="h-2 w-3/5 rounded bg-foreground/12" />
          <div className="h-2 w-2/3 rounded bg-foreground/10" />
        </div>
        <div className="mt-4 flex gap-2">
          <button className="rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold text-background">Approve & send</button>
          <button className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium">Refine</button>
        </div>
      </div>
    </div>
  );
}
