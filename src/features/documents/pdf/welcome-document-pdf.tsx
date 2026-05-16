import "server-only";

import * as React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { WelcomeDocumentSection } from "@/features/welcome-documents/types";
import { welcomeMarkdownToPlain } from "@/features/welcome-documents/markdown";
import { pdfColors, pdfFonts, pdfSizes, pdfSpacing } from "./theme";

/**
 * The welcome-document PDF leans into the *onboarding-guide* feel: no
 * signature blocks, no money strip, no legal-doc framing. Big airy
 * spacing, a subtle accent rail down the left edge, and a friendly
 * sender block at the top.
 *
 * If the freelancer set a brand colour we use it for the rail + section
 * numbers; otherwise we fall back to the default primary.
 */

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

const s = StyleSheet.create({
  page: {
    fontFamily: pdfFonts.base,
    fontSize: pdfSizes.base,
    color: pdfColors.foreground,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: pdfSpacing.page,
    lineHeight: 1.6,
  },
  // Vertical accent ribbon on the left edge — runs the full page.
  accentRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 6,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  brand: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  brandText: {},
  brandName: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
  },
  brandMeta: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
  },
  logo: { width: 38, height: 38, objectFit: "contain" },
  logoFallback: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: "#FFFFFF",
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
  },
  kindPill: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.xs,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  // Title block
  titleBlock: { marginTop: 8, marginBottom: 22 },
  title: {
    fontFamily: pdfFonts.bold,
    fontSize: 28,
    lineHeight: 1.18,
  },
  subtitle: {
    marginTop: 8,
    fontSize: pdfSizes.md,
    color: pdfColors.mutedForeground,
  },
  // Recipient strip
  recipientBox: {
    marginBottom: 22,
    padding: 12,
    borderRadius: 6,
    backgroundColor: pdfColors.subtle,
    borderLeft: `3px solid ${pdfColors.border}`,
  },
  recipientLabel: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  recipientName: { fontFamily: pdfFonts.bold, fontSize: pdfSizes.md },
  recipientMeta: { fontSize: pdfSizes.xs, color: pdfColors.mutedForeground },
  // Intro
  intro: {
    fontSize: pdfSizes.md,
    lineHeight: 1.7,
    color: pdfColors.foreground,
    marginBottom: 26,
  },
  // Sections
  section: {
    marginBottom: 18,
    paddingLeft: 28,
    position: "relative",
  },
  sectionNumber: {
    position: "absolute",
    top: 1,
    left: 0,
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
    width: 22,
    textAlign: "left",
  },
  sectionHeading: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.lg,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: pdfSizes.sm,
    lineHeight: 1.7,
    color: pdfColors.foreground,
  },
  // Acknowledgement strip at the bottom of the last page
  ackBox: {
    marginTop: 26,
    padding: 14,
    borderRadius: 6,
    backgroundColor: "#F4F8FE",
    border: `1px solid #DBE7FB`,
  },
  ackTitle: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
    marginBottom: 4,
  },
  ackBody: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    lineHeight: 1.6,
  },
  ackLink: {
    marginTop: 6,
    fontSize: pdfSizes.xs,
    color: pdfColors.primary,
  },
  // Footer
  footer: {
    position: "absolute",
    left: pdfSpacing.page,
    right: pdfSpacing.page,
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
  },
});

export function WelcomeDocumentPdf({
  data,
}: {
  data: WelcomeDocumentPdfData;
}) {
  const accent = (data.brandColor ?? pdfColors.primary).trim();
  const initials = data.seller.businessName.slice(0, 2).toUpperCase();

  return (
    <Document
      title={data.title}
      author={data.seller.businessName}
      subject="Welcome guide"
    >
      <Page size="A4" style={s.page}>
        <View style={[s.accentRail, { backgroundColor: accent }]} fixed />

        {/* Header */}
        <View style={s.header}>
          <View style={s.brand}>
            {data.seller.logoDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.seller.logoDataUrl} style={s.logo} />
            ) : (
              <View
                style={[s.logoFallback, { backgroundColor: accent }]}
              >
                <Text style={s.logoFallbackText}>{initials}</Text>
              </View>
            )}
            <View style={s.brandText}>
              <Text style={s.brandName}>{data.seller.businessName}</Text>
              {data.seller.email && (
                <Text style={s.brandMeta}>{data.seller.email}</Text>
              )}
              {data.seller.website && (
                <Text style={s.brandMeta}>{data.seller.website}</Text>
              )}
            </View>
          </View>
          <Text style={[s.kindPill, { color: accent }]}>Welcome guide</Text>
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{data.title}</Text>
          {data.publishedAt && (
            <Text style={s.subtitle}>
              Prepared {formatDate(data.publishedAt)}
            </Text>
          )}
        </View>

        {/* Recipient (only if we know who) */}
        {data.recipient?.name && (
          <View style={s.recipientBox}>
            <Text style={s.recipientLabel}>For</Text>
            <Text style={s.recipientName}>{data.recipient.name}</Text>
            {(data.recipient.company || data.recipient.email) && (
              <Text style={s.recipientMeta}>
                {[data.recipient.company, data.recipient.email]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
          </View>
        )}

        {/* Intro */}
        {data.intro && data.intro.trim() && (
          <Text style={s.intro}>{welcomeMarkdownToPlain(data.intro)}</Text>
        )}

        {/* Sections */}
        {data.sections.map((sec, i) => (
          <View key={sec.id ?? i} style={s.section} wrap={false}>
            <Text style={[s.sectionNumber, { color: accent }]}>
              {String(i + 1).padStart(2, "0")}
            </Text>
            <Text style={s.sectionHeading}>{sec.heading}</Text>
            <Text style={s.sectionBody}>
              {welcomeMarkdownToPlain(sec.body)}
            </Text>
          </View>
        ))}

        {/* Optional acknowledgement nudge */}
        {data.acknowledgementRequired && data.publicUrl && (
          <View style={s.ackBox}>
            <Text style={s.ackTitle}>Please confirm you&rsquo;ve read this</Text>
            <Text style={s.ackBody}>
              Once you&rsquo;ve had a chance to read through, open the link
              below and tap &ldquo;I&rsquo;ve read and understood&rdquo;.
              That&rsquo;s our handshake to get started.
            </Text>
            <Text style={s.ackLink}>{data.publicUrl}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>{data.seller.businessName}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
