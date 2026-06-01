import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Hero — Vercel / Notion inspired. Centered, focused composition with a
 * full-bleed grid background, single bold headline, supporting subhead,
 * two CTAs, then the product mockup below. No rotating tickers, no
 * editorial italics, no asymmetric tricks.
 */
export function HeroSection({ authState }: { authState: MarketingAuthState }) {
  const authed = authState.isAuthenticated;

  return (
    <section className="relative isolate overflow-hidden border-b bg-background">
      {/* Background grid — the effect carried over from the old CTA band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,hsl(var(--foreground)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.06)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_30%,black_40%,transparent_85%)]"
      />
      {/* Soft top spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* Announcement pill */}
          <Link
            href="/changelog"
            className="group inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:border-foreground/20 hover:text-foreground"
          >
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              New
            </span>
            AI workflows are live in beta
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Headline — tight, single voice, no italics */}
          <h1 className="mt-7 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-[60px] lg:text-[76px]">
            One workspace to run
            <br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              your entire business.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-[16px] leading-[1.65] text-muted-foreground sm:text-[18px]">
            Stackivo brings clients, projects, tasks, documents, team
            collaboration, and AI workflows together — so your team ships
            faster without juggling six different tools.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            {authed ? (
              <Button asChild size="lg" className="h-11 w-full rounded-full px-6 text-[14.5px] font-medium sm:w-auto">
                <Link href="/dashboard" data-cta="hero_dashboard">
                  Open workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-11 w-full rounded-full px-6 text-[14.5px] font-medium sm:w-auto">
                  <Link href="/signup" data-cta="hero_primary">
                    Start for free <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-full border-border/80 bg-background/60 px-6 text-[14.5px] font-medium backdrop-blur sm:w-auto">
                  <Link href="/demo" data-cta="hero_demo">
                    <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                    Watch demo
                  </Link>
                </Button>
              </>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Free for up to 5 seats · No credit card required
          </p>
        </div>

        {/* Product mockup */}
        <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -inset-y-6 -z-10 rounded-[2.5rem] bg-gradient-to-b from-primary/15 via-violet-500/10 to-transparent blur-2xl"
          />
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl shadow-foreground/10 ring-1 ring-foreground/[0.04]">
            <DashboardMockup />
          </div>
        </div>

        {/* Trust row */}
        <div className="mt-14 flex flex-col items-center gap-4 sm:mt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            Trusted by teams building the next thing
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground/70 sm:gap-x-12">
            {LOGOS.map((name) => (
              <span key={name} className="tracking-tight">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const LOGOS = [
  "Northwind",
  "Atlas Collective",
  "Mercer & Bell",
  "Praxis Labs",
  "Holloway",
  "Sundial",
];
