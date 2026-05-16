import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MarketingAuthState } from "@/features/marketing/types";

export function CtaBand({
  authState,
}: {
  authState: MarketingAuthState;
}) {
  const authed = authState.isAuthenticated;

  return (
    <section className="relative isolate overflow-hidden border-y">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,hsl(var(--primary)/0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] [background-size:64px_64px] opacity-[0.16] [mask-image:radial-gradient(ellipse_50%_60%_at_50%_50%,#000,transparent_80%)]"
      />
      <div className="relative mx-auto w-full max-w-[1280px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-14 2xl:px-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[52px] lg:leading-[1.05]">
            {authed
              ? "Your workspace is ready when you are."
              : "Run your freelance business like a real one."}
          </h2>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            {authed
              ? authState.showUpgradeNudge
                ? "Need more clients? Upgrade inside Stackivo and keep your billing, usage, receipts, and plan controls in one place."
                : "Jump back into clients, invoices, contracts, projects, time, and Pulse without leaving the Stackivo flow."
              : "Start free in under 60 seconds. Five clients, every workflow, zero credit card."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {authed ? (
              <>
                <Button asChild size="lg" className="h-11 min-w-[190px]">
                  <Link href="/dashboard" data-cta="cta_band_dashboard">
                    Proceed to Dashboard <ArrowRight />
                  </Link>
                </Button>
                {authState.showUpgradeNudge ? (
                  <Button asChild variant="outline" size="lg" className="h-11 min-w-[170px]">
                    <Link
                      href="/dashboard/settings/billing?upgrade=clients"
                      data-cta="cta_band_upgrade"
                    >
                      Upgrade to Pro
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button asChild size="lg" className="h-11 min-w-[150px]">
                  <Link href="/signup" data-cta="cta_band_primary">
                    Start Free <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 min-w-[120px]">
                  <Link href="/login" data-cta="cta_band_login">Log in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
