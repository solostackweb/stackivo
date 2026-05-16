/**
 * src/features/contracts/pdf-snapshot.ts
 * 
 * Generates immutable PDF snapshots of contracts at signing time.
 * These snapshots serve as legal evidence of what was signed.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import crypto from "crypto";

interface ContractPdfData {
  title: string;
  content: string;
  seller: {
    businessName: string;
    email: string;
  };
  buyer?: {
    name: string;
    email: string;
  };
}

/**
 * Generate a PDF snapshot hash for immutability verification.
 * This creates a cryptographic proof that the contract content hasn't changed.
 */
export function generatePdfSnapshotHash(
  content: string,
  signedAt: string,
  legalName: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${content}|${signedAt}|${legalName}`)
    .digest("hex");
}

/**
 * Store immutable PDF snapshot in Supabase storage.
 * 
 * Note: This is a placeholder for MVP. In a production system, you would:
 * 1. Generate actual PDF using @react-pdf/renderer or similar
 * 2. Upload to Supabase storage with immutable settings
 * 3. Return signed URL for later access
 */
export async function generateAndStorePdfSnapshot(
  contractId: string,
  contractData: ContractPdfData,
  legalName: string,
  signatureImageUrl?: string
): Promise<{
  url: string;
  hash: string;
}> {
  const admin = getAdminSupabase();
  const now = new Date().toISOString();
  const timestamp = now.replace(/[:.]/g, "-");

  // Create PDF snapshot hash
  const contentWithSignature = `${contractData.content}\n\nSigned by: ${legalName}\nSignature image: ${signatureImageUrl || "typed"}\nDate: ${now}`;
  const pdfHash = generatePdfSnapshotHash(
    contentWithSignature,
    now,
    legalName
  );

  // TODO: Generate actual PDF document using @react-pdf/renderer
  // For MVP, we're storing the hash for audit trail
  // In production, uncomment below and implement PDF generation

  // const pdfContent = await generateContractPdf({
  //   ...contractData,
  //   signedAt: now,
  //   legalName,
  //   signatureImageUrl,
  // });
  //
  // const path = `contracts/${contractId}/signed_${timestamp}.pdf`;
  // const { error } = await admin.storage
  //   .from("contract-snapshots")
  //   .upload(path, pdfContent, {
  //     contentType: "application/pdf",
  //     upsert: false, // Never overwrite
  //   });
  //
  // if (error) {
  //   console.error("Failed to store PDF snapshot:", error);
  //   throw new Error("Failed to store contract snapshot");
  // }
  //
  // const { data: signedUrlData } = await admin.storage
  //   .from("contract-snapshots")
  //   .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year expiry
  //
  // if (!signedUrlData) {
  //   throw new Error("Failed to generate signed URL for snapshot");
  // }

  return {
    // url: signedUrlData.signedUrl,
    url: `gs://stackivo-pdfs/contracts/${contractId}/signed_${timestamp}.pdf`,
    hash: pdfHash,
  };
}

/**
 * Verify PDF snapshot integrity using stored hash.
 * This confirms that the signed version hasn't been modified.
 */
export function verifyPdfSnapshotIntegrity(
  storedHash: string,
  contentWithSignature: string,
  signedAt: string,
  legalName: string
): boolean {
  const calculatedHash = generatePdfSnapshotHash(
    contentWithSignature,
    signedAt,
    legalName
  );
  return crypto.timingSafeEqual(
    Buffer.from(storedHash),
    Buffer.from(calculatedHash)
  );
}

/**
 * Create immutable storage bucket for contract snapshots.
 * This should be run as part of infrastructure setup.
 * Bucket rules:
 * - Only append-only (no updates/deletes after creation)
 * - Versioning enabled
 * - Access logs enabled for compliance
 */
export async function createContractSnapshotBucket(): Promise<void> {
  const admin = getAdminSupabase();

  // Note: Bucket creation requires RLS and storage policies
  // This should be done in Supabase migrations or via the dashboard
  
  // TODO: Create bucket via migration in supabase/migrations
  // CREATE BUCKET IF NOT EXISTS "contract-snapshots"
  // WITH VERSIONING = true
  // AND IMMUTABLE = true
}
