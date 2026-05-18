import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "./dashboard-mockup";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Hero section.
 *
 * Server-rendered for fast LCP. We deliberately do NOT use framer-motion
 * entrance animations on above-the-fold content — they delay perceived
 * paint, cause an `opacity: 0` flash before hydration, and conflict with
 * `text-balance` reflow. The hero now renders fully styled on first paint.
 *
 * Decorative effects (gradient mesh, masked grid, glow halo, badge ping)
 * are pure CSS, gated by viewport so mobile devices don't pay the blur
 * cost. `prefers-reduced-motion` neutralises the badge ping globally
 * (see globals.css).
 */
export function HeroSection({
  authState,
}: {
  authState: MarketingAuthState;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b bg-background">
      {/* Gradient mesh — desktop-only, smaller blur radius for mobile-friendly compositor cost */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden sm:block"
      >
        <div className="absolute -left-[10%] top-[-15%] h-[50%] w-[50%] rounded-full bg-primary/[0.12] blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-[45%] w-[45%] rounded-full bg-indigo-500/[0.08] blur-3xl" />
        <div className="absolute bottom-[-15%] left-[18%] h-[40%] w-[40%] rounded-full bg-violet-500/[0.06] blur-3xl" />
      </div>

      {/* Subtle grid masked to the upper-middle — desktop-only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden sm:block [background-image:linear-gradient(to_right,hsl(var(--border)/0.45)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.45)_1px,transparent_1px)] [background-size:56px_56px] opacity-[0.18] [mask-image:radial-gradient(ellipse_68%_56%_at_58%_30%,#000,transparent_82%)]"
      />

      <div className="relative mx-auto w-full max-w-[1500px] px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-24 xl:px-14 2xl:px-20">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 xl:gap-20">
          {/* Copy */}
          <div className="max-w-xl text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Freelancer operating system · For every independent professional
            </span>

            <h1 className="mt-7 text-balance text-[38px] font-bold leading-[1.05] tracking-tight sm:text-[52px] lg:text-[60px] xl:text-[68px]">
              The operating system for{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                independent
              </span>{" "}
              work
            </h1>

            <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              One workspace for clients, invoices, contracts, projects, time
              tracking, and payments &mdash; built for freelancers, creators,
              consultants, and small studios. GST when you need it, simple
              invoices when you don&apos;t.{" "}
              <span className="font-medium text-foreground">
                Free forever for the first 5 clients.
              </span>
            </p>

            <HeroCtas authState={authState} />

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <TrustItem icon={Receipt} label="Simple or GST invoices" />
              <TrustItem icon={Database} label="Daily backups · TLS encryption" />
              <TrustItem icon={CreditCard} label="No card to start" />
            </div>
          </div>

          {/* Dashboard mockup — static. Wrapper clips decorative bleed on
              tablet/medium widths where there isn't room for the floating cards
              to live outside the column. Bleed is restored at xl+ where the
              grid is wide enough to carry it. */}
          <div className="relative mx-auto w-full max-w-[940px] overflow-hidden px-2 pb-6 pt-2 lg:max-w-none xl:overflow-visible xl:px-0 xl:pb-0 xl:pt-0">
            {/* Glow halo — desktop-only, cheaper blur radius */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-10 -top-10 -z-10 hidden h-[120%] rounded-[3rem] bg-gradient-to-b from-primary/[0.15] via-indigo-500/[0.06] to-transparent blur-3xl sm:block"
            />

            {/* Status bar */}
            <div className="mb-4 flex items-center justify-between rounded-xl border bg-card/80 px-5 py-3.5 shadow-lg shadow-primary/[0.04] backdrop-blur-md">
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

            {/* Floating accent card — only at xl+ where the wrapper releases
                overflow. Below xl we keep it hidden so it never bleeds. */}
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
    <span className="inline-flex items-center gap-1.5 font-medium">
      <Icon className="h-4 w-4 text-primary" />
      {label}
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
          className="h-12 min-w-[200px] text-base shadow-lg shadow-primary/20"
        >
          <Link href="/dashboard" data-cta="hero_dashboard">
            Proceed to Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        {authState.showUpgradeNudge ? (
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 min-w-[180px] text-base"
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
        className="h-12 min-w-[170px] text-base shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/25"
      >
        <Link href="/signup" data-cta="hero_primary">
          Start Free <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-12 min-w-[140px] text-base"
      >
        <Link href="/login" data-cta="hero_login">Log In</Link>
      </Button>
    </div>
  );
}
