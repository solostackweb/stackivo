import type { WelcomeDocumentSection } from "./types";

/**
 * Parse the JSON-string content column into a typed section array.
 *
 * Mirrors `parseContractContent` from `@/features/contracts/content` —
 * a freelancer who edits the row directly in SQL won't be left with
 * an unrenderable document. We accept both:
 *   - `[{ heading, body }, ...]` — the canonical shape
 *   - any other JSON value or plain text — degraded to a single section
 *     so the page never crashes on stale data.
 */
export function parseWelcomeContent(
  content: string | null | undefined,
): WelcomeDocumentSection[] {
  const raw = (content ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const sections = parsed
        .filter(
          (item): item is { heading: string; body: string; id?: string } =>
            !!item &&
            typeof item.heading === "string" &&
            typeof item.body === "string",
        )
        .map((item, i) => ({
          id: item.id ?? `s_${i + 1}`,
          heading: item.heading.trim(),
          body: item.body,
        }))
        .filter((s) => s.heading || s.body);
      return sections;
    }
  } catch {
    // Plain-text fallback below.
  }
  return [{ id: "s_fallback", heading: "Welcome", body: raw }];
}

/** Serialise a section array back to the canonical JSON-string form. */
export function serializeWelcomeContent(
  sections: WelcomeDocumentSection[],
): string {
  return JSON.stringify(
    sections.map((s) => ({ heading: s.heading, body: s.body })),
  );
}

/** New, unique-ish section id for client-side state. */
export function newSectionId(): string {
  return `s_${Math.random().toString(36).slice(2, 9)}`;
}
