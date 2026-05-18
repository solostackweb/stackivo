import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { WorkflowSection } from "@/components/marketing/workflow-section";
import { GstSection } from "@/components/marketing/gst-section";
import { PainSection } from "@/components/marketing/pain-section";
import { PulseSection } from "@/components/marketing/pulse-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { FounderNote } from "@/components/marketing/founder-note";
import { getMarketingAuthState } from "@/features/marketing/auth-state";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Stackivo — The operating system for independent work",
  description:
    "Stackivo helps freelancers, creators, consultants, and small studios manage clients, invoicing, contracts, projects, payments, time tracking, and analytics from one professional workspace. Simple or GST invoices — your call.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Stackivo — The operating system for independent work",
    description:
      "Clients, invoices, contracts, projects, time tracking, and payments — one workspace, built for every independent professional.",
    url: siteConfig.url,
  },
};

export default async function LandingPage() {
  const authState = await getMarketingAuthState();

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Stackivo",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: siteConfig.description,
            url: siteConfig.url,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
            },
          }),
        }}
      />
      <HeroSection authState={authState} />
      {/* Pain-first: lead with the problem the visitor recognises before
          parading the tooling. Features-first ordering reads as "we are a
          feature list"; pain-first creates relevance + emotional hook. */}
      <PainSection />
      <FeaturesSection />
      <WorkflowSection />
      <GstSection />
      <PulseSection />
      <FounderNote />
      <TestimonialsSection />
      <FaqSection />
      <CtaBand authState={authState} />
    </>
  );
}
