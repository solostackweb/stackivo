"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { StackivoLogo } from "@/components/brand/stackivo-logo";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MarketingAuthState } from "@/features/marketing/types";

/**
 * Top navigation for every public marketing page. Sticky, glass effect on
 * scroll, mobile sheet menu on small screens. Conversion CTAs (`Log in` +
 * `Start free`) sit on the right at every breakpoint.
 */
export function MarketingHeader({
  authState,
}: {
  authState: MarketingAuthState;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/75 shadow-sm shadow-primary/[0.04] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:h-16 lg:px-10 xl:px-14 2xl:px-20">
        <Link
          href="/"
          aria-label="Stackivo home"
          className="flex items-center gap-2 font-bold tracking-tight"
        >
          <StackivoLogo />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground",
                pathname === l.href && "text-foreground",
              )}
            >
              {pathname === l.href ? (
                <motion.span
                  layoutId="headerNavPill"
                  className="absolute inset-0 -z-10 rounded-lg bg-primary/8"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.55 }}
                />
              ) : null}
              {l.label}
            </Link>
          ))}
        </nav>

        <HeaderCtas authState={authState} />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-14 items-center border-b px-5 font-semibold">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                aria-label="Stackivo home"
                className="flex items-center gap-2"
              >
                <StackivoLogo />
              </Link>
            </div>
            <div className="flex flex-col gap-1 p-3">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-2 border-t" />
              <MobileCtas authState={authState} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

const NAV_LINKS = [
  { href: "/#features", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#workflow", label: "Workflows" },
  { href: "/about", label: "Company" },
];

function HeaderCtas({ authState }: { authState: MarketingAuthState }) {
  if (authState.isAuthenticated) {
    return (
      <div className="hidden items-center gap-3 md:flex">
        <Button asChild size="sm">
          <Link href="/dashboard" data-cta="header_dashboard">Open workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 md:flex">
      <Link
        href="/login"
        data-cta="header_login"
        className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Log in
      </Link>
      <Link
        href="/demo"
        data-cta="header_demo"
        className="hidden rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
      >
        Book demo
      </Link>
      <Button
        asChild
        size="sm"
        className="btn-gradient h-9 rounded-full border-0 px-4 text-[13px] font-semibold"
      >
        <Link href="/signup" data-cta="header_primary">Create workspace →</Link>
      </Button>
    </div>
  );
}

function MobileCtas({
  authState,
  onNavigate,
}: {
  authState: MarketingAuthState;
  onNavigate: () => void;
}) {
  if (authState.isAuthenticated) {
    return (
      <div className="space-y-2">
        {authState.showUpgradeNudge ? (
          <Link
            href="/dashboard/settings/billing?upgrade=clients"
            onClick={onNavigate}
            className="block rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Upgrade to Pro
          </Link>
        ) : null}
        <Button asChild className="w-full justify-center">
          <Link href="/dashboard" onClick={onNavigate}>
            Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Button asChild>
        <Link href="/signup" onClick={onNavigate} data-cta="mobile_menu_primary">
          Start free — it's free
        </Link>
      </Button>
      <Button asChild variant="ghost" className="justify-start text-muted-foreground">
        <Link href="/login" onClick={onNavigate} data-cta="mobile_menu_login">
          Log in
        </Link>
      </Button>
      <div className="my-1 border-t" />
      <Link
        href="/portal-access"
        onClick={onNavigate}
        className="px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Client? Access your portal →
      </Link>
    </div>
  );
}
