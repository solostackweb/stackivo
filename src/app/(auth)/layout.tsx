import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Workflow,
  Layers,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StackivoLogo, StackivoMark } from "@/components/brand/stackivo-logo";

/**
 * Premium split-screen auth layout.
 * Dark brand panel on the left with social proof, clean form on the right.
 * Collapses to single column on mobile with logo at top.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Left brand panel — desktop only */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-[#0a0a0f] px-10 py-12 text-white lg:flex xl:w-[42%] xl:px-14">
        {/* Multi-layer gradient mesh */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-[20%] -top-[20%] h-[65%] w-[65%] rounded-full bg-primary/[0.18] blur-[130px]" />
          <div className="absolute -bottom-[15%] -right-[15%] h-[55%] w-[55%] rounded-full bg-indigo-500/[0.14] blur-[110px]" />
          <div className="absolute left-[30%] top-[50%] h-[35%] w-[35%] rounded-full bg-violet-600/[0.10] blur-[85px]" />
        </div>

        {/* Fine grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:52px_52px]"
        />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Link
            href="/"
            aria-label="Stackivo home"
            className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-white"
          >
            <StackivoMark className="h-9 w-9 rounded-xl shadow-lg shadow-primary/30" />
            <span className="text-[17px]">Stackivo</span>
          </Link>
        </div>

        {/* Middle: Testimonial + social proof */}
        <div className="relative z-10 space-y-9">
          {/* Star rating */}
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-amber-400 text-amber-400"
              />
            ))}
            <span className="ml-2.5 text-xs font-medium text-white/50">
              Trusted by modern teams
            </span>
          </div>

          <blockquote className="space-y-5">
            <p className="text-[19px] font-medium leading-[1.5] text-white/90 xl:text-xl xl:leading-relaxed">
              &ldquo;We replaced four tools with Stackivo. Clients, projects,
              docs, and automations all live together — our team finally
              works in one place.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-indigo-500/40 text-sm font-semibold ring-1 ring-white/15">
                RK
              </div>
              <div>
                <p className="text-sm font-medium text-white">Riya Kapoor</p>
                <p className="text-[12px] text-white/40">
                  Founder · Northwind Studio
                </p>
              </div>
            </div>
          </blockquote>

          <div className="space-y-2.5 pt-1">
            <ValueProp icon={Layers} label="Clients, projects, and documents in one place" />
            <ValueProp icon={Workflow} label="Automations that move work forward" />
            <ValueProp icon={Sparkles} label="AI workflows grounded in your workspace" />
          </div>
        </div>

        {/* Bottom: Back link */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/50 transition-colors hover:text-white/90"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </aside>

      {/* Right form panel */}
      <main
        className="relative flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 3rem)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 3rem)",
        }}
      >
        {/* Mobile logo — hidden on desktop where the brand panel handles it */}
        <div className="mb-10 flex justify-center lg:hidden">
          <Link href="/" aria-label="Stackivo home">
            <StackivoLogo />
          </Link>
        </div>
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  );
}

function ValueProp({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.08] ring-1 ring-white/10">
        <Icon className="h-3.5 w-3.5 text-white/70" />
      </span>
      <span className="text-[13px] text-white/60">{label}</span>
    </div>
  );
}
