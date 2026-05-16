/**
 * Standard page header for every admin route.
 *
 * Renders:
 *   - Title (left, dense)
 *   - Optional subtitle / breadcrumb
 *   - Optional action buttons on the right (desktop) / below (mobile)
 *
 * Kept deliberately small — the admin language is information-dense.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-0.5">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
