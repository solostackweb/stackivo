import "server-only";

/**
 * Brand resolver for generated documents.
 *
 * Every PDF template (and the new email layout) calls `resolveBrand(...)`
 * and consumes ONLY that result. Branding data lives across several
 * fields on `user_profiles` — this module collapses them into one shape
 * with sensible defaults, so a template never has to deal with nulls,
 * fallbacks, or weird colour formatting.
 */

import type { UserProfileRow } from "@/lib/supabase/types";
import { pdfColors } from "./theme";

export interface ResolvedBrand {
  /** Display name used everywhere — header, footer, party blocks. */
  businessName: string;
  /** Legal entity — surfaced under businessName when different. */
  legalName: string | null;
  /** Headline tagline if the freelancer added one. */
  tagline: string | null;

  /** Web-resolvable URL to the brand logo (signed if private). */
  logoUrl: string | null;

  /** Brand colour in `#RRGGBB`. Always a valid hex. */
  accent: string;
  /**
   * A very light tint of `accent` for surface fills (e.g. table header
   * stripe, soft callout boxes). Derived deterministically so two
   * documents from the same freelancer always look the same.
   */
  accentSoft: string;
  /**
   * Contrasting on-accent text colour — white for dark brand colours,
   * dark slate for very light brand colours.
   */
  onAccent: string;

  /** Contact lines surfaced on the document footer + brand header. */
  contact: {
    email: string | null;
    phone: string | null;
    website: string | null;
  };
  /** Postal address as up to four lines. */
  addressLines: string[];

  /** GST / PAN identifiers if registered. */
  gstin: string | null;
  pan: string | null;
  stateCode: string | null;

  /** Footer note (e.g. "Thank you for your business"). Optional. */
  footerNote: string | null;
}

/**
 * Resolve a brand snapshot from a `user_profiles` row.
 *
 * `logoUrl` is passed in separately because it usually requires a
 * signed-URL step that happens in the builder layer.
 */
export function resolveBrand(
  seller: UserProfileRow | null,
  logoUrl: string | null,
): ResolvedBrand {
  const businessName =
    seller?.business_name ??
    seller?.company_name ??
    seller?.legal_name ??
    seller?.full_name ??
    "Your Business";

  const legalName =
    seller?.legal_name && seller.legal_name !== businessName
      ? seller.legal_name
      : null;

  const accent = sanitizeColor(seller?.brand_color ?? null) ?? pdfColors.primary;
  const accentSoft = softenHex(accent);
  const onAccent = readableOnHex(accent);

  return {
    businessName,
    legalName,
    tagline:
      typeof seller?.brand_tagline === "string" && seller.brand_tagline.trim()
        ? seller.brand_tagline.trim()
        : null,
    logoUrl,
    accent,
    accentSoft,
    onAccent,
    contact: {
      email: seller?.business_email ?? seller?.email ?? null,
      phone: seller?.business_phone ?? seller?.phone ?? null,
      website: seller?.website ?? null,
    },
    addressLines: composeAddress(
      seller?.address_line1,
      seller?.address_line2,
      seller?.city,
      seller?.postal_code,
      seller?.country,
    ),
    gstin: seller?.gstin ?? seller?.gst_number ?? null,
    pan: seller?.pan ?? null,
    stateCode: seller?.state_code ?? null,
    footerNote: null,
  };
}

// --- Helpers --------------------------------------------------------------

function composeAddress(...parts: Array<string | null | undefined>): string[] {
  return parts.filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
}

/** Allow only `#RRGGBB`. Anything else falls back to the platform primary. */
function sanitizeColor(value: string | null): string | null {
  if (!value) return null;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : null;
}

/**
 * Produce a very light tint of the brand accent for soft surface fills.
 * Mixes the accent with white at 92% — gives a subtle wash that reads
 * cleanly behind 11pt body text.
 */
function softenHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const blend = (c: number) => Math.round(c + (255 - c) * 0.92);
  return rgbToHex(blend(r), blend(g), blend(b));
}

/**
 * Choose a foreground that reads cleanly on top of `hex`. Uses
 * standard luminance — white over dark brand colours, near-black slate
 * over pale brand colours (a few freelancers set very pastel brands).
 */
function readableOnHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  // sRGB luminance approximation.
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.65 ? pdfColors.foreground : pdfColors.white;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
