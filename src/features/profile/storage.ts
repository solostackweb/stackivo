import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getServerSupabase } from "@/lib/supabase/server";

export type AnySupabase = SupabaseClient<Database>;

export async function createSignedStorageUrl(
  bucket: "profile-images" | "branding-assets",
  path: string | null | undefined,
  client?: AnySupabase,
): Promise<string | null> {
  if (!path) return null;
  const sb = client ?? (await getServerSupabase());
  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
