"use server";

/**
 * Contract / proposal server actions.
 *
 * Signature provider integration is intentionally out of scope — we expose
 * a `requestSignatureAction` placeholder that flips status to `sent` and
 * generates a public token so the public `/sign/:token` route works.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  contractCrudSchema,
  contractIdSchema,
  contractStatusSchema,
} from "./server-schemas";
import { recordActivity } from "@/features/activity/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireUserId(): Promise<string> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
  return user.id;
}

function parse(formData: FormData) {
  return contractCrudSchema.safeParse({
    kind: formData.get("kind") ?? "contract",
    title: formData.get("title"),
    content: formData.get("content"),
    clientId: formData.get("clientId"),
    projectId: formData.get("projectId"),
    status: formData.get("status") ?? "draft",
    currency: formData.get("currency") ?? "INR",
    valueAmount: formData.get("valueAmount") ?? "",
    expiresAt: formData.get("expiresAt"),
  });
}

export async function createContractAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const userId = await requireUserId();
  const supabase = await getServerSupabase();
  const insertRow = {
    user_id: userId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    content: parsed.data.content ?? null,
    client_id: parsed.data.clientId ?? null,
    project_id: parsed.data.projectId ?? null,
    status: parsed.data.status,
    currency: parsed.data.currency,
    value_amount: parsed.data.valueAmount ?? null,
    expires_at: parsed.data.expiresAt ?? null,
  };

  const { data, error } = await supabase
    .from("contracts")
    .insert(insertRow as never)
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save contract." };
  }
  const newId = (data as { id: string }).id;
  await recordActivity({
    kind: `${parsed.data.kind}_created`,
    entityType: "contract",
    entityId: newId,
    title: `Created ${parsed.data.kind}: ${parsed.data.title}`,
  });
  revalidatePath("/dashboard/contracts");
  return { ok: true, data: { id: newId }, message: "Saved." };
}

export async function updateContractAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = contractIdSchema.safeParse(formData.get("id"));
  if (!idParse.success) return { ok: false, error: "Invalid contract id." };
  const parsed = parse(formData);
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
    kind: parsed.data.kind,
    title: parsed.data.title,
    content: parsed.data.content ?? null,
    client_id: parsed.data.clientId ?? null,
    project_id: parsed.data.projectId ?? null,
    status: parsed.data.status,
    currency: parsed.data.currency,
    value_amount: parsed.data.valueAmount ?? null,
    expires_at: parsed.data.expiresAt ?? null,
  };
  const { error } = await supabase
    .from("contracts")
    .update(update as never)
    .eq("id", idParse.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${idParse.data}`);
  return { ok: true, message: "Contract updated." };
}

export async function deleteContractAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = contractIdSchema.safeParse(formData.get("id"));
  if (!idParse.success) return { ok: false, error: "Invalid contract id." };
  await requireUserId();
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("contracts").delete().eq("id", idParse.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/contracts");
  return { ok: true, message: "Deleted." };
}

/**
 * "Send for signature" placeholder — sets status to `sent`, records a sent
 * timestamp, and ensures a `public_token` exists so the recipient view
 * (`/sign/:token`) can resolve the contract via `getContractByPublicToken`.
 */
export async function requestSignatureAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult<{ token: string }>> {
  const idParse = contractIdSchema.safeParse(formData.get("id"));
  if (!idParse.success) return { ok: false, error: "Invalid contract id." };
  await requireUserId();
  const supabase = await getServerSupabase();

  const { data: existing } = await supabase
    .from("contracts")
    .select("public_token")
    .eq("id", idParse.data)
    .maybeSingle();
  const token =
    (existing as { public_token?: string | null } | null)?.public_token ??
    randomUUID();

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      public_token: token,
    } as never)
    .eq("id", idParse.data);
  if (error) return { ok: false, error: error.message };

  await recordActivity({
    kind: "contract_sent",
    entityType: "contract",
    entityId: idParse.data,
    title: "Contract sent for signature",
  });

  revalidatePath(`/dashboard/contracts/${idParse.data}`);
  return { ok: true, data: { token }, message: "Sent." };
}

export async function setContractStatusAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const idParse = contractIdSchema.safeParse(formData.get("id"));
  const statusParse = contractStatusSchema.safeParse(formData.get("status"));
  if (!idParse.success || !statusParse.success) {
    return { ok: false, error: "Invalid input." };
  }
  await requireUserId();
  const supabase = await getServerSupabase();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: statusParse.data };
  if (statusParse.data === "sent") patch.sent_at = now;
  if (statusParse.data === "viewed") patch.viewed_at = now;
  if (statusParse.data === "signed") patch.signed_at = now;
  if (statusParse.data === "declined") patch.declined_at = now;
  const { error } = await supabase
    .from("contracts")
    .update(patch as never)
    .eq("id", idParse.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contracts/${idParse.data}`);
  return { ok: true, message: `Marked ${statusParse.data}.` };
}

import { ensureContractPublicToken } from "@/features/share/server";
import { z } from "zod";

const ensureTokenSchema = z.object({ contractId: z.string().uuid() });

export async function ensureContractTokenAction(
  input: z.input<typeof ensureTokenSchema>,
): Promise<ActionResult<{ token: string }>> {
  const parsed = ensureTokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  await requireUserId();
  const token = await ensureContractPublicToken(parsed.data.contractId);
  if (!token) return { ok: false, error: "Could not create share link." };
  return { ok: true, data: { token } };
}
