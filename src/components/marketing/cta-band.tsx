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
    <section className="relative isolate overflow-hidden border-y border-primary/10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/[0.10] via-violet-500/[0.06] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tl from-violet-600/[0.08] via-transparent to-transparent" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18] [background-image:radial-gradient(hsl(var(--primary)/0.5)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_55%_65%_at_50%_50%,#000,transparent_82%)]"
      />
      <div className="relative mx-auto w-full max-w-[1280px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28 xl:px-14 2xl:px-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-[42px] lg:text-[54px] lg:leading-[1.04] lg:tracking-[-0.025em]">
            {authed
              ? <>Your workspace is <span className="text-gradient">ready when you are.</span></>
              : <>Run your business <span className="text-gradient">from one workspace.</span></>}
          </h2>
          <p className="mt-5 text-pretty text-base leading-[1.8] text-muted-foreground sm:text-[17px]">
            {authed
              ? "Jump back into clients, projects, documents, and AI workflows without leaving the Stackivo flow."
              : "Create your workspace in minutes. Bring your clients, projects, and team into one connected platform — free to start, no credit card."}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {authed ? (
              <Button asChild size="lg" className="btn-gradient h-12 min-w-[200px] rounded-full border-0">
                <Link href="/dashboard" data-cta="cta_band_dashboard">
                  Open workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="btn-gradient h-12 min-w-[200px] rounded-full border-0">
                  <Link href="/signup" data-cta="cta_band_primary">
                    Create workspace <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 min-w-[150px] rounded-full border-primary/25 hover:border-primary/50 hover:bg-primary/5">
                  <Link href="/demo" data-cta="cta_band_demo">Book a demo</Link>
                </Button>
              </>
            )}
          </div>
          <p className="mt-5 text-xs text-muted-foreground/60">No credit card required · Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}
