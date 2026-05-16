import { requireMidOnboarding } from "@/features/onboarding/server";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { GstStepForm } from "@/features/onboarding/components/gst-step-form";

export const metadata = { title: "GST setup" };

export default async function OnboardingGstPage() {
  const profile = await requireMidOnboarding("/onboarding/gst");
  return (
    <OnboardingShell
      currentStep="gst"
      title="GST registration"
      description="If you're GST registered we'll calculate CGST / SGST / IGST automatically. Otherwise we'll generate standard non-GST invoices."
    >
      <GstStepForm profile={profile} />
    </OnboardingShell>
  );
}
