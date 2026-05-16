import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/motion";
import { Button } from "@/components/ui/button";
import { NewsletterForm } from "@/components/marketing/newsletter-form";

/**
 * Shared chrome for a /tools/<slug> page.
 *
 * Calculators consist of three vertically-stacked sections:
 *   - `<ToolHero/>`   — eyebrow / title / tagline (server-rendered)
 *   - `<ToolBody/>`   — the actual calculator UI (client component)
 *   - `<ToolFooter/>` — CTA to start free + newsletter capture (server)
 *
 * All three are pinned by the parent page; this file is just helpers
 * + the closing CTA component.
 */

interface ToolHeroProps {
  eyebrow?: string;
  title: string;
  tagline: string;
}

export function ToolHero({ eyebrow, title, tagline }: ToolHeroProps) {
  return (
    <Section size="default" className="pt-24 sm:pt-32 lg:pt-36">
      <div className="mx-auto max-w-2xl text-center">
        {eyebrow ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Free tool · {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          {tagline}
        </p>
      </div>
    </Section>
  );
}

/**
 * Closing CTA shown after every calculator.
 *
 * Two complementary actions:
 *  - Primary: "Continue inside Stackivo" → /signup (the high-intent
 *    visitor who just got value from the tool is the best signup
 *    moment we have).
 *  - Secondary: newsletter capture for the visitor who isn't ready
 *    to sign up but wants to stay in touch.
 */
export function ToolFooter({
  toolSlug,
  ctaHeadline = "Use Stackivo to do the rest.",
  ctaSubheadline = "Stackivo invoices your clients, tracks payments, and reminds you when something's overdue — automatically.",
}: {
  toolSlug: string;
  ctaHeadline?: string;
  ctaSubheadline?: string;
}) {
  return (
    <>
      <Section size="default" className="pb-10 pt-20 sm:pt-24">
        <Reveal>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              {ctaHeadline}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {ctaSubheadline}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-11">
                <Link href="/signup" data-cta={`tool_${toolSlug}_signup`}>
                  Start free <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11">
                <Link href="/pricing" data-cta={`tool_${toolSlug}_pricing`}>
                  See pricing
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section size="default" className="pb-20">
        <Reveal>
          <div className="mx-auto max-w-xl rounded-xl border bg-muted/20 p-6 text-center">
            <p className="text-sm font-medium">
              Get one practical India-freelancer tip a month.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pricing benchmarks, GST changes, contract templates. No spam.
            </p>
            <div className="mt-4 flex justify-center">
              <NewsletterForm
                source={`tool_${toolSlug}`}
                ctaLabel="Subscribe"
                successLabel="Subscribed. Talk soon."
              />
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
