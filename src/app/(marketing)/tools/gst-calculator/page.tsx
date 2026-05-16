import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/motion";
import { ToolHero, ToolFooter } from "@/features/tools/tool-page";
import { GstCalculator } from "@/features/tools/gst-calculator";
import { getToolMeta } from "@/features/tools/types";
import { siteConfig } from "@/config/site";

const meta = getToolMeta("gst-calculator")!;

export const metadata: Metadata = {
  title: "GST calculator (India) · CGST / SGST / IGST · Stackivo",
  description:
    "Free GST calculator for Indian freelancers and small businesses. Handles forward + reverse calculation, intra-state CGST/SGST split, and inter-state IGST.",
  alternates: { canonical: "/tools/gst-calculator" },
  openGraph: {
    title: "GST calculator (India)",
    description: meta.tagline,
    url: `${siteConfig.url}/tools/gst-calculator`,
  },
};

export default function GstCalculatorPage() {
  return (
    <>
      <ToolHero
        eyebrow={meta.eyebrow}
        title={meta.title}
        tagline={meta.tagline}
      />
      <Section size="default" className="pb-10">
        <Reveal>
          <GstCalculator />
        </Reveal>
      </Section>
      <ToolFooter
        toolSlug={meta.slug}
        ctaHeadline="Stop computing GST per invoice."
        ctaSubheadline="Stackivo computes CGST/SGST/IGST automatically on every invoice, handles place-of-supply, and generates GST-ready PDFs. Free forever for the first 5 clients."
      />
    </>
  );
}
