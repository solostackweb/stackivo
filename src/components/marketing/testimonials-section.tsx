import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "./section";
import { Reveal } from "./motion";

/**
 * Social proof section — build-in-public positioning until we have
 * real freelancer quotes. Replace TESTIMONIALS array with real entries
 * as they come in: { quote, name, role, photoUrl, linkedInUrl?, twitterUrl? }
 */
export function TestimonialsSection() {
  return (
    <Section size="wide" className="relative border-y bg-muted/30">
      <Reveal>
        <SectionHeading
          eyebrow="Building in public"
          title="Be one of the first 100 freelancers on Stackivo."
          subtitle="We&rsquo;re early. Real quotes from real freelancers will live here as we onboard them — no stock photos, no placeholder names. If you want to be one, we&rsquo;d love to hear from you."
        />
      </Reveal>

      <Reveal className="mx-auto mt-12 max-w-2xl">
        <div className="relative overflow-hidden rounded-2xl border bg-card p-7 sm:p-8 lg:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Early access
            </span>
            <h3 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
              We answer support ourselves. We ship features you ask for.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Stackivo is built by a small team in India. There&rsquo;s no
              tier-one queue between you and the people who built the
              product — open the chat at the bottom-right or email{" "}
              <a
                href="mailto:hello@stackivo.me"
                className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
              >
                hello@stackivo.me
              </a>
              .
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:opacity-80"
              >
                What we believe <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:opacity-80"
              >
                Talk to us <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
