import { requireMidOnboarding } from "@/features/onboarding/server";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { BusinessStepForm } from "@/features/onboarding/components/business-step-form";

export const metadata = { title: "Business setup" };

export default async function OnboardingBusinessPage() {
  const profile = await requireMidOnboarding("/onboarding/business");
  return (
    <OnboardingShell
      currentStep="business"
      title="Tell us about your business"
      description="This appears on every invoice and contract you send. You can edit it later in Settings."
    >
      <BusinessStepForm profile={profile} />
    </OnboardingShell>
  );
}
