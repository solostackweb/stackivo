"use server";

/**
 * Server actions for the persistent client CRUD module.
 *
 * Validation: `clientCrudSchema` (Zod) — same shape on client + server.
 * Authorisation: Supabase RLS — every query runs scoped to `auth.uid()`.
 * Free-plan: `assertCanCreateClient()` runs before insertion.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { normaliseGstin } from "@/features/gst/validation";
import { clientCrudSchema, clientIdSchema } from "./server-schemas";
import { assertCanCreateClient } from "./enforcement";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      reason?: "limit_exceeded";
    };

async function requireUserId(): Promise<string> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
  return user.id;
}

function parseFromFormData(formData: FormData) {
  return clientCrudSchema.safeParse({
    gstRegistered: formData.get("gstRegistered") === "true",
    fullName: formData.get("fullName"),
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    stateCode: formData.get("stateCode"),
    billingAddress: formData.get("billingAddress"),
    notes: formData.get("notes"),
    gstin: formData.get("gstin") ?? "",
  });
}

// --- Create -----------------------------------------------------------------

export async function createClientAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseFromFormData(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Free-plan check FIRST — fail loudly before mutating.
  const blocked = await assertCanCreateClient();
  if (blocked) {
    return {
      ok: false,
      error: blocked.error,
      reason: "limit_exceeded",
    };
  }

  const userId = await requireUserId();
  const supabase = await getServerSupabase();

  const insertRow = {
    user_id: userId,
    full_name: parsed.data.fullName,
    business_name: parsed.data.businessName ?? null,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    gst_registered: parsed.data.gstRegistered,
    gst_number: parsed.data.gstRegistered
      ? normaliseGstin(parsed.data.gstin)
      : null,
    state_code: parsed.data.stateCode,
    billing_address: parsed.data.billingAddress ?? null,
    notes: parsed.data.notes ?? null,
  };

  const { data, error } = await supabase
    .from("clients")
    .insert(insertRow as never)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save client." };
  }

  revalidatePath("/dashboard/clients");
  return {
    ok: true,
    data: { id: (data as { id: string }).id },
    message: "Client created.",
  };
}

// --- Update -----------------------------------------------------------------

export async function updateClientAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = clientIdSchema.safeParse(formData.get("id"));
  if (!idParse.success) {
    return { ok: false, error: "Missing or invalid client id." };
  }

  const parsed = parseFromFormData(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await requireUserId();
  const supabase = await getServerSupabase();

  const update = {
    full_name: parsed.data.fullName,
    business_name: parsed.data.businessName ?? null,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    gst_registered: parsed.data.gstRegistered,
    gst_number: parsed.data.gstRegistered
      ? normaliseGstin(parsed.data.gstin)
      : null,
    state_code: parsed.data.stateCode,
    billing_address: parsed.data.billingAddress ?? null,
    notes: parsed.data.notes ?? null,
  };

  const { error } = await supabase
    .from("clients")
    .update(update as never)
    .eq("id", idParse.data);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${idParse.data}`);
  return { ok: true, message: "Client updated." };
}

// --- Delete -----------------------------------------------------------------

export async function deleteClientAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = clientIdSchema.safeParse(formData.get("id"));
  if (!idParse.success) {
    return { ok: false, error: "Missing or invalid client id." };
  }
  await requireUserId();
  const supabase = await getServerSupabase();

  const { error } = await supabase.from("clients").delete().eq("id", idParse.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/clients");
  return { ok: true, message: "Client deleted." };
}
