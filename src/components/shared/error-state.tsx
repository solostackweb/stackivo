import * as React from "react";
import { AlertTriangle, RefreshCcw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** Provide a handler to render a "Try again" button. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Optional secondary link (e.g. go back, contact support). */
  secondary?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

/**
 * Reusable error-state panel. Used at the top of feature views when data
 * fetching fails, or inline inside cards that can fail independently.
 * Styling matches `EmptyState` for consistency — dashed border, centered
 * content, destructive-toned icon.
 */
export function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Something went wrong",
  description = "We couldn't load this data. Try again in a moment.",
  onRetry,
  retryLabel = "Try again",
  secondary,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card/50 p-10 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--destructive)/0.08),transparent_70%)]"
      />
      <div className="relative mb-5">
        <span
          aria-hidden
          className="absolute inset-0 -m-1 rounded-2xl bg-destructive/10 blur-xl"
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive/15 to-rose-500/15 text-destructive ring-1 ring-destructive/20">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {(onRetry || secondary) && (
        <div className="mt-6 flex items-center gap-2">
          {onRetry && (
            <Button size="sm" onClick={onRetry} className="font-semibold">
              <RefreshCcw /> {retryLabel}
            </Button>
          )}
          {secondary && (
            <Button
              asChild={!!secondary.href}
              variant="ghost"
              size="sm"
              onClick={secondary.onClick}
            >
              {secondary.href ? (
                <a href={secondary.href}>{secondary.label}</a>
              ) : (
                <span>{secondary.label}</span>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
