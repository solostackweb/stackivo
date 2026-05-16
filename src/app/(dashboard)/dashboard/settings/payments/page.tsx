import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { getUserRazorpayAccount } from "@/features/billing/razorpay/user-account";
import { PaymentsConnectForm } from "@/features/billing/components/payments-connect-form";

export const metadata = {
  title: "Payments — Stackivo",
  description: "Connect your Razorpay account to accept invoice payments.",
};

export default async function PaymentsSettingsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);

  const account = await getUserRazorpayAccount(user.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
        <p className="text-sm text-muted-foreground">
          Connect your Razorpay account so clients can pay invoices online.
          Money settles directly into your bank — Stackivo never holds it.
        </p>
      </div>

      <PaymentsConnectForm account={account} />

      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1.5 font-semibold text-foreground">How this works</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            Each invoice gets a public payment link
            (<code>/i/&lt;token&gt;</code>) the client opens from their email.
          </li>
          <li>
            Razorpay collects the payment and webhooks Stackivo. We mark the
            invoice paid and email a receipt automatically.
          </li>
          <li>
            Find your keys at{" "}
            <a
              href="https://dashboard.razorpay.com/app/keys"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              dashboard.razorpay.com/app/keys
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
