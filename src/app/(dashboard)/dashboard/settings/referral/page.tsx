import { redirect } from "next/navigation";
import { getReferralStatus } from "@/features/referral/server";
import { ReferralCard } from "@/features/referral/components/referral-card";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";

export const metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

export default async function ReferralSettingsPage() {
  const status = await getReferralStatus();
  if (!status) redirect(AUTH_LOGIN_ROUTE);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Refer &amp; earn</h2>
        <p className="text-sm text-muted-foreground">
          Share your link with fellow freelancers. When they complete their
          setup, you both get 1 month Pro free — up to 12 months total.
        </p>
      </div>

      <ReferralCard status={status} />

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">How it works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Share your unique link with a freelancer friend.</li>
          <li>They sign up via your link and complete their workspace setup.</li>
          <li>They get 1 month Pro free automatically on their account.</li>
          <li>You get 1 month Pro free added to your next renewal.</li>
        </ol>
        <p className="mt-3">
          Rewards are capped at 12 months per referrer. Referrals require the
          referred user to fully complete onboarding (2-step setup). Self-referrals
          are not counted.
        </p>
      </div>
    </div>
  );
}
