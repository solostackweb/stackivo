import type { OnboardingStep } from "@/lib/supabase/types";

/**
 * The onboarding step machine.
 *
 *   business → gst → invoice → signature → first_client → done
 *
 * Each value matches the `onboarding_step` CHECK constraint declared in
 * `supabase/migrations/0005_business_identity.sql`.
 */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "business",
  "gst",
  "invoice",
  "signature",
  "first_client",
  "done",
] as const;

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  business: "Business",
  gst: "GST setup",
  invoice: "Invoice defaults",
  signature: "Signature",
  first_client: "First client",
  done: "Done",
};

export const ONBOARDING_BASE = "/onboarding";

export function pathForStep(step: OnboardingStep): string {
  if (step === "signature") return `${ONBOARDING_BASE}/signature`;
  if (step === "first_client") return `${ONBOARDING_BASE}/first-client`;
  return `${ONBOARDING_BASE}/${step}`;
}

/**
 * Index of a step (0..4). `done` is index 4 — only used to display "complete".
 */
export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

/** Next step after `step`, or `null` if `step === 'done'`. */
export function nextStep(step: OnboardingStep): OnboardingStep | null {
  const idx = stepIndex(step);
  if (idx < 0 || idx >= ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[idx + 1];
}

/** True when the user is mid-onboarding and should be funneled here. */
export function isOnboardingPath(pathname: string): boolean {
  return pathname === ONBOARDING_BASE || pathname.startsWith(`${ONBOARDING_BASE}/`);
}
