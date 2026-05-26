import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  getUserPaymentMethod,
  getUserPaymentMethodSummary,
} from "@/features/billing/payment-methods";
import { PaymentMethodPicker } from "@/features/billing/components/payment-method-picker";
import { SettingsPageHeader } from "@/features/settings/components/settings-section";

export const metadata = {
  title: "Payments — Stackivo",
  description:
    "Set up how clients pay your invoices — Route Checkout, Smart Collect UPI, or UPI Direct.",
};

export default async function PaymentsSettingsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);

  // Payment gateway is free for all plans — no feature gate here.
  const [summary, config] = await Promise.all([
    getUserPaymentMethodSummary(user.id),
    getUserPaymentMethod(user.id),
  ]);

  // Pre-fill non-sensitive fields for the bank form.
  // Bank account number is intentionally NOT pre-filled — user must re-enter.
  const initialBank =
    config?.type === "stackivo_managed" || config?.type === "upi_smart"
      ? {
          accountHolderName: config.payout.accountHolderName,
          ifsc: config.payout.ifsc,
        }
      : undefined;

  const initialUpiVpa =
    config?.type === "upi_manual" ? config.payout.vpa : null;

  // Surface legacy hint if user previously had the old key-paste model.
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
    <>
      <SettingsPageHeader
        title="Payments"
        description="Choose how clients pay your invoices. Switch methods any time — no lock-in."
      />

      <div className="space-y-6">
        {showLegacyHint && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-400">
            <p className="font-semibold">We&apos;ve upgraded the payments experience.</p>
            <p className="mt-1">
              The old &quot;paste your Razorpay key&quot; flow is retired. Pick
              one of the three options below — Stackivo handles the rest.
            </p>
          </div>
        )}

        <PaymentMethodPicker
          summary={summary}
          initialBank={initialBank}
          initialUpiVpa={initialUpiVpa}
        />

        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-2 font-semibold text-foreground">How each method works</p>
          <div className="space-y-2">
            <p>
              <strong>Route Checkout</strong> — Client opens the invoice link
              and pays via Razorpay Checkout (cards, UPI, net banking, wallets,
              international). Invoice auto-marks paid. Stackivo ops processes a
              payout to your bank within 1–2 business days. ~2–3% Razorpay fee.
            </p>
            <p>
              <strong>Smart Collect UPI</strong> — A unique virtual UPI ID is
              generated per invoice. Client pays it via any UPI app. Invoice
              auto-marks paid the moment the transfer arrives. India only.
              ~1.77% Razorpay fee. Payout T+2.
            </p>
            <p>
              <strong>UPI Direct</strong> — Client scans a static QR code tied
              to your UPI ID and pays you directly. Money lands instantly with
              zero fee. You confirm each payment manually from the invoice page
              and Stackivo generates the receipt.
            </p>
          </div>
          <p className="mt-3">
            Both Route Checkout and Smart Collect require Razorpay to verify
            your bank account. IFSC is validated live and PAN is stored for
            regulatory compliance — this is a one-time step per bank account.
          </p>
        </div>
      </div>
    </>
  );
}
