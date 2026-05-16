import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, FileText, Clock } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/motion";
import { TOOLS, type ToolMeta } from "@/features/tools/types";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Free freelancer tools · Stackivo",
  description:
    "Free calculators for Indian freelancers — set your hourly rate, compute GST, and claim interest on overdue invoices. Built by Stackivo.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free freelancer tools by Stackivo",
    description:
      "Free calculators for Indian freelancers: hourly rate, GST, late-payment interest.",
    url: `${siteConfig.url}/tools`,
  },
};

export const dynamic = "force-static";

const ICONS = {
  Calculator,
  FileText,
  Clock,
} as const;

export default function ToolsIndexPage() {
  return (
    <>
      <Section size="default" className="pt-24 sm:pt-32 lg:pt-40">
        <SectionHeading
          eyebrow="Free tools"
          title="Tiny calculators that pay for themselves."
          subtitle="Three free calculators that solve real problems Indian freelancers run into every week. No signup, no email gate. Built by Stackivo."
        />
      </Section>

      <Section size="default" className="pb-20 pt-4 sm:pb-24">
        <Reveal>
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </Reveal>

        <Reveal>
          <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
            Want a calculator that doesn&rsquo;t exist yet?{" "}
            <Link
              href="/contact"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
            >
              Tell us
            </Link>{" "}
            &mdash; we ship the most-requested ones first.
          </p>
        </Reveal>
      </Section>
    </>
  );
}

function ToolCard({ tool }: { tool: ToolMeta }) {
  const Icon = ICONS[tool.icon];
  return (
    <Link
      href={`/tools/${tool.slug}`}
      data-cta={`tools_index_${tool.slug}`}
      className="group flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight">
        {tool.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {tool.helps}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
