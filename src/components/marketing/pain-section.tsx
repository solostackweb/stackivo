import { ArrowRight, X } from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal } from "./motion";

const PAINS = [
  "Word-doc invoices you re-do every month",
  "WhatsApp-ed contracts you can't find when a dispute starts",
  "Five tools that don't talk to each other",
  "Manual time tracking that never matches what you actually billed",
  "No real view of who owes you what",
  "Generic accounting software built for companies, not solos",
];

const FIXES = [
  "Polished invoices in 30 seconds — simple, GST, whatever you need",
  "Contracts and signature trail in one workspace",
  "One unified workspace, every workflow connected",
  "One-tap timer that flows directly into invoices",
  "Pulse: paid revenue and contract-backed income at a glance",
  "Built for one person. Not a finance department.",
];

export function PainSection() {
  return (
    <Section size="wide" className="border-y bg-muted/30">
      <Reveal>
        <SectionHeading
          eyebrow="Why Stackivo exists"
          title="The freelancer toolbox is broken."
          subtitle="You shouldn't need a CA, a project manager, and three subscriptions to run a one-person business."
        />
      </Reveal>

      <Reveal className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border shadow-lg shadow-primary/[0.03] md:grid-cols-2">
        <div className="bg-card p-8 sm:p-10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Without Stackivo
          </h3>
          <ul className="mt-4 space-y-3">
            {PAINS.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card p-8 sm:p-10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
            With Stackivo
          </h3>
          <ul className="mt-4 space-y-3">
            {FIXES.map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Section>
  );
}
