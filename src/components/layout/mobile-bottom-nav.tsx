"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileSignature,
  Users,
  FolderKanban,
  Menu,
  Plus,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileNav } from "./mobile-nav-context";

/* ── Nav slots (2 left, 2 right of the FAB) ──────────────────────────── */
interface NavSlot {
  title: string;
  href?: string;
  icon: LucideIcon;
  isMenu?: boolean;
}

const LEFT_SLOTS: NavSlot[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Invoices", href: "/dashboard/invoices", icon: FileText },
];

const RIGHT_SLOTS: NavSlot[] = [
  { title: "Clients", href: "/dashboard/clients", icon: Users },
  { title: "More", icon: Menu, isMenu: true },
];

/* ── Quick-create actions ────────────────────────────────────────────── */
interface CreateAction {
  title: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const CREATE_ACTIONS: CreateAction[] = [
  {
    title: "New Invoice",
    href: "/dashboard/invoices/new",
    icon: FileText,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    title: "New Contract",
    href: "/dashboard/contracts/new",
    icon: FileSignature,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  {
    title: "New Client",
    href: "/dashboard/clients/new",
    icon: Users,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    title: "New Project",
    href: "/dashboard/projects/new",
    icon: FolderKanban,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
];

/* ── Component ───────────────────────────────────────────────────────── */

/**
 * Mobile bottom navigation — only visible below md breakpoint.
 *
 * Layout: [Home] [Invoices] [+FAB] [Clients] [More]
 *
 * The central + button floats above the bar and opens a quick-create sheet
 * (Invoice / Contract / Client / Project) inline — no full-screen navigation
 * needed for the most common creation flows.
 *
 * "More" drives the MobileNav sheet which renders the full nav tree.
 */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const { setOpen } = useMobileNav();
  const [createOpen, setCreateOpen] = React.useState(false);

  // Close create sheet on navigation
  React.useEffect(() => {
    setCreateOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <>
      {/* Backdrop — tapping outside closes the create sheet */}
      {createOpen && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden
          onClick={() => setCreateOpen(false)}
        />
      )}

      {/* Quick-create sheet — slides up from just above the nav bar */}
      <div
        aria-hidden={!createOpen}
        className={cn(
          "fixed inset-x-0 z-50 mx-auto max-w-sm px-3 transition-all duration-300 ease-out",
          createOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + 5rem)`,
        }}
      >
        <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
          {CREATE_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setCreateOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent active:bg-accent",
                  i > 0 && "border-t",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    action.iconBg,
                    action.iconColor,
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 text-[15px] font-semibold leading-snug">
                  {action.title}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 overflow-visible">
          {/* Left slots */}
          {LEFT_SLOTS.map((slot) => (
            <NavItem
              key={slot.title}
              slot={slot}
              active={!!slot.href && isActive(slot.href)}
            />
          ))}

          {/* Center FAB */}
          <li className="relative flex items-center justify-center overflow-visible">
            <button
              type="button"
              aria-label={createOpen ? "Close quick-create menu" : "Create new"}
              aria-expanded={createOpen}
              onClick={() => setCreateOpen((v) => !v)}
              className={cn(
                "-mt-5 flex h-14 w-14 items-center justify-center rounded-full",
                "bg-gradient-to-br from-primary to-indigo-600",
                "text-white shadow-lg shadow-primary/30",
                "transition-all duration-200 ease-out",
                "hover:shadow-xl hover:shadow-primary/40 hover:scale-105",
                "active:scale-95",
                createOpen && "rotate-45 scale-105",
              )}
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </li>

          {/* Right slots */}
          {RIGHT_SLOTS.map((slot) => (
            <NavItem
              key={slot.title}
              slot={slot}
              active={!!slot.href && isActive(slot.href)}
              onMenuClick={() => setOpen(true)}
            />
          ))}
        </ul>
      </nav>
    </>
  );
}

/* ── NavItem ─────────────────────────────────────────────────────────── */

function NavItem({
  slot,
  active,
  onMenuClick,
}: {
  slot: NavSlot;
  active: boolean;
  onMenuClick?: () => void;
}) {
  const Icon = slot.icon;

  const inner = (
    <span
      className={cn(
        "relative flex h-16 flex-col items-center justify-center gap-[3px]",
        "text-[10.5px] font-medium tracking-tight transition-colors duration-150",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* Active indicator pill at top */}
      <span
        aria-hidden
        className={cn(
          "absolute -top-px h-[2px] rounded-b-full bg-primary transition-all duration-200",
          active ? "w-8 opacity-100" : "w-0 opacity-0",
        )}
      />
      <Icon
        aria-hidden
        className={cn(
          "transition-all duration-150",
          active ? "h-5 w-5 scale-110" : "h-[18px] w-[18px]",
        )}
      />
      <span>{slot.title}</span>
    </span>
  );

  if (slot.isMenu) {
    return (
      <li>
        <button
          type="button"
          onClick={onMenuClick}
          className="w-full"
          aria-label="Open navigation menu"
        >
          {inner}
        </button>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={slot.href!}
        aria-current={active ? "page" : undefined}
        className="block w-full"
      >
        {inner}
      </Link>
    </li>
  );
}
