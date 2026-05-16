import "server-only";

/**
 * Shared PDF theme.
 *
 * Keep these tokens in sync with Tailwind's design tokens so generated
 * PDFs feel like a natural extension of the app UI. React-PDF uses a
 * Flexbox-like layout and a subset of CSS — colours + font sizes are
 * plain numbers (points).
 */

export const pdfColors = {
  foreground: "#0F172A",      // slate-900
  mutedForeground: "#64748B", // slate-500
  border: "#E2E8F0",          // slate-200
  subtle: "#F8FAFC",          // slate-50
  primary: "#2563EB",         // blue-600
  success: "#16A34A",         // green-600
  warning: "#CA8A04",         // amber-600
  danger: "#DC2626",          // red-600
} as const;

export const pdfSpacing = {
  page: 40,
  sectionGap: 18,
  rowGap: 6,
} as const;

export const pdfFonts = {
  base: "Helvetica",
  bold: "Helvetica-Bold",
  mono: "Courier",
} as const;

export const pdfSizes = {
  xs: 8,
  sm: 9,
  base: 10,
  md: 11,
  lg: 14,
  xl: 18,
  h1: 22,
} as const;
