export interface ParsedContractSection {
  heading: string;
  body: string;
}

export function parseContractContent(content: string | null | undefined): {
  sections: ParsedContractSection[];
  paragraphs: string[];
} {
  const raw = (content ?? "").trim();
  if (!raw) return { sections: [], paragraphs: [] };

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const sections = parsed
        .filter(
          (item): item is ParsedContractSection =>
            item &&
            typeof item.heading === "string" &&
            typeof item.body === "string",
        )
        .map((item) => ({
          heading: item.heading.trim(),
          body: item.body.trim(),
        }))
        .filter((item) => item.heading || item.body);

      if (sections.length > 0) return { sections, paragraphs: [] };
    }
  } catch {
    // Plain-text contracts are valid; fall through to paragraph parsing.
  }

  return {
    sections: [],
    paragraphs: raw
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  };
}
