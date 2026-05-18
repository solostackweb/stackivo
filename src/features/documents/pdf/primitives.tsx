import "server-only";

/**
 * Reusable PDF primitives.
 *
 * Every redesigned template (invoice, receipt, contract, welcome doc)
 * composes its layout from these components. The goal is that visual
 * decisions — header rules, padding, badge tone, table styling — live
 * here ONCE and propagate to all generated documents.
 *
 * React-PDF only supports a subset of CSS. These primitives keep all
 * style choices inside the tokens defined in `./theme.ts`.
 */

import * as React from "react";
import {
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from "@react-pdf/renderer";
import { pdfColors, pdfSpacing, pdfSizes, pdfFonts, pdfRadii, pdfTracking, pdfLineHeights } from "./theme";
import type { ResolvedBrand } from "./brand";

// =============================================================================
// PAGE
// =============================================================================

const pageStyles = StyleSheet.create({
  page: {
    fontFamily: pdfFonts.base,
    fontSize: pdfSizes.base,
    color: pdfColors.foreground,
    backgroundColor: pdfColors.surface,
    padding: pdfSpacing.pagePadding,
    paddingTop: pdfSpacing.pagePadding,
    paddingBottom: pdfSpacing.pagePadding + 28, // room for fixed footer
    lineHeight: pdfLineHeights.normal,
  },
  accentRule: {
    height: 3,
    width: 64,
    borderRadius: pdfRadii.pill,
    marginBottom: pdfSpacing.lg,
  },
  contentWrap: { flex: 1 },
});

/**
 * Standard A4 page used by every template. The top accent rule is
 * rendered automatically and tinted with the brand colour — a single
 * shared signature mark across all documents.
 */
export function DocumentPage({
  brand,
  children,
}: {
  brand: ResolvedBrand;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={pageStyles.page}>
      <View style={[pageStyles.accentRule, { backgroundColor: brand.accent }]} />
      <View style={pageStyles.contentWrap}>{children}</View>
    </Page>
  );
}

// =============================================================================
// HEADER
// =============================================================================

const headerStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: pdfSpacing["2xl"],
  },
  left: { flexDirection: "row", alignItems: "flex-start", maxWidth: "60%" },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
    marginRight: pdfSpacing.md,
  },
  brandStack: { flexShrink: 1 },
  businessName: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
    lineHeight: pdfLineHeights.tight,
    marginBottom: 2,
  },
  legalName: {
    fontSize: pdfSizes.sm,
    color: pdfColors.mutedForeground,
    marginBottom: 4,
  },
  tagline: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    fontFamily: pdfFonts.italic,
    marginBottom: 6,
  },
  contactLine: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    marginTop: 1,
  },
  right: { alignItems: "flex-end", maxWidth: "45%" },
  eyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 4,
  },
  title: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes["2xl"],
    color: pdfColors.foreground,
    lineHeight: pdfLineHeights.tight,
    textAlign: "right",
    letterSpacing: pdfTracking.tight,
  },
  subtitle: {
    fontFamily: pdfFonts.semibold,
    fontSize: pdfSizes.sm,
    color: pdfColors.mutedForeground,
    marginTop: 4,
    textAlign: "right",
  },
});

export interface DocumentHeaderProps {
  brand: ResolvedBrand;
  /** Eyebrow shown above the document title (e.g. "TAX INVOICE", "RECEIPT"). */
  eyebrow?: string;
  /** Main right-side title (e.g. the invoice number). */
  title?: string;
  /** Optional subtitle (e.g. "Issued 12 May 2026"). */
  subtitle?: string;
  /** Right-side decoration — usually a status `<Badge>`. */
  decoration?: React.ReactNode;
  /** Hide contact lines on documents that surface them elsewhere. */
  compact?: boolean;
}

/**
 * Branded header used at the top of every page-1 of a generated
 * document. Two columns: brand identity left, document identity right.
 */
export function DocumentHeader({
  brand,
  eyebrow,
  title,
  subtitle,
  decoration,
  compact,
}: DocumentHeaderProps) {
  const showContact = !compact;
  return (
    <View style={headerStyles.wrap} fixed={false}>
      <View style={headerStyles.left}>
        {brand.logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={brand.logoUrl} style={headerStyles.logo} />
        ) : null}
        <View style={headerStyles.brandStack}>
          <Text style={headerStyles.businessName}>{brand.businessName}</Text>
          {brand.legalName ? (
            <Text style={headerStyles.legalName}>{brand.legalName}</Text>
          ) : null}
          {brand.tagline ? (
            <Text style={headerStyles.tagline}>{brand.tagline}</Text>
          ) : null}
          {showContact ? (
            <>
              {brand.contact.email ? (
                <Text style={headerStyles.contactLine}>{brand.contact.email}</Text>
              ) : null}
              {brand.contact.phone ? (
                <Text style={headerStyles.contactLine}>{brand.contact.phone}</Text>
              ) : null}
              {brand.contact.website ? (
                <Text style={headerStyles.contactLine}>{brand.contact.website}</Text>
              ) : null}
              {brand.gstin ? (
                <Text style={headerStyles.contactLine}>GSTIN: {brand.gstin}</Text>
              ) : null}
              {brand.pan ? (
                <Text style={headerStyles.contactLine}>PAN: {brand.pan}</Text>
              ) : null}
            </>
          ) : null}
        </View>
      </View>

      {(eyebrow || title || subtitle || decoration) && (
        <View style={headerStyles.right}>
          {eyebrow ? (
            <Text style={[headerStyles.eyebrow, { color: brand.accent }]}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? <Text style={headerStyles.title}>{title}</Text> : null}
          {subtitle ? <Text style={headerStyles.subtitle}>{subtitle}</Text> : null}
          {decoration ? <View style={{ marginTop: 10 }}>{decoration}</View> : null}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// FOOTER (fixed, runs on every page)
// =============================================================================

const footerStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: pdfSpacing.pagePadding,
    right: pdfSpacing.pagePadding,
    bottom: pdfSpacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: pdfSpacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: pdfRadii.pill,
    marginRight: 6,
  },
  txt: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
  },
  pageNumber: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    fontFamily: pdfFonts.semibold,
  },
});

/**
 * Branded footer fixed to every page. Carries a small brand dot in the
 * accent colour + a "{Business} · {label}" line on the left and a page
 * counter on the right.
 */
export function DocumentFooter({
  brand,
  label,
}: {
  brand: ResolvedBrand;
  /** Short identifier — e.g. "Invoice STK-2026-00012" or "Receipt RCP-...". */
  label?: string;
}) {
  return (
    <View style={footerStyles.wrap} fixed>
      <View style={footerStyles.left}>
        <View style={[footerStyles.dot, { backgroundColor: brand.accent }]} />
        <Text style={footerStyles.txt}>
          {brand.businessName}
          {label ? ` · ${label}` : ""}
        </Text>
      </View>
      <Text
        style={footerStyles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// =============================================================================
// BADGE
// =============================================================================

const badgeStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: pdfRadii.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: pdfRadii.pill,
    marginRight: 6,
  },
  text: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    letterSpacing: pdfTracking.wide,
    textTransform: "uppercase",
  },
});

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

/**
 * Compact pill — used for invoice statuses, "PAID" stamps, etc. A small
 * leading dot keeps it readable at distance and in greyscale prints.
 */
export function Badge({
  tone = "neutral",
  brandAccent,
  label,
}: {
  tone?: BadgeTone;
  brandAccent: string;
  label: string;
}) {
  const palette = badgePalette(tone, brandAccent);
  return (
    <View style={[badgeStyles.base, { backgroundColor: palette.bg }]}>
      <View style={[badgeStyles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[badgeStyles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

function badgePalette(tone: BadgeTone, accent: string): { fg: string; bg: string } {
  switch (tone) {
    case "success":
      return { fg: pdfColors.success, bg: pdfColors.successSoft };
    case "warning":
      return { fg: pdfColors.warning, bg: pdfColors.warningSoft };
    case "danger":
      return { fg: pdfColors.danger, bg: pdfColors.dangerSoft };
    case "brand":
      // Soft tint of the freelancer's brand colour. Always readable.
      return { fg: accent, bg: pdfColors.surfaceSubtle };
    case "neutral":
    default:
      return { fg: pdfColors.mutedForeground, bg: pdfColors.surfaceSubtle };
  }
}

// =============================================================================
// SECTION + LABELS
// =============================================================================

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: pdfSpacing.sectionGap },
  eyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: pdfSpacing.sm,
  },
  title: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.lg,
    color: pdfColors.foreground,
    marginBottom: pdfSpacing.sm,
    letterSpacing: pdfTracking.tight,
  },
});

export function Section({
  eyebrow,
  title,
  children,
  style,
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  style?: ViewProps["style"];
}) {
  return (
    <View
      style={style ? [sectionStyles.wrap, style] : sectionStyles.wrap}
      wrap={true}
    >
      {eyebrow ? <Text style={sectionStyles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={sectionStyles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function EyebrowLabel({ children }: { children: React.ReactNode }) {
  return <Text style={sectionStyles.eyebrow}>{children}</Text>;
}

export function Divider({ style }: { style?: ViewProps["style"] }) {
  const base = {
    height: 0.5,
    backgroundColor: pdfColors.border,
    marginVertical: pdfSpacing.md,
  };
  return (
    <View style={style ? [base, style] : base} />
  );
}

// =============================================================================
// META GRID — key/value pairs in columns
// =============================================================================

const metaStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: pdfColors.surfaceMuted,
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderRadius: pdfRadii.md,
    padding: pdfSpacing.md,
    marginBottom: pdfSpacing.sectionGap,
  },
  cell: { flex: 1, paddingRight: pdfSpacing.md },
  cellLast: { flex: 1 },
  label: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 4,
  },
  value: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
    color: pdfColors.foreground,
  },
});

export interface MetaItem {
  label: string;
  value: string;
}

export function MetaGrid({ items }: { items: MetaItem[] }) {
  return (
    <View style={metaStyles.wrap}>
      {items.map((it, i) => (
        <View
          key={i}
          style={i === items.length - 1 ? metaStyles.cellLast : metaStyles.cell}
        >
          <Text style={metaStyles.label}>{it.label}</Text>
          <Text style={metaStyles.value}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// AMOUNT HERO — big "₹ XXX.XX" with eyebrow + sub-line.
// =============================================================================

const amountStyles = StyleSheet.create({
  wrap: {
    backgroundColor: pdfColors.foreground,
    borderRadius: pdfRadii.md,
    padding: pdfSpacing.lg,
    marginBottom: pdfSpacing.sectionGap,
  },
  eyebrow: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: "#CBD5E1",
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 6,
  },
  value: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes["2xl"],
    color: pdfColors.white,
    letterSpacing: pdfTracking.tight,
  },
  sub: {
    fontSize: pdfSizes.xs,
    color: "#94A3B8",
    marginTop: 4,
  },
});

export function AmountHero({
  eyebrow,
  amount,
  sub,
  variant = "dark",
  brandAccent,
}: {
  eyebrow: string;
  amount: string;
  sub?: string;
  variant?: "dark" | "accent";
  brandAccent: string;
}) {
  const bg = variant === "accent" ? brandAccent : pdfColors.foreground;
  return (
    <View style={[amountStyles.wrap, { backgroundColor: bg }]}>
      <Text style={amountStyles.eyebrow}>{eyebrow}</Text>
      <Text style={amountStyles.value}>{amount}</Text>
      {sub ? <Text style={amountStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

// =============================================================================
// PARTY CARD — "Billed to" / "From" blocks.
// =============================================================================

const partyStyles = StyleSheet.create({
  pair: {
    flexDirection: "row",
    marginBottom: pdfSpacing.sectionGap,
  },
  spacer: { width: pdfSpacing.md },
  card: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderRadius: pdfRadii.md,
    padding: pdfSpacing.md,
    minHeight: 96,
  },
  label: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 6,
  },
  name: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
    marginBottom: 4,
  },
  line: {
    fontSize: pdfSizes.sm,
    color: pdfColors.mutedForeground,
    marginTop: 2,
    lineHeight: pdfLineHeights.snug,
  },
});

export interface PartyCardData {
  label: string;
  name: string;
  /** Free-form lines (address, GSTIN, email, etc.). */
  lines: string[];
}

export function PartyPair({
  left,
  right,
}: {
  left: PartyCardData;
  right: PartyCardData;
}) {
  return (
    <View style={partyStyles.pair}>
      <PartyCard data={left} />
      <View style={partyStyles.spacer} />
      <PartyCard data={right} />
    </View>
  );
}

export function PartyCard({ data }: { data: PartyCardData }) {
  return (
    <View style={partyStyles.card}>
      <Text style={partyStyles.label}>{data.label}</Text>
      <Text style={partyStyles.name}>{data.name}</Text>
      {data.lines.map((line, i) => (
        <Text key={i} style={partyStyles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

// =============================================================================
// LINE ITEMS TABLE
// =============================================================================

const tableStyles = StyleSheet.create({
  wrap: {
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderRadius: pdfRadii.md,
    overflow: "hidden",
    marginBottom: pdfSpacing.sectionGap,
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: pdfSpacing.sm + 2,
    paddingHorizontal: pdfSpacing.md,
  },
  headerCell: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
  },
  row: {
    flexDirection: "row",
    paddingVertical: pdfSpacing.sm + 2,
    paddingHorizontal: pdfSpacing.md,
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
  },
  rowAlt: { backgroundColor: pdfColors.surfaceMuted },
  cellTxt: {
    fontSize: pdfSizes.sm,
    color: pdfColors.foreground,
    lineHeight: pdfLineHeights.snug,
  },
  cellMuted: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    marginTop: 2,
  },
});

export interface TableColumn<T> {
  key: string;
  header: string;
  /** Flex grow for the cell. */
  flex: number;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

export function LineItemsTable<T>({
  brand,
  columns,
  rows,
  zebra = true,
}: {
  brand: ResolvedBrand;
  columns: TableColumn<T>[];
  rows: T[];
  zebra?: boolean;
}) {
  return (
    <View style={tableStyles.wrap}>
      <View style={[tableStyles.headerRow, { backgroundColor: brand.accent }]}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              tableStyles.headerCell,
              {
                flex: col.flex,
                color: brand.onAccent,
                textAlign: col.align ?? "left",
              },
            ]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {rows.map((row, idx) => (
        <View
          key={idx}
          style={[tableStyles.row, zebra && idx % 2 === 1 ? tableStyles.rowAlt : null]}
          wrap={false}
        >
          {columns.map((col) => (
            <View
              key={col.key}
              style={{
                flex: col.flex,
                alignItems: col.align === "right" ? "flex-end" : "flex-start",
              }}
            >
              {col.render(row)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function TableCellText({
  children,
  muted,
  bold,
  align,
}: {
  children: React.ReactNode;
  muted?: boolean;
  bold?: boolean;
  align?: "left" | "right";
}) {
  return (
    <Text
      style={{
        fontSize: muted ? pdfSizes.xs : pdfSizes.sm,
        color: muted ? pdfColors.mutedForeground : pdfColors.foreground,
        fontFamily: bold ? pdfFonts.bold : pdfFonts.base,
        textAlign: align ?? "left",
      }}
    >
      {children}
    </Text>
  );
}

// =============================================================================
// TOTALS BLOCK
// =============================================================================

const totalsStyles = StyleSheet.create({
  wrap: {
    width: 240,
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderRadius: pdfRadii.md,
    padding: pdfSpacing.md,
    backgroundColor: pdfColors.surfaceMuted,
    alignSelf: "flex-end",
    marginBottom: pdfSpacing.sectionGap,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  label: {
    fontSize: pdfSizes.sm,
    color: pdfColors.mutedForeground,
  },
  value: {
    fontFamily: pdfFonts.semibold,
    fontSize: pdfSizes.sm,
    color: pdfColors.foreground,
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.borderStrong,
    marginTop: pdfSpacing.sm,
    paddingTop: pdfSpacing.sm,
  },
  grandLabel: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
  },
  grandValue: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.lg,
  },
});

export interface TotalsRowData {
  label: string;
  value: string;
}

export function TotalsBlock({
  rows,
  grand,
  brandAccent,
}: {
  rows: TotalsRowData[];
  grand: TotalsRowData;
  brandAccent: string;
}) {
  return (
    <View style={totalsStyles.wrap}>
      {rows.map((r, i) => (
        <View key={i} style={totalsStyles.row}>
          <Text style={totalsStyles.label}>{r.label}</Text>
          <Text style={totalsStyles.value}>{r.value}</Text>
        </View>
      ))}
      <View style={totalsStyles.grand}>
        <Text style={totalsStyles.grandLabel}>{grand.label}</Text>
        <Text style={[totalsStyles.grandValue, { color: brandAccent }]}>
          {grand.value}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// NOTE BLOCK — for notes/terms/footer paragraphs.
// =============================================================================

const noteStyles = StyleSheet.create({
  wrap: {
    borderLeftWidth: 2,
    paddingLeft: pdfSpacing.md,
    paddingVertical: pdfSpacing.xs,
    marginBottom: pdfSpacing.md,
  },
  label: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 4,
  },
  body: {
    fontSize: pdfSizes.sm,
    color: pdfColors.text,
    lineHeight: pdfLineHeights.relaxed,
  },
});

export function NoteBlock({
  label,
  children,
  accent,
}: {
  label?: string;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <View style={[noteStyles.wrap, { borderLeftColor: accent }]}>
      {label ? <Text style={noteStyles.label}>{label}</Text> : null}
      <Text style={noteStyles.body}>{children}</Text>
    </View>
  );
}

// =============================================================================
// SIGNATURE BLOCK
// =============================================================================

const signatureStyles = StyleSheet.create({
  wrap: { marginTop: pdfSpacing.lg },
  label: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 6,
  },
  area: {
    height: 56,
    justifyContent: "flex-end",
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.borderStrong,
    marginBottom: pdfSpacing.sm,
  },
  image: { maxHeight: 48, objectFit: "contain" },
  scriptText: { fontSize: 22 },
  name: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
    color: pdfColors.foreground,
  },
  meta: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    marginTop: 2,
  },
});

export interface SignatureData {
  type: "draw" | "type" | "upload";
  imageUrl: string | null;
  textValue: string | null;
  fontFamily: string | null;
  legalName: string | null;
  signedAt: string | null;
  signedIp?: string | null;
}

export function SignatureBlock({
  label,
  signature,
  fallbackName,
  width = 240,
}: {
  label: string;
  signature: SignatureData | null;
  fallbackName: string;
  width?: number;
}) {
  return (
    <View style={[signatureStyles.wrap, { width }]} wrap={false}>
      <Text style={signatureStyles.label}>{label}</Text>
      <View style={signatureStyles.area}>
        {signature?.type === "type" && signature.textValue ? (
          <Text style={signatureStyles.scriptText}>{signature.textValue}</Text>
        ) : signature?.imageUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={signature.imageUrl} style={signatureStyles.image} />
        ) : null}
      </View>
      <Text style={signatureStyles.name}>
        {signature?.legalName ?? fallbackName}
      </Text>
      {signature?.signedAt ? (
        <Text style={signatureStyles.meta}>
          Signed {formatDate(signature.signedAt)}
          {signature.signedIp ? ` · IP ${signature.signedIp}` : ""}
        </Text>
      ) : null}
    </View>
  );
}

// =============================================================================
// Utility: shared date formatter for templates.
// =============================================================================

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function formatCurrency(value: number, currency: string): string {
  if (!Number.isFinite(value)) return `${currency} 0`;
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${amount}`;
}
