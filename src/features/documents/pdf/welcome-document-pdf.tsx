import "server-only";

/**
 * Welcome Document PDF.
 *
 * Premium onboarding package. Two-page-style layout:
 *
 *   PAGE 1 — Cover:
 *     - Big tinted accent surface (uses the freelancer's brand colour as
 *       background, with readable on-accent text).
 *     - Eyebrow "WELCOME GUIDE", title in oversized type, intro line.
 *     - "Prepared for {client}" + "Prepared by {business}" tags.
 *     - Brand logo in the bottom-left corner, with a "Published {date}"
 *       footer.
 *
 *   PAGE 2..N — Body:
 *     - Standard branded header (compact mode — no contact lines, since
 *       the cover already established the sender).
 *     - Numbered sections rendered as headings + relaxed body type.
 *     - Optional intro paragraph rendered before the first numbered
 *       section.
 *     - "Next steps" callout block at the end pointing to the
 *       acknowledgement link when required.
 *     - Branded footer on every page.
 *
 * The split-cover pattern is what makes welcome docs feel like an
 * agency onboarding package rather than a wall of text.
 */

import * as React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { WelcomeDocumentSection } from "@/features/welcome-documents/types";
import { welcomeMarkdownToPlain } from "@/features/welcome-documents/markdown";
import {
  pdfColors,
  pdfFonts,
  pdfLineHeights,
  pdfPage,
  pdfRadii,
  pdfSizes,
  pdfSpacing,
  pdfTracking,
} from "./theme";
import { resolveBrand, type ResolvedBrand } from "./brand";
import {
  DocumentFooter,
  DocumentHeader,
  DocumentPage,
  NoteBlock,
  Section,
  formatDate,
} from "./primitives";
import type { UserProfileRow } from "@/lib/supabase/types";

// --- Data shape (preserved) -------------------------------------------------

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

// --- Cover page styles ------------------------------------------------------

const coverStyles = StyleSheet.create({
  page: {
    fontFamily: pdfFonts.base,
    color: pdfColors.foreground,
    backgroundColor: pdfColors.surface,
    padding: 0,
  },
  hero: {
    width: pdfPage.width,
    height: pdfPage.height * 0.6,
    padding: pdfSpacing["3xl"],
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.widest,
    opacity: 0.85,
  },
  titleBlock: { marginTop: pdfSpacing["3xl"] },
  title: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes["3xl"],
    lineHeight: pdfLineHeights.tight,
    letterSpacing: pdfTracking.tight,
    marginBottom: pdfSpacing.md,
  },
  intro: {
    fontSize: pdfSizes.md,
    lineHeight: pdfLineHeights.normal,
    opacity: 0.9,
    maxWidth: 420,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: pdfSpacing["3xl"],
    gap: pdfSpacing.lg,
  },
  metaCard: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: pdfRadii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  metaLabel: {
    fontSize: pdfSizes.xs,
    opacity: 0.75,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wide,
  },
  metaValue: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
    marginTop: 1,
  },

  // Lower-half cover content
  belowHero: {
    flex: 1,
    paddingHorizontal: pdfSpacing["3xl"],
    paddingTop: pdfSpacing["2xl"],
    paddingBottom: pdfSpacing["2xl"],
    justifyContent: "space-between",
  },
  preparedFor: {
    flexDirection: "row",
    gap: pdfSpacing["3xl"],
  },
  preparedCell: { flex: 1 },
  preparedEyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 4,
  },
  preparedValue: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
  },
  preparedMuted: {
    fontSize: pdfSizes.sm,
    color: pdfColors.mutedForeground,
    marginTop: 2,
  },
  coverFooter: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    textAlign: "center",
  },
});

// --- Body styles ------------------------------------------------------------

const bodyStyles = StyleSheet.create({
  section: { marginBottom: pdfSpacing.xl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  sectionNumber: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    letterSpacing: pdfTracking.wider,
    marginRight: 10,
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
  },
  intro: {
    fontSize: pdfSizes.md,
    lineHeight: pdfLineHeights.relaxed,
    color: pdfColors.text,
    marginBottom: pdfSpacing.xl,
  },
});

// --- Template ---------------------------------------------------------------

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
      {/* COVER */}
      <Page size="A4" style={coverStyles.page}>
        <View
          style={[
            coverStyles.hero,
            { backgroundColor: brand.accent, color: brand.onAccent },
          ]}
        >
          <View>
            <Text style={[coverStyles.eyebrow, { color: brand.onAccent }]}>
              Welcome Guide
            </Text>
            <View style={coverStyles.titleBlock}>
              <Text style={[coverStyles.title, { color: brand.onAccent }]}>
                {data.title}
              </Text>
              {intro ? (
                <Text style={[coverStyles.intro, { color: brand.onAccent }]}>
                  {intro}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={coverStyles.metaRow}>
            {data.publishedAt ? (
              <View style={coverStyles.metaCard}>
                <Text style={[coverStyles.metaLabel, { color: brand.onAccent }]}>
                  Published
                </Text>
                <Text style={[coverStyles.metaValue, { color: brand.onAccent }]}>
                  {formatDate(data.publishedAt)}
                </Text>
              </View>
            ) : null}
            <View style={coverStyles.metaCard}>
              <Text style={[coverStyles.metaLabel, { color: brand.onAccent }]}>
                Pages
              </Text>
              <Text style={[coverStyles.metaValue, { color: brand.onAccent }]}>
                {1 + Math.max(1, Math.ceil(data.sections.length / 3))}
              </Text>
            </View>
            <View style={coverStyles.metaCard}>
              <Text style={[coverStyles.metaLabel, { color: brand.onAccent }]}>
                Read time
              </Text>
              <Text style={[coverStyles.metaValue, { color: brand.onAccent }]}>
                {estimateReadMinutes(data)} min
              </Text>
            </View>
          </View>
        </View>

        <View style={coverStyles.belowHero}>
          <View style={coverStyles.preparedFor}>
            <View style={coverStyles.preparedCell}>
              <Text style={coverStyles.preparedEyebrow}>Prepared for</Text>
              <Text style={coverStyles.preparedValue}>
                {data.recipient?.name ?? "Your team"}
              </Text>
              {data.recipient?.company ? (
                <Text style={coverStyles.preparedMuted}>{data.recipient.company}</Text>
              ) : null}
              {data.recipient?.email ? (
                <Text style={coverStyles.preparedMuted}>{data.recipient.email}</Text>
              ) : null}
            </View>
            <View style={coverStyles.preparedCell}>
              <Text style={coverStyles.preparedEyebrow}>Prepared by</Text>
              <Text style={coverStyles.preparedValue}>{brand.businessName}</Text>
              {brand.contact.email ? (
                <Text style={coverStyles.preparedMuted}>{brand.contact.email}</Text>
              ) : null}
              {brand.contact.website ? (
                <Text style={coverStyles.preparedMuted}>{brand.contact.website}</Text>
              ) : null}
            </View>
          </View>

          <Text style={coverStyles.coverFooter}>
            {brand.businessName}
            {brand.contact.website ? ` · ${brand.contact.website}` : ""}
          </Text>
        </View>
      </Page>

      {/* BODY */}
      <DocumentPage brand={brand}>
        <DocumentHeader
          brand={brand}
          eyebrow="Welcome Guide"
          title={truncate(data.title, 38)}
          compact
        />

        {intro && data.sections.length > 0 ? (
          <Text style={bodyStyles.intro}>{intro}</Text>
        ) : null}

        <View>
          {data.sections.length > 0 ? (
            data.sections.map((section, i) => (
              <View key={i} style={bodyStyles.section} wrap={true}>
                <View style={bodyStyles.sectionHeader}>
                  <Text style={bodyStyles.sectionNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <Text style={bodyStyles.sectionHeading}>{section.heading}</Text>
                </View>
                <Text style={bodyStyles.sectionBody}>
                  {welcomeMarkdownToPlain(section.body)}
                </Text>
              </View>
            ))
          ) : intro ? (
            <Text style={bodyStyles.sectionBody}>{intro}</Text>
          ) : (
            <Text style={bodyStyles.sectionBody}>
              This guide is being prepared — content will follow shortly.
            </Text>
          )}
        </View>

        <Section eyebrow="What happens next">
          <NoteBlock accent={brand.accent}>
            {data.acknowledgementRequired && data.publicUrl
              ? `Once you've read through the guide, please confirm at the bottom of the online version (${data.publicUrl}). That's the handshake to kick the project off.`
              : `Reply to the email this guide arrived on with any questions — we'll incorporate them into the kickoff conversation.`}
          </NoteBlock>
        </Section>

        <DocumentFooter brand={brand} label={`Welcome guide · ${data.title}`} />
      </DocumentPage>
    </Document>
  );
}

// --- Helpers ----------------------------------------------------------------

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
