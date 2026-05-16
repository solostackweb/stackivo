"use server";

/**
 * Server actions for the per-user Razorpay payments connection. Used by
 * the freelancer's `/dashboard/settings/payments` settings page.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  saveUserRazorpayCredentials,
  setUserRazorpayStatus,
  verifyUserRazorpayAccount,
} from "./razorpay/user-account";

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

const connectSchema = z.object({
  keyId: z.string().trim().min(8, "Razorpay key id is required.").max(120),
  keySecret: z.string().trim().min(8, "Razorpay key secret is required.").max(120),
  testMode: z.union([z.literal("on"), z.literal("off")]).optional(),
});

/** Save + verify Razorpay credentials in one shot. */
export async function connectRazorpayPaymentsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = connectSchema.safeParse({
    keyId: formData.get("keyId"),
    keySecret: formData.get("keySecret"),
    testMode: formData.get("testMode") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.flatten().formErrors[0] ??
        "Please enter both your Razorpay key id and secret.",
    };
  }
  const userId = await requireUserId();
  const testMode = parsed.data.testMode === "on";

  const save = await saveUserRazorpayCredentials({
    userId,
    keyId: parsed.data.keyId,
    keySecret: parsed.data.keySecret,
    testMode,
  });
  if (!save.ok) return { ok: false, error: save.error };

  const verify = await verifyUserRazorpayAccount(userId);
  if (!verify.ok) return { ok: false, error: verify.error };

  revalidatePath("/dashboard/settings/payments");
  return { ok: true, message: "Razorpay account connected." };
}

export async function disconnectRazorpayPaymentsAction(): Promise<ActionResult> {
  const userId = await requireUserId();
  await setUserRazorpayStatus(userId, "revoked");
  revalidatePath("/dashboard/settings/payments");
  return { ok: true, message: "Razorpay account disconnected." };
}

export async function reverifyRazorpayPaymentsAction(): Promise<ActionResult> {
  const userId = await requireUserId();
  const verify = await verifyUserRazorpayAccount(userId);
  if (!verify.ok) return { ok: false, error: verify.error };
  revalidatePath("/dashboard/settings/payments");
  return { ok: true, message: "Razorpay credentials are still valid." };
}
