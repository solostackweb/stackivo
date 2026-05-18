import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StackivoLogo, StackivoMark } from "@/components/brand/stackivo-logo";

/**
 * Premium split-screen auth layout. Brand panel + value props on the left,
 * the actual form on the right. Collapses to a single column on mobile.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left brand panel — desktop only */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex xl:px-14">
        {/* Layered gradient mesh */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-[18%] -top-[22%] h-[70%] w-[70%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute -bottom-[12%] -right-[12%] h-[60%] w-[60%] rounded-full bg-indigo-500/15 blur-[110px]" />
          <div className="absolute left-[28%] top-[45%] h-[40%] w-[40%] rounded-full bg-violet-500/10 blur-[90px]" />
        </div>

        {/* Subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:60px_60px]"
        />

        <div className="relative z-10">
          <Link
            href="/"
            aria-label="Stackivo home"
            className="inline-flex items-center gap-2.5 font-bold tracking-tight text-white"
          >
            <StackivoMark className="h-9 w-9 rounded-xl shadow-lg shadow-primary/30" />
            <span className="text-lg">Stackivo</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-10">
          <blockquote className="text-xl font-medium leading-relaxed text-white/90 xl:text-[22px] xl:leading-snug">
            &ldquo;I went from three tools and a spreadsheet to one workspace.
            Sending invoices is finally pleasant.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold ring-1 ring-white/20">
              AM
            </div>
            <div>
              <p className="text-sm font-medium text-white">Aanya Mehta</p>
              <p className="text-xs text-white/50">
                Brand designer · Bengaluru
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <TrustPill icon={Receipt} label="Simple or GST invoices" />
            <TrustPill icon={Users} label="Unlimited workflows" />
            <TrustPill icon={BarChart3} label="Pulse analytics" />
            <TrustPill icon={ShieldCheck} label="Secure by default" />
          </div>
        </div>

        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </aside>

      {/* Right form panel */}
      <main
        className="relative flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 3rem)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 3rem)",
        }}
      >
        <div className="mb-8 flex justify-center lg:hidden">
          <Link href="/" aria-label="Stackivo home">
            <StackivoLogo />
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

function TrustPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
