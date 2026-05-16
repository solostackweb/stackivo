"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { allNavItems } from "@/constants/navigation";

interface Crumb {
  label: string;
  href: string;
}

function titleCase(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Derives breadcrumbs from the current pathname. Uses the nav constants to
 * resolve known labels (e.g., "pulse" → "Pulse") and title-cases the rest.
 */
function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];
  let acc = "";

  for (const seg of segments) {
    acc += `/${seg}`;

    // Skip the route-group prefix if it ever leaks through
    if (seg.startsWith("(") && seg.endsWith(")")) continue;

    const known = allNavItems.find((item) => item.href === acc);
    const label = known ? known.title : titleCase(decodeURIComponent(seg));

    crumbs.push({ label, href: acc });
  }

  return crumbs;
}

interface BreadcrumbsProps {
  className?: string;
  /** Optionally override the auto-derived crumbs (e.g., for dynamic detail pages) */
  items?: Crumb[];
}

export function Breadcrumbs({ className, items }: BreadcrumbsProps) {
  const pathname = usePathname();
  const crumbs = items ?? buildCrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-muted-foreground/60"
                  aria-hidden
                />
              )}
              {isLast ? (
                <span className="font-semibold text-foreground">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
