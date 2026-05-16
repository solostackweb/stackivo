import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  FilePlus,
  UserPlus,
  Play,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const ACTIONS: QuickAction[] = [
  {
    label: "Create invoice",
    description: "Bill a client",
    href: "/dashboard/invoices/new",
    icon: FilePlus,
  },
  {
    label: "Add client",
    description: "New contact",
    href: "/dashboard/clients",
    icon: UserPlus,
  },
  {
    label: "Log time",
    description: "Track an entry",
    href: "/dashboard/time",
    icon: Play,
  },
  {
    label: "Send reminder",
    description: "Nudge a payer",
    href: "/dashboard/invoices",
    icon: BellRing,
  },
];

export function QuickActions() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold tracking-tight">Quick actions</CardTitle>
        <CardDescription className="text-xs">
          One-click shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-2 pb-2">
        <ul className="space-y-1">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.label}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-accent"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-indigo-500/10 text-primary ring-1 ring-primary/15 transition-all group-hover:shadow-md group-hover:shadow-primary/15 group-hover:ring-primary/30">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
