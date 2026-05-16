/**
 * Pure helpers shared across the clients feature.
 *
 * Kept dependency-free so they can be imported from both server and client
 * components without dragging in `server-only` modules.
 */

/**
 * Two-letter avatar initials for a client. Falls back to "?" for blank
 * names so the UI never renders an empty avatar bubble.
 */
export function getClientInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Display-friendly name for a client. Prefers business name and falls
 * back to the contact's full name.
 */
export function getClientDisplayName(client: {
  fullName: string;
  businessName: string | null;
}): string {
  return client.businessName?.trim() || client.fullName;
}
