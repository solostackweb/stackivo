import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  getUserPaymentMethod,
  getUserPaymentMethodSummary,
} from "@/features/billing/payment-methods";
import { PaymentMethodPicker } from "@/features/billing/components/payment-method-picker";

export const metadata = {
  title: "Payments — Stackivo",
  description:
    "Choose how clients pay your invoices. Stackivo Managed or UPI Manual.",
};

export default async function PaymentsSettingsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);

  // Pull the summary (safe-to-render shape) plus the raw config so we can
  // pre-fill the active method's form when the user re-opens it. Bank
  // account numbers themselves are NOT pre-filled — the user must re-enter
  // them on update so we never round-trip a sensitive field through the
  // browser.
  const [summary, config] = await Promise.all([
    getUserPaymentMethodSummary(user.id),
    getUserPaymentMethod(user.id),
  ]);

  // For UPI, the VPA isn't sensitive — clients see it on every invoice —
  // so we can prefill the input. For managed payouts we only echo the
  // non-secret fields (name, bank, IFSC).
  const initialManaged =
    config?.type === "stackivo_managed"
      ? {
          accountHolderName: config.payout.accountHolderName,
          bankName: config.payout.bankName,
          ifsc: config.payout.ifsc,
        }
      : undefined;
  const initialUpiVpa =
    config?.type === "upi_manual" ? config.payout.vpa : null;

  // Defensive cleanup: if the user's row still has the legacy 0023 status
  // column flagged as "connected", surface a one-time hint that they need
  // to pick a new method. We don't mutate the row here — that happens
  // implicitly on first save in the new model.
  let showLegacyHint = false;
  const admin = getAdminSupabase();
  const { data: legacy } = await admin
    .from("user_profiles")
    .select("razorpay_account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (
    !summary.type &&
    (legacy as { razorpay_account_status?: string } | null)
      ?.razorpay_account_status === "connected"
  ) {
    showLegacyHint = true;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
        <p className="text-sm text-muted-foreground">
          Pick how clients pay your invoices. You can switch at any time.
        </p>
      </div>

      {showLegacyHint ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-400">
          <p className="font-semibold">We&apos;ve upgraded payments.</p>
          <p className="mt-1">
            The old &quot;paste your Razorpay key&quot; flow is retired. Pick
            one of the two options below — Stackivo handles the rest.
          </p>
        </div>
      ) : null}

      <PaymentMethodPicker
        summary={summary}
        initialManaged={initialManaged}
        initialUpiVpa={initialUpiVpa}
      />

      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1.5 font-semibold text-foreground">How this works</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            Every invoice has a public payment link (<code>/i/&lt;token&gt;</code>)
            the client opens from their email.
          </li>
          <li>
            <strong>Stackivo Managed:</strong> client pays via Razorpay
            Checkout, invoice auto-marks as paid, receipt is sent. Stackivo
            ops transfers funds to your bank within 1-2 business days.
          </li>
          <li>
            <strong>UPI Manual:</strong> client scans a UPI QR generated
            from your VPA. Once you see the transfer in your bank, mark the
            invoice paid here and we&apos;ll generate + send the receipt.
          </li>
        </ul>
      </div>
    </div>
  );
}
