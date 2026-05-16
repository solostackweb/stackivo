import * as React from "react";
import Link from "next/link";
import { Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UpgradeCardProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  /** A few highlight bullets, kept short. */
  features?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}

/**
 * Reusable paywall / upgrade prompt. Drop into any feature that's gated
 * behind a higher plan tier — keeps the tone friendly (not alarming) and
 * the copy consistent across the app.
 */
export function UpgradeCard({
  icon: Icon = Sparkles,
  title,
  description,
  features,
  ctaLabel = "Upgrade plan",
  ctaHref = "/dashboard/settings/billing",
  className,
}: UpgradeCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            {features && features.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-primary/50" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href={ctaHref}>
            <Sparkles /> {ctaLabel}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
