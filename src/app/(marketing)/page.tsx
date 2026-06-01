import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { PainSection } from "@/components/marketing/pain-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { getMarketingAuthState } from "@/features/marketing/auth-state";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Stackivo — One workspace to run your entire business",
  description:
    "Stackivo brings clients, projects, tasks, documents, team collaboration, and AI workflows together — so modern teams ship faster without juggling six tools.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Stackivo — One workspace to run your entire business",
    description:
      "Clients, projects, tasks, documents, collaboration, and AI workflows in one connected workspace.",
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
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
      <HeroSection authState={authState} />
      <FeaturesSection />
      <PainSection />
      <FaqSection />
      <CtaBand authState={authState} />
    </>
  );
}
