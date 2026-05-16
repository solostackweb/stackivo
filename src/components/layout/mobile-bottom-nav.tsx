"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Activity,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileNav } from "./mobile-nav-context";

interface BottomNavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  isMenu?: boolean;
}

const BOTTOM_NAV: BottomNavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { title: "Clients", href: "/dashboard/clients", icon: Users },
  { title: "Pulse", href: "/dashboard/pulse", icon: Activity },
  { title: "More", icon: Menu, isMenu: true },
];

/**
 * Fixed bottom navigation for the mobile PWA shell. Surfaces the four most
 * important destinations and a "More" trigger that hands control off to the
 * full drawer (`MobileNav`).
 *
 * Reads the menu-open setter directly from `useMobileNav` so the parent
 * shell doesn't need to thread it as a prop (and can stay a Server
 * Component).
 *
 * Honors iOS safe-area insets so the bar doesn't sit under the home indicator.
 */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const { setOpen } = useMobileNav();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            !item.isMenu && item.href
              ? item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)
              : false;

          const content = (
            <span
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium tracking-tight transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -top-px h-[2px] w-8 rounded-b-full bg-primary"
                />
              )}
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              <span>{item.title}</span>
            </span>
          );

          return (
            <li key={item.title} className="relative">
              {item.isMenu ? (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="w-full"
                  aria-label="Open navigation menu"
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={item.href!}
                  aria-current={active ? "page" : undefined}
                  className="block w-full"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
