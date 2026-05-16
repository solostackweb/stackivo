import "server-only";

/**
 * Per-user Razorpay account helper.
 *
 * Each freelancer connects their OWN Razorpay account so client invoice
 * payments settle directly into their bank — Stackivo never holds client
 * money.
 *
 * Secrets are encrypted at rest using `pgcrypto` (see migration 0023).
 * Only the service-role client can read/write the encrypted column, and
 * only this module reads it back into plaintext for outbound API calls.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";

const BASE_URL = "https://api.razorpay.com/v1";

export interface UserRazorpayCredentials {
  keyId: string;
  keySecret: string;
  testMode: boolean;
}

export interface UserRazorpayAccount {
  keyId: string | null;
  status: "unverified" | "connected" | "invalid" | "revoked";
  testMode: boolean;
  connectedAt: string | null;
  lastVerifiedAt: string | null;
}

/**
 * Read a freelancer's Razorpay account metadata. The secret is NEVER
 * returned to clients — call `getUserRazorpayCredentials` from a server
 * context only when you actually need to make an API call on their behalf.
 */
export async function getUserRazorpayAccount(
  userId: string,
): Promise<UserRazorpayAccount | null> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("user_profiles")
    .select(
      "razorpay_key_id, razorpay_account_status, razorpay_test_mode, razorpay_connected_at, razorpay_last_verified_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  const r = data as {
    razorpay_key_id: string | null;
    razorpay_account_status:
      | "unverified"
      | "connected"
      | "invalid"
      | "revoked";
    razorpay_test_mode: boolean;
    razorpay_connected_at: string | null;
    razorpay_last_verified_at: string | null;
  };
  return {
    keyId: r.razorpay_key_id,
    status: r.razorpay_account_status,
    testMode: r.razorpay_test_mode,
    connectedAt: r.razorpay_connected_at,
    lastVerifiedAt: r.razorpay_last_verified_at,
  };
}

/**
 * Read the user's plaintext Razorpay credentials. ONLY callable from
 * server-side action / route handler / webhook code. Returns null if the
 * user hasn't connected an account or the secret cannot be decrypted.
 */
export async function getUserRazorpayCredentials(
  userId: string,
): Promise<UserRazorpayCredentials | null> {
  const admin = getAdminSupabase();
  const { data: metadata } = await admin
    .from("user_profiles")
    .select(
      "razorpay_key_id, razorpay_test_mode, razorpay_account_status",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!metadata) return null;
  const meta = metadata as {
    razorpay_key_id: string | null;
    razorpay_test_mode: boolean;
    razorpay_account_status: string;
  };
  if (
    !meta.razorpay_key_id ||
    meta.razorpay_account_status === "revoked" ||
    meta.razorpay_account_status === "invalid"
  ) {
    return null;
  }
  // Decrypt secret via the security-definer RPC. Supabase JS types don't
  // know about custom RPCs by default; we cast through unknown.
  const rpc = await (admin as unknown as {
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: string | null; error: unknown }>;
  }).rpc("decrypt_user_razorpay_secret", { p_user_id: userId });
  const decrypted = rpc.data;
  if (!decrypted) return null;
  return {
    keyId: meta.razorpay_key_id,
    keySecret: decrypted,
    testMode: meta.razorpay_test_mode,
  };
}

/**
 * Persist new Razorpay credentials for a user. The plaintext secret is
 * encrypted in-database via `encrypt_razorpay_secret(...)`. We mark the
 * account as `unverified` until a successful `verifyUserRazorpayAccount()`
 * round-trip confirms the keys are real.
 */
export async function saveUserRazorpayCredentials(input: {
  userId: string;
  keyId: string;
  keySecret: string;
  testMode: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getAdminSupabase();
  const rpc = await (admin as unknown as {
    rpc: (
      name: string,
      params: Record<string, unknown>,
    ) => Promise<{ error: { message?: string } | null }>;
  }).rpc("set_user_razorpay_secret", {
    p_user_id: input.userId,
    p_key_id: input.keyId,
    p_key_secret: input.keySecret,
    p_test_mode: input.testMode,
  });
  if (rpc.error) return { ok: false, error: rpc.error.message ?? "Save failed." };
  return { ok: true };
}

/**
 * Mark a user's Razorpay credentials as revoked / invalid. Used when:
 *   - The user explicitly disconnects.
 *   - We get a 401 from Razorpay (keys rotated / revoked).
 */
export async function setUserRazorpayStatus(
  userId: string,
  status: "connected" | "invalid" | "revoked",
): Promise<void> {
  const admin = getAdminSupabase();
  const patch: Record<string, unknown> = { razorpay_account_status: status };
  if (status === "connected") {
    patch.razorpay_connected_at = new Date().toISOString();
    patch.razorpay_last_verified_at = new Date().toISOString();
  }
  if (status === "revoked") {
    patch.razorpay_key_id = null;
    patch.razorpay_key_secret_enc = null;
  }
  await admin.from("user_profiles").update(patch as never).eq("id", userId);
}

/**
 * Verify a freelancer's Razorpay credentials by hitting a low-impact
 * endpoint (`GET /payments?count=1`). On success we mark them `connected`;
 * on a 401 we mark them `invalid`.
 */
export async function verifyUserRazorpayAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const creds = await getUserRazorpayCredentials(userId);
  if (!creds) {
    return { ok: false, error: "No Razorpay credentials saved." };
  }
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString(
    "base64",
  );
  const res = await fetch(`${BASE_URL}/payments?count=1`, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 401) {
    await setUserRazorpayStatus(userId, "invalid");
    return { ok: false, error: "Razorpay rejected the keys (401)." };
  }
  if (!res.ok) {
    return { ok: false, error: `Razorpay returned ${res.status}.` };
  }
  await setUserRazorpayStatus(userId, "connected");
  return { ok: true };
}

// --- Razorpay HTTP wrappers scoped to a freelancer's account --------------

export class UserRazorpayError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function userRzpFetch<T>(
  creds: UserRazorpayCredentials,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString(
    "base64",
  );
  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };
  let body: BodyInit | undefined;
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* fall through */
  }
  if (!res.ok) {
    const desc =
      json &&
      typeof json === "object" &&
      "error" in json &&
      (json as { error?: { description?: string } }).error?.description;
    const msg =
      typeof desc === "string" && desc.length > 0
        ? desc
        : `Razorpay ${res.status} on ${path}`;
    throw new UserRazorpayError(msg, res.status, json);
  }
  return json as T;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string> | null;
  created_at: number;
}

/**
 * Create a Razorpay order against the freelancer's account. The amount is
 * in the smallest currency unit (paise for INR).
 *
 * `notes.invoice_id` is set so the webhook handler can route the resulting
 * `payment.captured` event back to the correct invoice. `notes.user_id` is
 * also set for fast attribution.
 */
export async function createUserRazorpayOrder(
  creds: UserRazorpayCredentials,
  input: {
    amountPaise: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  },
): Promise<RazorpayOrder> {
  return userRzpFetch<RazorpayOrder>(creds, "/orders", {
    method: "POST",
    body: {
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: 1,
    },
  });
}
