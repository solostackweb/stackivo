"use server";

/**
 * Thin server-action surface around `./server.ts` for client-initiated
 * file uploads. The actual binary is uploaded directly to Supabase Storage
 * using the signed URL — these actions just orchestrate around that.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import {
  createUploadUrl,
  recordFileMetadata,
  deleteFile,
  type FileBucket,
} from "./server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

async function requireAuth(): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
}

const bucketSchema: z.ZodType<FileBucket> = z.enum([
  "invoices",
  "contracts",
  "portal-files",
  "profile-images",
  "branding-assets",
]);

export async function requestUploadAction(args: {
  bucket: FileBucket;
  entity: string;
  fileName: string;
}): Promise<ActionResult<{ bucket: FileBucket; path: string; uploadUrl: string; token: string }>> {
  await requireAuth();
  const bucket = bucketSchema.safeParse(args.bucket);
  if (!bucket.success) return { ok: false, error: "Invalid bucket." };
  const result = await createUploadUrl({
    bucket: bucket.data,
    entity: args.entity,
    fileName: args.fileName,
  });
  if (!result) return { ok: false, error: "Could not create upload URL." };
  return { ok: true, data: result };
}

export async function recordUploadAction(args: {
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string | null;
  projectId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  await requireAuth();
  const record = await recordFileMetadata(args);
  if (!record) return { ok: false, error: "Could not save file metadata." };
  if (args.projectId) revalidatePath(`/dashboard/projects/${args.projectId}`);
  return { ok: true, data: { id: record.id }, message: "Uploaded." };
}

export async function deleteFileAction(args: {
  id: string;
  bucket: FileBucket;
  path: string;
  projectId?: string | null;
}): Promise<ActionResult> {
  await requireAuth();
  const ok = await deleteFile({ id: args.id, bucket: args.bucket, path: args.path });
  if (!ok) return { ok: false, error: "Delete failed." };
  if (args.projectId) revalidatePath(`/dashboard/projects/${args.projectId}`);
  return { ok: true };
}
