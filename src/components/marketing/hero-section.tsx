import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Hero — Stackivo positioning as the unified workspace for running an
 * entire business. Linear / Attio / Stripe tier composition.
 */
export function HeroSection({
  authState,
}: {
  authState: MarketingAuthState;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden sm:block">
        <div className="absolute -left-[10%] -top-[18%] h-[60%] w-[60%] rounded-full bg-gradient-to-br from-indigo-600/[0.18] via-violet-500/[0.10] to-transparent blur-3xl" />
        <div className="absolute right-[-12%] top-[-6%] h-[55%] w-[55%] rounded-full bg-gradient-to-bl from-violet-600/[0.14] via-fuchsia-500/[0.06] to-transparent blur-3xl" />
        <div className="absolute bottom-[-22%] left-[24%] h-[45%] w-[45%] rounded-full bg-gradient-to-t from-indigo-500/[0.09] to-transparent blur-3xl" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden sm:block opacity-[0.22] [background-image:radial-gradient(hsl(var(--primary)/0.55)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_75%_60%_at_55%_28%,#000,transparent_85%)]"
      />

      <div className="relative mx-auto w-full max-w-[1500px] px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-24 xl:px-14 2xl:px-20">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 xl:gap-20">
          <div className="max-w-xl text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-gradient-to-r from-primary/8 to-violet-500/6 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10 backdrop-blur-sm">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              The workspace for modern teams
            </span>

            <h1 className="mt-6 text-balance text-[40px] font-bold leading-[1.04] tracking-tight sm:text-[54px] lg:text-[62px] xl:text-[72px]">
              Run your entire business{" "}
              <span className="text-gradient">from one workspace.</span>
            </h1>

            <p className="mt-6 max-w-[40rem] text-pretty text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
              Stackivo brings clients, projects, tasks, documents, team
              collaboration, automations and AI-powered workflows into one
              unified platform — built for freelancers, agencies, startups,
              and growing businesses.
            </p>

            <HeroCtas authState={authState} />

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
                SOC-grade security
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary/70" />
                Set up in under 2 minutes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                AI workflows included
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[940px] overflow-hidden px-2 pb-6 pt-2 lg:max-w-none xl:overflow-visible xl:px-0 xl:pb-0 xl:pt-0">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-10 -top-14 -z-10 hidden h-[130%] rounded-[3rem] bg-gradient-to-b from-indigo-600/[0.16] via-violet-500/[0.07] to-transparent blur-3xl sm:block"
            />
            <DashboardMockup />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

function HeroCtas({ authState }: { authState: MarketingAuthState }) {
  if (authState.isAuthenticated) {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="btn-gradient h-12 min-w-[200px] rounded-full border-0 text-base"
        >
          <Link href="/dashboard" data-cta="hero_dashboard">
            Open workspace <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button
        asChild
        size="lg"
        className="btn-gradient h-12 min-w-[190px] rounded-full border-0 text-base"
      >
        <Link href="/signup" data-cta="hero_primary">
          Create workspace <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-12 min-w-[150px] rounded-full border-primary/25 text-base hover:border-primary/50 hover:bg-primary/5"
      >
        <Link href="/demo" data-cta="hero_demo">Book a demo</Link>
      </Button>
      <p className="text-xs font-medium text-muted-foreground sm:ml-2">
        Free to start · No credit card
      </p>
    </div>
  );
}
