import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  stepIndex,
} from "../routes";
import type { OnboardingStep } from "@/lib/supabase/types";

/**
 * Linear progress rail for the onboarding flow. Renders all five steps,
 * with the current step highlighted and previous steps marked complete.
 *
 * Visually echoes the calm, premium Stackivo design system — thin lines,
 * tinted dots, no excessive ornamentation.
 */
export function OnboardingProgress({
  currentStep,
}: {
  currentStep: OnboardingStep;
}) {
  const currentIdx = stepIndex(currentStep);
  // 2026-05 onboarding rewrite: the canonical new-user flow is now just
  // `business` → `gst` → /dashboard. Render a short rail for those users.
  // Legacy users persisted mid-flight at invoice / signature / first_client
  // still see the full 4-node rail so their progress reads correctly.
  const isShortFlow =
    currentStep === "business" || currentStep === "gst";
  const visible = isShortFlow
    ? (["business", "gst"] as readonly OnboardingStep[])
    : ONBOARDING_STEPS.slice(0, ONBOARDING_STEPS.length - 1);

  return (
    <ol className="flex w-full items-center gap-2">
      {visible.map((step, i) => {
        const isComplete = i < currentIdx || currentStep === "done";
        const isCurrent = i === currentIdx && currentStep !== "done";
        return (
          <React.Fragment key={step}>
            <li className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-300",
                  isComplete &&
                    "border-primary bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-md shadow-primary/30",
                  isCurrent &&
                    "border-primary bg-primary/10 text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]",
                  !isComplete && !isCurrent &&
                    "border-border bg-background text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium tracking-tight sm:block",
                  isCurrent && "text-foreground",
                  isComplete && "text-foreground",
                  !isCurrent && !isComplete && "text-muted-foreground",
                )}
              >
                {ONBOARDING_STEP_LABELS[step]}
              </span>
            </li>
            {i < visible.length - 1 ? (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full bg-border transition-all duration-500",
                  i < currentIdx &&
                    "bg-gradient-to-r from-primary to-indigo-500",
                )}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
