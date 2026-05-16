import * as React from "react";
import { OnboardingProgress } from "./onboarding-progress";
import type { OnboardingStep } from "@/lib/supabase/types";

/**
 * Shared layout for every onboarding step page. Holds:
 *   - Step heading + subtitle
 *   - Progress rail
 *   - Card-style content area (the actual form)
 */
export function OnboardingShell({
  currentStep,
  title,
  description,
  children,
}: {
  currentStep: OnboardingStep;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8 sm:space-y-10">
      <OnboardingProgress currentStep={currentStep} />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-xl shadow-primary/[0.03] sm:p-8">
        {children}
      </div>
    </div>
  );
}
