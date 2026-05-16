import { requireMidOnboarding } from "@/features/onboarding/server";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { FirstClientStepForm } from "@/features/onboarding/components/first-client-step-form";

export const metadata = { title: "Add your first client" };

export default async function OnboardingFirstClientPage() {
  await requireMidOnboarding("/onboarding/first-client");
  return (
    <OnboardingShell
      currentStep="first_client"
      title="Add your first client"
      description="One client is enough to get started — you can always add more later."
    >
      <FirstClientStepForm />
    </OnboardingShell>
  );
}
