"use client";

import * as React from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { StackivoMark } from "@/components/brand/stackivo-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { primaryNav, secondaryNav } from "@/constants/navigation";
import { SidebarNav } from "./sidebar-nav";
import { useProfile } from "@/features/profile/context";
import { getDisplayName, getInitials } from "@/features/profile/utils";

export function AppSidebar() {
  // Collapsed state self-managed; survives navigations because the sidebar
  // is rendered by the persistent dashboard layout, not by any page.
  const [collapsed, setCollapsed] = React.useState(false);
  const onToggle = React.useCallback(() => setCollapsed((v) => !v), []);

  const { profile, subscription } = useProfile();
  const workspaceName =
    profile?.businessName?.trim() ||
    profile?.legalName?.trim() ||
    getDisplayName(profile) ||
    "Your workspace";
  const workspaceInitials = getInitials(workspaceName);
  const plan = subscription?.plan ?? "free";

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen sticky top-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[278px]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 items-center px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 font-semibold"
          aria-label="Stackivo home"
        >
          <StackivoMark className="h-7 w-7" />
          {!collapsed && (
            <span className="text-[15px] font-semibold tracking-tight">
              Stackivo
            </span>
          )}
        </Link>
      </div>

      {/* Primary nav */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 pt-1">
        {!collapsed && (
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Workspace
          </p>
        )}
        <SidebarNav items={primaryNav} collapsed={collapsed} />
      </div>

      {/* Secondary nav */}
      <div className="px-2 pb-2">
        <Separator className="mb-2 bg-sidebar-border" />
        {!collapsed && (
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Account
          </p>
        )}
        <SidebarNav items={secondaryNav} collapsed={collapsed} />
      </div>

      {/* Workspace identity */}
      <div className="border-t border-sidebar-border p-2">
        {!collapsed ? (
          <Link
            href="/dashboard/settings/company"
            className="group flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-sidebar-accent"
          >
            <div
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-indigo-500/15 text-[11px] font-bold text-primary ring-1 ring-primary/15"
            >
              {workspaceInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight">
                {workspaceName}
              </p>
              <p className="truncate text-[11px] capitalize leading-tight text-muted-foreground">
                {plan} plan
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href="/dashboard/settings/company"
            aria-label={`${workspaceName} · ${plan} plan`}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-indigo-500/15 text-[11px] font-bold text-primary ring-1 ring-primary/15 transition-colors hover:from-primary/20 hover:to-indigo-500/20"
          >
            {workspaceInitials}
          </Link>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-full text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
