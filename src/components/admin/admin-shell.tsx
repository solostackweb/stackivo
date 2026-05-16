/**
 * Founder Console chrome.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ topbar  Now · Users · Audit · ...        avatar     │
 *   ├──────────┬──────────────────────────────────────────┤
 *   │ sidebar  │ page content                             │
 *   │ (md+)    │                                          │
 *   └──────────┴──────────────────────────────────────────┘
 *
 * Mobile: sidebar collapses to a sheet behind a top-bar hamburger.
 *
 * Density is the differentiating principle — smaller font, tighter
 * spacing, monospace timestamps. This is not the customer surface.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  ClipboardList,
  CreditCard,
  FileText,
  Files,
  Flag,
  Gauge,
  LineChart,
  LifeBuoy,
  Mail,
  Menu,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Terminal,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CommandPalette,
  useCommandPaletteShortcut,
} from "./command-palette";

interface AdminShellProps {
  children: React.ReactNode;
  /** Email of the currently-authenticated admin (right-side label). */
  adminEmail: string;
  /** When set, renders the persistent view-as banner across all routes. */
  viewingAs?: { id: string; name: string; email: string } | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Operate",
    items: [
      { href: "/admin", label: "Now", icon: Gauge },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/admin/emails", label: "Emails", icon: Mail },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    heading: "Inspect",
    items: [
      { href: "/admin/invoices", label: "Invoices", icon: FileText },
      { href: "/admin/contracts", label: "Contracts", icon: ShieldCheck },
      { href: "/admin/files", label: "Files", icon: Files },
      { href: "/admin/security", label: "Security", icon: Shield },
      { href: "/admin/audit", label: "Audit", icon: ClipboardList },
      { href: "/admin/query", label: "SQL", icon: Terminal },
    ],
  },
  {
    heading: "Meta",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: LineChart },
      { href: "/admin/flags", label: "Flags", icon: Flag },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ children, adminEmail, viewingAs }: AdminShellProps) {
  const pathname = usePathname() ?? "";
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  useCommandPaletteShortcut(setPaletteOpen);

  // Close the mobile sidebar + palette on navigation.
  React.useEffect(() => {
    setSidebarOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-[14px]">
      {viewingAs ? <ViewAsBanner viewingAs={viewingAs} /> : null}

      <TopBar
        adminEmail={adminEmail}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="flex flex-1">
        <Sidebar pathname={pathname} mobileOpen={sidebarOpen} />

        {/* Mobile backdrop */}
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          />
        ) : null}

        <main className="flex-1 px-4 py-5 sm:px-6 md:px-8 max-w-screen-xl mx-auto w-full">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Mobile palette FAB — desktop uses the top-bar search bar instead. */}
      <button
        type="button"
        aria-label="Open command palette"
        onClick={() => setPaletteOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full border bg-background shadow-lg hover:bg-accent md:hidden"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TopBar({
  adminEmail,
  sidebarOpen,
  onToggleSidebar,
  onOpenPalette,
}: {
  adminEmail: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenPalette: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-12 items-center gap-3 px-4 sm:px-6 md:px-8 max-w-screen-xl mx-auto w-full">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        <Link
          href="/admin"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Shield className="h-4 w-4" />
          <span>Console</span>
          <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
            stackivo
          </span>
        </Link>

        <button
          type="button"
          className="ml-2 hidden h-7 flex-1 max-w-sm items-center gap-2 rounded border bg-muted/40 px-2 text-xs text-muted-foreground hover:bg-muted sm:flex"
          onClick={onOpenPalette}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search users · jump anywhere…</span>
          <span className="ml-auto rounded border bg-background/80 px-1 text-[10px] font-medium tracking-wider">
            ⌘K
          </span>
        </button>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <ArrowLeft className="h-3 w-3" />
            Customer app
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {adminEmail}
          </span>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------

function Sidebar({
  pathname,
  mobileOpen,
}: {
  pathname: string;
  mobileOpen: boolean;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 mt-12 w-56 shrink-0 transform border-r border-border/60 bg-background transition-transform md:relative md:mt-0 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <nav className="flex flex-col gap-3 p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="flex flex-col gap-0.5">
            <div className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.heading}
            </div>
            {group.items.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-border/60 px-3 py-3 text-[11px] text-muted-foreground">
        ⌘K to search
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------

function ViewAsBanner({
  viewingAs,
}: {
  viewingAs: { id: string; name: string; email: string };
}) {
  return (
    <div className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100">
      <div className="flex items-center justify-between gap-3 px-4 py-1.5 text-xs sm:px-6 md:px-8 max-w-screen-xl mx-auto w-full">
        <span>
          Viewing as <strong>{viewingAs.name}</strong> ({viewingAs.email}).
          Writes are disabled.
        </span>
        <form
          action="/api/admin/view-as/stop"
          method="post"
          className="inline"
        >
          <button
            type="submit"
            className="rounded border border-amber-600/40 px-2 py-0.5 hover:bg-amber-500/20"
          >
            Exit
          </button>
        </form>
      </div>
    </div>
  );
}
