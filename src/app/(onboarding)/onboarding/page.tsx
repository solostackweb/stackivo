import { redirect } from "next/navigation";
import { getBusinessProfile } from "@/features/onboarding/server";
import { pathForStep } from "@/features/onboarding/routes";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";

/**
 * `/onboarding` — entry point. Resolves the persisted current step and
 * redirects to it so the user can resume after a refresh / re-login.
 */
export default async function OnboardingIndexPage() {
  const profile = await getBusinessProfile();
  if (!profile) redirect(AUTH_LOGIN_ROUTE);
  if (profile.onboardingCompleted) redirect("/dashboard");
  redirect(pathForStep(profile.onboardingStep));
}
