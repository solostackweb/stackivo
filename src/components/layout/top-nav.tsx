"use client";

import * as React from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { MobileNavTrigger } from "./mobile-nav";
import { UserNav } from "./user-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CommandPaletteTrigger } from "@/components/shared/command-palette";
import { NotificationsMenu } from "@/components/shared/notifications-menu";
import { Separator } from "@/components/ui/separator";

export function TopNav() {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/70 px-3 shadow-sm backdrop-blur-xl md:gap-3 md:px-6"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <MobileNavTrigger />

      {/* Mobile: compact brand mark only (no wordmark). The full Stackivo
          wordmark already lives in the navigation drawer header, so we
          don't need to repeat it in the always-visible top bar — that
          gives the page title and notifications room to breathe. */}
      <Link
        href="/dashboard"
        className="flex items-center md:hidden"
        aria-label="Stackivo home"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Zap className="h-4 w-4" />
        </span>
      </Link>

      {/* Desktop breadcrumbs */}
      <div className="hidden min-w-0 items-center gap-3 md:flex">
        <Breadcrumbs className="truncate" />
      </div>

      {/* Desktop command palette */}
      <div className="hidden flex-1 items-center justify-center px-2 md:flex">
        <CommandPaletteTrigger className="max-w-sm" />
      </div>

      {/* Flexible spacer on mobile so right cluster hugs the edge */}
      <div className="flex-1 md:hidden" />

      {/* Right cluster — theme toggle hidden on mobile (lives inside user menu) */}
      <div className="flex items-center gap-0.5 md:gap-1">
        <NotificationsMenu />
        <span className="hidden md:inline-flex">
          <ThemeToggle />
        </span>
        <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
        <UserNav />
      </div>
    </header>
  );
}
