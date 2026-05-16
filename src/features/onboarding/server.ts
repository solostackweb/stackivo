import "server-only";

/**
 * Server-side reads + guards for the onboarding domain.
 *
 * Mutations live in `./actions.ts` so they can be marked `"use server"`.
 * Reads here are usable from any RSC / route handler.
 */

import { redirect } from "next/navigation";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { getProfile } from "@/features/profile/server";
import type { BusinessProfile } from "./types";
import { ONBOARDING_BASE, pathForStep } from "./routes";

/**
 * Returns the authenticated user's full business profile, or null when
 * unauthenticated.
 */
export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  return getProfile();
}

/**
 * Redirect to the appropriate onboarding step when the user hasn't finished.
 * Use inside the dashboard layout's RSC to enforce "no dashboard until
 * onboarded".
 */
export async function requireOnboarded(): Promise<BusinessProfile> {
  const profile = await getBusinessProfile();
  if (!profile) redirect(AUTH_LOGIN_ROUTE);
  if (!profile.onboardingCompleted) {
    redirect(pathForStep(profile.onboardingStep));
  }
  return profile;
}

/**
 * Counterpart used inside the onboarding layout: if the user is already
 * onboarded we send them to the dashboard. Otherwise we make sure their URL
 * matches the persisted current step (resume capability).
 */
export async function requireMidOnboarding(
  currentPathname: string,
): Promise<BusinessProfile> {
  const profile = await getBusinessProfile();
  if (!profile) redirect(AUTH_LOGIN_ROUTE);
  if (profile.onboardingCompleted) redirect("/dashboard");

  const expected = pathForStep(profile.onboardingStep);
  // Allow the index `/onboarding` page to redirect itself; otherwise force
  // the user back to the step they're actually on.
  if (
    currentPathname === ONBOARDING_BASE ||
    currentPathname.startsWith(`${ONBOARDING_BASE}/`)
  ) {
    if (currentPathname !== expected && currentPathname !== ONBOARDING_BASE) {
      redirect(expected);
    }
  }
  return profile;
}
