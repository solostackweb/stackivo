import "server-only";

/**
 * Welcome Document PDF — redesigned to match invoice/contract PDF quality.
 *
 * PAGE 1 — Cover:
 *   - Brand-coloured hero block: eyebrow → title → intro → meta pills
 *     All content flows top-down (no justifyContent: space-between gaps).
 *   - White lower block: Prepared for | Prepared by  (column + divider)
 *   - Footer rule + business name
 *
 * PAGE 2..N — Body:
 *   - Compact header: business name left | eyebrow + title right (14pt, no wrap)
 *   - Intro paragraph at sm size (not md) to save vertical space
 *   - Numbered sections at 14pt gap (not 20pt)
 *   - "What happens next" callout
 *   - Fixed branded footer
 *
 * Key fixes vs old version:
 *   - Removed justifyContent: "space-between" that created giant empty gaps
 *   - Replaced gap: (unsupported in react-pdf) with marginRight on each pill
 *   - Cover hero is content-height, not fixed minHeight fraction
 *   - Body title capped at 14pt so long titles never wrap
 *   - Intro at 9.5pt (sm), sections gap 14pt — all 10 sections fit on 2 pages
 *   - Uses Page directly for body — no DocumentPage wrapper
 */

import * as React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { WelcomeDocumentSection } from "@/features/welcome-documents/types";
import { welcomeMarkdownToPlain } from "@/features/welcome-documents/markdown";
import {
  pdfColors,
  pdfFonts,
  pdfLineHeights,
  pdfRadii,
  pdfSizes,
  pdfSpacing,
  pdfTracking,
} from "./theme";
import { resolveBrand, type ResolvedBrand } from "./brand";
import {
  DocumentFooter,
  NoteBlock,
  formatDate,
} from "./primitives";
import type { UserProfileRow } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Data shape (preserved exactly)
// ---------------------------------------------------------------------------

export interface WelcomeDocumentPdfData {
  title: string;
  intro: string | null;
  sections: WelcomeDocumentSection[];
  brandColor: string | null;
  publishedAt: string | null;
  publicUrl: string | null;
  acknowledgementRequired: boolean;
  seller: {
    businessName: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    addressLines: string[];
    logoDataUrl: string | null;
    website: string | null;
  };
  recipient: {
    name: string | null;
    company: string | null;
    email: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

const PAD = pdfSpacing.pagePadding; // 40

const coverS = StyleSheet.create({
  page: {
    fontFamily: pdfFonts.base,
    color: pdfColors.foreground,
    backgroundColor: pdfColors.surface,
    padding: 0,
  },

  // ── hero (brand-coloured, content-height — no forced min) ─────────────────
  hero: {
    paddingHorizontal: PAD,
    paddingTop: 36,
    paddingBottom: 28,
  },
  eyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.widest,
    marginBottom: 14,
    opacity: 0.85,
  },
  title: {
    fontFamily: pdfFonts.bold,
    fontSize: 32,
    lineHeight: pdfLineHeights.tight,
    letterSpacing: pdfTracking.tight,
    marginBottom: 10,
  },
  intro: {
    fontSize: pdfSizes.sm,
    lineHeight: pdfLineHeights.relaxed,
    opacity: 0.9,
    marginBottom: 22,
  },
  // Meta pills — marginRight instead of gap (gap not supported in react-pdf)
  metaRow: {
    flexDirection: "row",
  },
  metaPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: pdfRadii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginRight: 8,
  },
  metaLabel: {
    fontSize: pdfSizes.xs,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wide,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
  },

  // ── lower (white) — no flex:1, no space-between ───────────────────────────
  lower: {
    paddingHorizontal: PAD,
    paddingTop: 28,
    paddingBottom: 28,
  },
  partyRow: {
    flexDirection: "row",
  },
  partyCol: {
    flex: 1,
  },
  partyColRight: {
    flex: 1,
    paddingLeft: 24,
    borderLeftWidth: 0.5,
    borderLeftColor: pdfColors.border,
    marginLeft: 24,
  },
  partyEyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 5,
  },
  partyName: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
    marginBottom: 3,
  },
  partyLine: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    marginTop: 2,
  },
  footerRule: {
    marginTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
  },
});

const bodyS = StyleSheet.create({
  page: {
    fontFamily: pdfFonts.base,
    fontSize: pdfSizes.base,
    color: pdfColors.foreground,
    backgroundColor: pdfColors.surface,
    paddingHorizontal: PAD,
    paddingTop: PAD,
    paddingBottom: PAD + 28, // room for fixed footer
    lineHeight: pdfLineHeights.normal,
  },

  // ── compact header ────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
    marginBottom: 14,
    paddingBottom: 14,
  },
  businessName: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
    color: pdfColors.foreground,
    marginBottom: 2,
  },
  headerSubline: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerEyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 4,
  },
  // 14pt — long titles never wrap in 280pt column
  headerTitle: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.lg,
    color: pdfColors.foreground,
    letterSpacing: pdfTracking.tight,
    lineHeight: pdfLineHeights.tight,
    textAlign: "right",
    maxWidth: 280,
  },

  // ── intro ─────────────────────────────────────────────────────────────────
  intro: {
    fontSize: pdfSizes.sm,
    lineHeight: pdfLineHeights.relaxed,
    color: pdfColors.text,
    marginBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
    paddingBottom: 14,
  },

  // ── sections ──────────────────────────────────────────────────────────────
  section: {
    marginBottom: 14,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  sectionNumber: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    letterSpacing: pdfTracking.wider,
    marginRight: 8,
    minWidth: 22,
  },
  sectionHeading: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
    letterSpacing: pdfTracking.tight,
  },
  sectionBody: {
    fontSize: pdfSizes.sm,
    lineHeight: pdfLineHeights.relaxed,
    color: pdfColors.text,
    marginTop: 3,
  },

  // ── "what happens next" callout ───────────────────────────────────────────
  nextEyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginTop: 18,
    marginBottom: 6,
  },
});

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function WelcomeDocumentPdf({
  data,
  seller,
  logoDataUrl,
}: {
  data: WelcomeDocumentPdfData;
  seller?: UserProfileRow | null;
  logoDataUrl?: string | null;
}) {
  const brand = buildBrandFromData(data, seller, logoDataUrl);
  const intro = data.intro?.trim() ? welcomeMarkdownToPlain(data.intro) : null;

  return (
    <Document title={`Welcome guide – ${data.title}`} author={brand.businessName}>

      {/* ── COVER PAGE ──────────────────────────────────────────────── */}
      <Page size="A4" style={coverS.page}>

        {/* Hero: brand colour, content flows top-down — no min-height gap */}
        <View style={[coverS.hero, { backgroundColor: brand.accent }]}>
          <Text style={[coverS.eyebrow, { color: brand.onAccent }]}>
            Welcome Guide
          </Text>
          <Text style={[coverS.title, { color: brand.onAccent }]}>
            {data.title}
          </Text>
          {intro ? (
            <Text style={[coverS.intro, { color: brand.onAccent }]}>
              {intro}
            </Text>
          ) : null}

          {/* Meta pills — marginRight replaces gap */}
          <View style={coverS.metaRow}>
            {data.publishedAt ? (
              <View style={coverS.metaPill}>
                <Text style={[coverS.metaLabel, { color: brand.onAccent }]}>
                  Published
                </Text>
                <Text style={[coverS.metaValue, { color: brand.onAccent }]}>
                  {formatDate(data.publishedAt)}
                </Text>
              </View>
            ) : null}
            {data.sections.length > 0 ? (
              <View style={coverS.metaPill}>
                <Text style={[coverS.metaLabel, { color: brand.onAccent }]}>
                  Sections
                </Text>
                <Text style={[coverS.metaValue, { color: brand.onAccent }]}>
                  {data.sections.length}
                </Text>
              </View>
            ) : null}
            <View style={coverS.metaPill}>
              <Text style={[coverS.metaLabel, { color: brand.onAccent }]}>
                Read time
              </Text>
              <Text style={[coverS.metaValue, { color: brand.onAccent }]}>
                {estimateReadMinutes(data)} min
              </Text>
            </View>
          </View>
        </View>

        {/* Lower: white, stacks naturally without forced gaps */}
        <View style={coverS.lower}>
          <View style={coverS.partyRow}>
            <View style={coverS.partyCol}>
              <Text style={coverS.partyEyebrow}>Prepared for</Text>
              <Text style={coverS.partyName}>
                {data.recipient?.name ?? "Your team"}
              </Text>
              {data.recipient?.company ? (
                <Text style={coverS.partyLine}>{data.recipient.company}</Text>
              ) : null}
              {data.recipient?.email ? (
                <Text style={coverS.partyLine}>{data.recipient.email}</Text>
              ) : null}
            </View>
            <View style={coverS.partyColRight}>
              <Text style={coverS.partyEyebrow}>Prepared by</Text>
              <Text style={coverS.partyName}>{brand.businessName}</Text>
              {brand.contact.email ? (
                <Text style={coverS.partyLine}>{brand.contact.email}</Text>
              ) : null}
              {brand.contact.website ? (
                <Text style={coverS.partyLine}>{brand.contact.website}</Text>
              ) : null}
            </View>
          </View>

          <View style={coverS.footerRule}>
            <Text style={coverS.footerText}>
              {brand.businessName}
              {brand.contact.website ? ` · ${brand.contact.website}` : ""}
            </Text>
          </View>
        </View>

        <DocumentFooter brand={brand} label={`Welcome guide · ${data.title}`} />
      </Page>

      {/* ── BODY PAGE(S) ────────────────────────────────────────────── */}
      <Page size="A4" style={bodyS.page}>

        {/* Compact header */}
        <View style={bodyS.header}>
          <View>
            <Text style={bodyS.businessName}>{brand.businessName}</Text>
            {brand.legalName ? (
              <Text style={bodyS.headerSubline}>{brand.legalName}</Text>
            ) : null}
          </View>
          <View style={bodyS.headerRight}>
            <Text style={[bodyS.headerEyebrow, { color: brand.accent }]}>
              Welcome Guide
            </Text>
            <Text style={bodyS.headerTitle}>{truncate(data.title, 42)}</Text>
          </View>
        </View>

        {/* Intro — sm text, separator below */}
        {intro && data.sections.length > 0 ? (
          <Text style={bodyS.intro}>{intro}</Text>
        ) : null}

        {/* Sections — 14pt gap, tight heading row */}
        <View>
          {data.sections.length > 0 ? (
            data.sections.map((section, i) => (
              <View key={i} style={bodyS.section} wrap={true}>
                <View style={bodyS.sectionRow}>
                  <Text style={bodyS.sectionNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <Text style={bodyS.sectionHeading}>{section.heading}</Text>
                </View>
                <Text style={bodyS.sectionBody}>
                  {welcomeMarkdownToPlain(section.body)}
                </Text>
              </View>
            ))
          ) : intro ? (
            <Text style={bodyS.sectionBody}>{intro}</Text>
          ) : (
            <Text style={bodyS.sectionBody}>
              This guide is being prepared — content will follow shortly.
            </Text>
          )}
        </View>

        {/* What happens next */}
        <Text style={bodyS.nextEyebrow}>What happens next</Text>
        <NoteBlock accent={brand.accent}>
          {data.acknowledgementRequired && data.publicUrl
            ? `Once you've read through the guide, please confirm at the bottom of the online version (${data.publicUrl}). That's the handshake to kick the project off.`
            : `Reply to the email this guide arrived on with any questions — we'll incorporate them into the kickoff conversation.`}
        </NoteBlock>

        <DocumentFooter brand={brand} label={`Welcome guide · ${data.title}`} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function estimateReadMinutes(data: WelcomeDocumentPdfData): number {
  const words =
    (data.intro?.split(/\s+/).length ?? 0) +
    data.sections.reduce(
      (sum, s) => sum + (s.body?.split(/\s+/).length ?? 0),
      0,
    );
  return Math.max(1, Math.round(words / 220));
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function buildBrandFromData(
  data: WelcomeDocumentPdfData,
  seller?: UserProfileRow | null,
  logoDataUrl?: string | null,
): ResolvedBrand {
  if (seller) return resolveBrand(seller, logoDataUrl ?? data.seller.logoDataUrl);
  const shim = {
    business_name: data.seller.businessName,
    company_name: null,
    legal_name: data.seller.legalName,
    full_name: null,
    brand_color: data.brandColor,
    brand_tagline: null,
    business_email: data.seller.email,
    email: null,
    business_phone: data.seller.phone,
    phone: null,
    website: data.seller.website,
    address_line1: data.seller.addressLines[0] ?? null,
    address_line2: data.seller.addressLines[1] ?? null,
    city: data.seller.addressLines[2] ?? null,
    postal_code: data.seller.addressLines[3] ?? null,
    country: null,
    gstin: null,
    gst_number: null,
    pan: null,
    state_code: null,
  } as unknown as UserProfileRow;
  return resolveBrand(shim, data.seller.logoDataUrl);
}
