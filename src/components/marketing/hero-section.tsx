import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Hero section — premium freelancer brand positioning.
 *
 * Framing: personal, aspirational, outcome-first. Not "OS for work" but
 * "the workflow built for how freelancers actually work."
 *
 * Server-rendered for fast LCP. No framer-motion on above-the-fold content.
 * All decorative effects are pure CSS, desktop-gated for perf.
 */
export function HeroSection({
  authState,
}: {
  authState: MarketingAuthState;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b bg-background">
      {/* Gradient mesh — desktop-only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden sm:block"
      >
        <div className="absolute -left-[10%] top-[-15%] h-[50%] w-[50%] rounded-full bg-primary/[0.11] blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-[42%] w-[42%] rounded-full bg-indigo-500/[0.07] blur-3xl" />
        <div className="absolute bottom-[-15%] left-[18%] h-[38%] w-[38%] rounded-full bg-violet-500/[0.055] blur-3xl" />
      </div>

      {/* Masked dot grid — desktop-only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden sm:block [background-image:linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:56px_56px] opacity-[0.16] [mask-image:radial-gradient(ellipse_68%_56%_at_58%_30%,#000,transparent_82%)]"
      />

      <div className="relative mx-auto w-full max-w-[1500px] px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-24 xl:px-14 2xl:px-20">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 xl:gap-20">

          {/* Copy */}
          <div className="max-w-xl text-left">
            {/* Eyebrow badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Built for freelancers, consultants &amp; studios
            </span>

            <h1 className="mt-6 text-balance text-[38px] font-bold leading-[1.06] tracking-tight sm:text-[50px] lg:text-[58px] xl:text-[64px]">
              Your freelance business,{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                finally in one place
              </span>
            </h1>

            <p className="mt-5 max-w-[38rem] text-pretty text-base leading-[1.75] text-muted-foreground sm:text-lg">
              Clients, invoices, contracts, projects, time tracking — one
              clean workspace that runs the operational side of your work.
              Simple invoices or full GST, your call.{" "}
              <span className="font-medium text-foreground">
                Free for your first 5 clients, always.
              </span>
            </p>

            <HeroCtas authState={authState} />

            {/* Trust row */}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5">
              <TrustItem icon={Receipt} label="Simple &amp; GST invoices" />
              <TrustItem icon={ShieldCheck} label="TLS · daily backups" />
              <TrustItem icon={CreditCard} label="No card required" />
            </div>
          </div>

          {/* Dashboard visual */}
          <div className="relative mx-auto w-full max-w-[940px] overflow-hidden px-2 pb-6 pt-2 lg:max-w-none xl:overflow-visible xl:px-0 xl:pb-0 xl:pt-0">
            {/* Glow halo */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-10 -top-10 -z-10 hidden h-[120%] rounded-[3rem] bg-gradient-to-b from-primary/[0.13] via-indigo-500/[0.05] to-transparent blur-3xl sm:block"
            />

            {/* Status bar */}
            <div className="mb-3.5 flex items-center justify-between rounded-xl border bg-card/80 px-5 py-3.5 shadow-lg shadow-primary/[0.04] backdrop-blur-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Today in Stackivo
                </p>
                <p className="mt-0.5 truncate text-sm font-medium">
                  3 invoices pending · 18.5h tracked · 1 contract awaiting signature
                </p>
              </div>
              <CheckCircle2 className="ml-3 hidden h-5 w-5 shrink-0 text-emerald-500 sm:block" />
            </div>

            <DashboardMockup />

            {/* Floating accent card — xl+ only */}
            <div className="pointer-events-none absolute -bottom-4 right-2 hidden items-center gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md xl:-right-6 xl:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/30">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pulse
                </p>
                <p className="text-sm font-semibold">+24% this quarter</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary/70" />
      <span dangerouslySetInnerHTML={{ __html: label }} />
    </span>
  );
}

function HeroCtas({ authState }: { authState: MarketingAuthState }) {
  if (authState.isAuthenticated) {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="h-12 min-w-[200px] rounded-full text-base shadow-lg shadow-primary/20"
        >
          <Link href="/dashboard" data-cta="hero_dashboard">
            Go to dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        {authState.showUpgradeNudge ? (
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 min-w-[160px] rounded-full text-base"
          >
            <Link
              href="/dashboard/settings/billing?upgrade=clients"
              data-cta="hero_upgrade"
            >
              Upgrade to Pro
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button
        asChild
        size="lg"
        className="h-12 min-w-[170px] rounded-full text-base shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/25"
      >
        <Link href="/signup" data-cta="hero_primary">
          Start for free <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="h-12 min-w-[130px] rounded-full text-base text-muted-foreground hover:text-foreground"
      >
        <Link href="/pricing" data-cta="hero_pricing">See pricing</Link>
      </Button>
    </div>
  );
}
