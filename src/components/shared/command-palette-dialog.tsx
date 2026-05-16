"use client";

/**
 * Command palette dialog body.
 *
 * This module pulls in `cmdk` (~14 KB gzipped) and the full nav graph. It
 * is intentionally a SEPARATE file from `command-palette.tsx` so the
 * trigger can dynamically import it via `next/dynamic` — `cmdk` only
 * enters the client bundle the first time a user opens the palette.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FilePlus,
  UserPlus,
  FolderPlus,
  Play,
  Moon,
  Sun,
  Monitor,
  Bell,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { allNavItems } from "@/constants/navigation";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const run = React.useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      // Defer to next tick so the dialog close animation doesn't fight nav
      setTimeout(fn, 0);
    },
    [onOpenChange],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search pages, run quick actions, and switch themes"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`nav ${item.title}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <Icon />
                <span>{item.title}</span>
                <CommandShortcut>G {item.title[0]}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick actions">
          <CommandItem
            value="new invoice"
            onSelect={() => run(() => router.push("/dashboard/invoices/new"))}
          >
            <FilePlus />
            <span>New invoice</span>
            <CommandShortcut>N I</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="new client"
            onSelect={() => run(() => router.push("/dashboard/clients"))}
          >
            <UserPlus />
            <span>Add client</span>
            <CommandShortcut>N C</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="new project"
            onSelect={() => run(() => router.push("/dashboard/projects"))}
          >
            <FolderPlus />
            <span>New project</span>
            <CommandShortcut>N P</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="start timer log time"
            onSelect={() => run(() => router.push("/dashboard/time"))}
          >
            <Play />
            <span>Start timer</span>
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="notifications inbox"
            onSelect={() => run(() => router.push("/dashboard/notifications"))}
          >
            <Bell />
            <span>Open notifications</span>
            <CommandShortcut>G N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="settings preferences"
            onSelect={() => run(() => router.push("/dashboard/settings"))}
          >
            <Settings />
            <span>Open settings</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem value="theme light" onSelect={() => run(() => setTheme("light"))}>
            <Sun />
            <span>Light</span>
          </CommandItem>
          <CommandItem value="theme dark" onSelect={() => run(() => setTheme("dark"))}>
            <Moon />
            <span>Dark</span>
          </CommandItem>
          <CommandItem value="theme system" onSelect={() => run(() => setTheme("system"))}>
            <Monitor />
            <span>System</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
