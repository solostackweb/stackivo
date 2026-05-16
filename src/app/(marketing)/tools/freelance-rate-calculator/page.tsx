import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/motion";
import { ToolHero, ToolFooter } from "@/features/tools/tool-page";
import { FreelanceRateCalculator } from "@/features/tools/freelance-rate-calculator";
import { getToolMeta } from "@/features/tools/types";
import { siteConfig } from "@/config/site";

const meta = getToolMeta("freelance-rate-calculator")!;

export const metadata: Metadata = {
  title: "Freelance hourly rate calculator (India) · Stackivo",
  description:
    "Free calculator that tells you the minimum hourly rate you must charge to hit your annual take-home income, given realistic billable hours and business expenses.",
  alternates: { canonical: "/tools/freelance-rate-calculator" },
  openGraph: {
    title: "Freelance hourly rate calculator",
    description: meta.tagline,
    url: `${siteConfig.url}/tools/freelance-rate-calculator`,
  },
};

export default function FreelanceRateCalculatorPage() {
  return (
    <>
      <ToolHero
        eyebrow={meta.eyebrow}
        title={meta.title}
        tagline={meta.tagline}
      />
      <Section size="default" className="pb-10">
        <Reveal>
          <FreelanceRateCalculator />
        </Reveal>
      </Section>
      <ToolFooter
        toolSlug={meta.slug}
        ctaHeadline="Now go bill at the right rate."
        ctaSubheadline="Stackivo turns the hourly rate above into GST-ready invoices, with automated reminders so clients actually pay. Free forever for your first 5 clients."
      />
    </>
  );
}
