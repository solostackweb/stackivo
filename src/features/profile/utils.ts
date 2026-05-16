export function getDisplayName(profile: {
  displayName: string | null;
  fullName: string;
} | null): string {
  if (!profile) return "";
  return profile.displayName?.trim() || profile.fullName.trim();
}

export function getInitials(name: string | null | undefined): string {
  const safe = (name ?? "").trim();
  if (!safe) return "SK";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  const first = parts[0]![0] ?? "";
  const last = parts[parts.length - 1]![0] ?? "";
  return `${first}${last}`.toUpperCase() || "SK";
}
