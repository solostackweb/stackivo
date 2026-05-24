"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

// ─── Password change ──────────────────────────────────────────────────────────

const passwordChangeSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const raw = {
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = passwordChangeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Invalid input." };
  }

  const supabase = await getServerSupabase();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    // Supabase returns "same password" error when reusing the current one
    if (error.message.toLowerCase().includes("same password")) {
      return {
        ok: false,
        error: "New password must be different from your current password.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ─── Sign out other sessions ─────────────────────────────────────────────────

/**
 * Signs out all sessions *except* the current one.
 * Supabase's `signOut({ scope: "others" })` handles this in one call.
 */
export async function signOutOtherSessionsAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
