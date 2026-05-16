"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/config/env";
import { isValidPublicShareToken } from "@/features/share/server";
import { getClientIp, publicSignLimit } from "@/lib/rate-limit";
import { captureSignatureMetadata } from "./signature-utils";
import crypto from "crypto";

/**
 * Allowed origin prefix for `signatureImageUrl` posted by anonymous signers.
 *
 * Supabase Storage URLs are predictable in shape:
 *   `<supabaseUrl>/storage/v1/object/<sign|public>/...`
 *
 * Anything outside this prefix is rejected so attackers can't embed
 * external images, tracking pixels, or otherwise sabotage a freshly
 * signed legal document.
 */
const ALLOWED_SIGNATURE_URL_PREFIX = `${env.supabaseUrl}/storage/v1/object/`;

/**
 * Public signing action for `/c/:token`.
 * Captures comprehensive signature metadata including IP, device info,
 * and legal audit trail for contract signing.
 */
export async function signContractPublicAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const token = String(formData.get("token") ?? "").trim();
  const signatureType = String(formData.get("signatureType") ?? "").trim();
  const signatureImageUrl = String(formData.get("signatureImageUrl") ?? "");
  const signatureTextValue = String(
    formData.get("signatureTextValue") ?? ""
  ).trim();
  const signatureFontFamily = String(
    formData.get("signatureFontFamily") ?? ""
  ).trim();
  const legalName = String(formData.get("legalName") ?? "").trim();

  if (!isValidPublicShareToken(token)) return { ok: false, error: "Invalid token" };
  if (!["draw", "type", "upload"].includes(signatureType)) return { ok: false, error: "Invalid signature type" };
  if (!legalName) return { ok: false, error: "Legal name required" };

  // Hard cap legal name length so a hostile signer can't dump arbitrary
  // content into the contract audit trail.
  if (legalName.length > 200) return { ok: false, error: "Legal name too long" };

  // When the signer uploaded an image, validate it actually came from this
  // app's Supabase storage. Reject `data:`, external URLs, javascript:, etc.
  if (signatureImageUrl) {
    if (!signatureImageUrl.startsWith(ALLOWED_SIGNATURE_URL_PREFIX)) {
      return { ok: false, error: "Invalid signature image source" };
    }
  }

  // Per (IP + token) rate-limit to defend against signature replay / spam.
  const ip = await getClientIp();
  const gate = await publicSignLimit(`sign:${ip}:${token}`);
  if (!gate.ok) return { ok: false, error: gate.message };

  const admin = getAdminSupabase();
  const { data: row } = await admin
    .from("contracts")
    .select("id, user_id, title, status, signed_at, content")
    .eq("public_token", token)
    .maybeSingle();

  if (!row) return { ok: false, error: "Contract not found" };

  const contract = row as {
    id: string;
    user_id: string;
    title: string;
    status: string;
    signed_at: string | null;
    content: string;
  };

  if (contract.status !== "signed") {
    // Capture comprehensive signature metadata
    const metadata = await captureSignatureMetadata();
    const now = new Date().toISOString();

    // Generate PDF snapshot hash (for immutability proof)
    const pdfSnapshotHash = crypto
      .createHash("sha256")
      .update(contract.content + now + legalName)
      .digest("hex");

    // Create comprehensive audit record
    const signatureRecord = {
      contract_id: contract.id,
      user_id: contract.user_id,
      signature_type: signatureType,
      signature_image_url: signatureImageUrl || null,
      signature_text_value: signatureTextValue || null,
      signature_font_family: signatureFontFamily || null,
      legal_name: legalName,
      signed_ip: metadata.signed_ip,
      signed_user_agent: metadata.signed_user_agent,
      signed_device: metadata.signed_device,
      pdf_snapshot_hash: pdfSnapshotHash,
      metadata: {
        agreement_accepted: true,
        name_confirmed: true,
        signature_method: signatureType,
      },
    };

    // Insert signature audit record
    await admin.from("contract_signatures").insert(signatureRecord as never);

    // Update contract status
    await admin
      .from("contracts")
      .update({
        status: "signed",
        signed_at: now,
        signature_type: signatureType,
        signature_image_url: signatureImageUrl || null,
        signature_text_value: signatureTextValue || null,
        signature_font_family: signatureFontFamily || null,
        signature_metadata: metadata,
        pdf_snapshot_hash: pdfSnapshotHash,
      } as never)
      .eq("id", contract.id);

    // Record activity event
    await admin.from("activity_events").insert({
      user_id: contract.user_id,
      kind: "contract_signed",
      entity_type: "contract",
      entity_id: contract.id,
      title: `"${contract.title}" signed by ${legalName}`,
      metadata: {
        via: "public_link",
        signature_type: signatureType,
        signed_ip: metadata.signed_ip,
        device: metadata.signed_device,
      },
    } as never);

    // Send notification to freelancer
    await admin.from("notifications").insert({
      user_id: contract.user_id,
      type: "contract_signed",
      title: `"${contract.title}" signed`,
      message: `${legalName} has signed the contract.`,
      metadata: {
        contract_id: contract.id,
        signed_ip: metadata.signed_ip,
      },
    } as never);
  }

  return { ok: true };
}
