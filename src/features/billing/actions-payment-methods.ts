"use server";

/**
 * Server actions for the two-option payment-method picker.
 *
 * Replaces the deprecated `actions-payments.ts` (per-user Razorpay key
 * paste flow). Those legacy actions stay on disk for now but the settings
 * page no longer references them.
 *
 * Auth: all actions require an authenticated freelancer; we resolve the
 * user id from the session and never trust an id from the form.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  clearPaymentMethod,
  saveStackivoManagedMethod,
  saveUpiManualMethod,
  validateManagedPayout,
  validateUpiVpa,
} from "./payment-methods";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
  return user.id;
}

// --- Stackivo Managed (bank details) ---------------------------------------

const managedSchema = z.object({
  accountHolderName: z.string().trim().min(2).max(120),
  bankAccountNumber: z.string().trim().min(6).max(30),
  ifsc: z.string().trim().min(11).max(11),
  bankName: z.string().trim().min(2).max(120),
});

export async function setManagedPaymentMethodAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = managedSchema.safeParse({
    accountHolderName: formData.get("accountHolderName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    ifsc: formData.get("ifsc"),
    bankName: formData.get("bankName"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors[0] ??
        "Please fill in all bank details.",
    };
  }
  const check = validateManagedPayout(parsed.data);
  if (!check.ok) return check;

  const userId = await requireUserId();
  await saveStackivoManagedMethod(userId, parsed.data);
  revalidatePath("/dashboard/settings/payments");
  return {
    ok: true,
    message:
      "Stackivo Managed Payments enabled. Payouts will land in your bank within 1-2 business days of each payment.",
  };
}

// --- UPI Manual (VPA) -------------------------------------------------------

const upiSchema = z.object({
  vpa: z.string().trim().min(5).max(120),
});

export async function setUpiManualMethodAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = upiSchema.safeParse({
    vpa: formData.get("vpa"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter your UPI ID (e.g. yourname@okhdfcbank)." };
  }
  const check = validateUpiVpa(parsed.data.vpa);
  if (!check.ok) return check;

  const userId = await requireUserId();
  await saveUpiManualMethod(userId, { vpa: parsed.data.vpa });
  revalidatePath("/dashboard/settings/payments");
  return {
    ok: true,
    message:
      "UPI payments enabled. Clients will see a QR code on every invoice — mark it paid here once you receive the transfer.",
  };
}

// --- Clear method ----------------------------------------------------------

export async function clearPaymentMethodAction(): Promise<ActionResult> {
  const userId = await requireUserId();
  await clearPaymentMethod(userId);
  revalidatePath("/dashboard/settings/payments");
  return { ok: true, message: "Payment method cleared." };
}
