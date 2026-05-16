import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/motion";
import { ToolHero, ToolFooter } from "@/features/tools/tool-page";
import { LatePaymentCalculator } from "@/features/tools/late-payment-calculator";
import { getToolMeta } from "@/features/tools/types";
import { siteConfig } from "@/config/site";

const meta = getToolMeta("late-payment-interest-calculator")!;

export const metadata: Metadata = {
  title: "Late payment interest calculator (MSMED Act) · Stackivo",
  description:
    "Free calculator to compute interest a client owes on an overdue invoice — per MSMED Act §16 (18% compound default) or your own contract rate. Built by Stackivo.",
  alternates: { canonical: "/tools/late-payment-interest-calculator" },
  openGraph: {
    title: "Late payment interest calculator",
    description: meta.tagline,
    url: `${siteConfig.url}/tools/late-payment-interest-calculator`,
  },
};

export default function LatePaymentCalculatorPage() {
  return (
    <>
      <ToolHero
        eyebrow={meta.eyebrow}
        title={meta.title}
        tagline={meta.tagline}
      />
      <Section size="default" className="pb-10">
        <Reveal>
          <LatePaymentCalculator />
        </Reveal>
      </Section>
      <ToolFooter
        toolSlug={meta.slug}
        ctaHeadline="Stop chasing late payers manually."
        ctaSubheadline="Stackivo auto-reminds clients before AND after the due date, then escalates with overdue-tag emails. Free forever for the first 5 clients."
      />
    </>
  );
}
