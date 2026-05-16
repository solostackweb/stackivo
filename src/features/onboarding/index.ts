/**
 * Public barrel for the onboarding feature.
 *
 * Server-only modules (`./server.ts`, `./actions.ts`) are NOT re-exported
 * here so the barrel stays safe to import from client components.
 */

export type {
  BusinessProfile,
  BusinessType,
  OnboardingStep,
} from "./types";
export { mapProfileRow, BUSINESS_TYPE_OPTIONS } from "./types";
export {
  ONBOARDING_BASE,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  isOnboardingPath,
  nextStep,
  pathForStep,
  stepIndex,
} from "./routes";
