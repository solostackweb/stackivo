import { requireMidOnboarding } from "@/features/onboarding/server";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { InvoiceStepForm } from "@/features/onboarding/components/invoice-step-form";

export const metadata = { title: "Invoice preferences" };

export default async function OnboardingInvoicePage() {
  const profile = await requireMidOnboarding("/onboarding/invoice");
  return (
    <OnboardingShell
      currentStep="invoice"
      title="Invoice preferences"
      description="Set your default currency, numbering, and payment terms. We'll use these as the starting point for every new invoice."
    >
      <InvoiceStepForm profile={profile} />
    </OnboardingShell>
  );
}
