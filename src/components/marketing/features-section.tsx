import {
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  MessagesSquare,
  Workflow,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Pillar {
  icon: LucideIcon;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Users,
    title: "Clients",
    body: "A single, searchable source of truth for every client — contacts, history, files, and context that travels with you across every project.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    body: "Plan, scope, and ship work with structured projects that connect briefs, tasks, documents, and deliverables in one timeline.",
  },
  {
    icon: CheckSquare,
    title: "Tasks",
    body: "Lightweight tasks and rich workflows in the same surface. Assign, prioritise, and never lose the thread between client and delivery.",
  },
  {
    icon: FileText,
    title: "Documents",
    body: "Briefs, proposals, contracts, SOPs. Edit collaboratively, send for signature, and keep every version tied to the right client.",
  },
  {
    icon: MessagesSquare,
    title: "Team collaboration",
    body: "Threads, mentions, and shared context inline with the work — so decisions stay close to the project, not buried in another app.",
  },
  {
    icon: Workflow,
    title: "Automations",
    body: "Trigger handoffs, reminders, status updates, and external actions when work moves forward. Zero glue code required.",
  },
  {
    icon: Sparkles,
    title: "AI-powered workflows",
    body: "AI that operates on your actual workspace — drafts, summaries, recaps, and next-step suggestions grounded in your clients and projects.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative isolate overflow-hidden border-b bg-background"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-primary/[0.04] to-transparent"
      />

      <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28 xl:px-14 2xl:px-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            One workspace · seven pillars
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-[40px] lg:text-[52px] lg:leading-[1.05] lg:tracking-[-0.025em]">
            Everything you need to run the work,{" "}
            <span className="text-gradient">together at last.</span>
          </h2>
          <p className="mt-5 text-pretty text-base leading-[1.8] text-muted-foreground sm:text-[17px]">
            Stop stitching together five tools that don&apos;t talk to each
            other. Stackivo is one connected surface for clients, projects,
            documents, collaboration, and automation.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <FeatureCard key={p.title} {...p} />
          ))}
          <div className="hidden bg-background/60 lg:block" />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, body }: Pillar) {
  return (
    <div className="group relative isolate flex flex-col gap-3 bg-background p-7 transition-colors duration-200 hover:bg-card sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-1 text-[17px] font-semibold tracking-tight">{title}</h3>
      <p className="text-[14.5px] leading-[1.7] text-muted-foreground">{body}</p>
    </div>
  );
}
