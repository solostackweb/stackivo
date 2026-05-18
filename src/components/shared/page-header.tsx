import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        // Tighter bottom padding on mobile so the header doesn't eat as
        // much of the visible viewport.
        "flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-1 sm:space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight sm:text-[28px] sm:leading-tight">
          {title}
        </h1>
        {description ? (
          // Description is supporting text — hide it on phones to cut
          // visual clutter. Stays visible from sm: upward.
          <p className="hidden text-sm leading-relaxed text-muted-foreground sm:block">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
