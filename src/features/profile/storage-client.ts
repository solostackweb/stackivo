import { getBrowserSupabase } from "@/lib/supabase/client";

export type ProfileAssetKind = "avatar" | "logo" | "brand-icon";

const BUCKET_BY_KIND: Record<ProfileAssetKind, "profile-images" | "branding-assets"> = {
  avatar: "profile-images",
  logo: "branding-assets",
  "brand-icon": "branding-assets",
};

const FILE_NAME_BY_KIND: Record<ProfileAssetKind, string> = {
  avatar: "avatar",
  logo: "logo",
  "brand-icon": "brand-icon",
};

function buildPath(userId: string, kind: ProfileAssetKind): string {
  return `${userId}/${FILE_NAME_BY_KIND[kind]}`;
}

export async function uploadProfileAsset(args: {
  userId: string;
  kind: ProfileAssetKind;
  file: File;
}): Promise<{ path: string; signedUrl: string | null }> {
  const supabase = getBrowserSupabase();
  const bucket = BUCKET_BY_KIND[args.kind];
  const path = buildPath(args.userId, args.kind);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, args.file, {
      upsert: true,
      contentType: args.file.type || "image/png",
      cacheControl: "3600",
    });
  if (error) throw error;

  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);
  return { path, signedUrl: data?.signedUrl ?? null };
}

export async function removeProfileAsset(args: {
  userId: string;
  kind: ProfileAssetKind;
  path?: string | null;
}): Promise<void> {
  const supabase = getBrowserSupabase();
  const bucket = BUCKET_BY_KIND[args.kind];
  const path = args.path ?? buildPath(args.userId, args.kind);
  await supabase.storage.from(bucket).remove([path]);
}
