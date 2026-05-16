import { requireMidOnboarding } from "@/features/onboarding/server";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { SignatureStepForm } from "@/features/onboarding/components/signature-step-form";

export const metadata = { title: "Signature setup" };

export default async function OnboardingSignaturePage() {
  const profile = await requireMidOnboarding("/onboarding/signature");
  return (
    <OnboardingShell
      currentStep="signature"
      title="Signature setup"
      description="Add the freelancer signature that will appear on contracts and invoices before you continue."
    >
      <SignatureStepForm profile={profile} />
    </OnboardingShell>
  );
}
