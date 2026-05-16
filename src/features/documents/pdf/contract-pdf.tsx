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
import { parseContractContent } from "@/features/contracts/content";
import {
  hasSignatureReference,
  type ContractSignatureReference,
} from "@/features/contracts/signatures";
import { pdfColors, pdfFonts, pdfSizes, pdfSpacing } from "./theme";

export interface ContractPdfParty {
  name: string;
  detailLines: string[];
}

export interface ContractPdfData {
  kind: "contract" | "proposal";
  title: string;
  content: string;
  status: string;
  currency: string;
  valueAmount: number | null;
  issuedAt: string;
  expiresAt: string | null;
  signedAt: string | null;
  signerName: string | null;
  signerEmail: string | null;
  clientSignature: (ContractSignatureReference & {
    legalName: string | null;
    signedAt: string | null;
    signerEmail: string | null;
    signedIp: string | null;
  }) | null;
  publicUrl: string | null;
  brandColor: string | null;
  seller: {
    businessName: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    addressLines: string[];
    logoDataUrl: string | null;
    signature: (ContractSignatureReference & {
      legalName: string | null;
      signedAt: string | null;
    }) | null;
  };
  client: ContractPdfParty;
}

const s = StyleSheet.create({
  page: {
    fontFamily: pdfFonts.base,
    fontSize: pdfSizes.base,
    color: pdfColors.foreground,
    padding: pdfSpacing.page,
    lineHeight: 1.55,
  },
  topRule: { height: 4, marginBottom: 18, borderRadius: 999 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  brandBlock: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  logo: { width: 42, height: 42, objectFit: "contain" },
  brandName: { fontFamily: pdfFonts.bold, fontSize: pdfSizes.lg },
  brandMeta: { color: pdfColors.mutedForeground, fontSize: pdfSizes.xs },
  kindPill: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: pdfColors.primary,
  },
  title: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.h1,
    lineHeight: 1.25,
    marginTop: 2,
    textAlign: "right",
  },
  metaStrip: {
    flexDirection: "row",
    borderTop: `1px solid ${pdfColors.border}`,
    borderBottom: `1px solid ${pdfColors.border}`,
    paddingVertical: 10,
    marginTop: pdfSpacing.sectionGap,
    marginBottom: pdfSpacing.sectionGap,
  },
  metaCell: { flex: 1, paddingRight: 10 },
  metaLabel: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metaValue: { fontFamily: pdfFonts.bold, fontSize: pdfSizes.md },
  parties: {
    flexDirection: "row",
    gap: 16,
    marginBottom: pdfSpacing.sectionGap,
  },
  partyBlock: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    backgroundColor: pdfColors.subtle,
    border: `1px solid ${pdfColors.border}`,
  },
  partyHeading: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  partyName: { fontFamily: pdfFonts.bold, fontSize: pdfSizes.md, marginBottom: 2 },
  partyMuted: { fontSize: pdfSizes.xs, color: pdfColors.mutedForeground },
  body: { fontSize: pdfSizes.sm, lineHeight: 1.7 },
  paragraph: { marginBottom: 10 },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.sm,
    marginBottom: 4,
  },
  sectionNumber: { color: pdfColors.mutedForeground, fontSize: pdfSizes.xs },
  signature: { marginTop: 30, flexDirection: "row", gap: 18 },
  signatureBlock: {
    flex: 1,
    minHeight: 104,
    border: `1px solid ${pdfColors.border}`,
    borderRadius: 6,
    padding: 10,
  },
  signatureLine: {
    height: 36,
    justifyContent: "flex-end",
    borderBottom: `1px solid ${pdfColors.border}`,
    marginVertical: 8,
  },
  signatureImage: { maxHeight: 34, objectFit: "contain" },
  signatureText: { fontSize: 22, lineHeight: 1.1 },
  signatureLabel: {
    fontSize: pdfSizes.xs,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  signatureName: { fontFamily: pdfFonts.bold, fontSize: pdfSizes.sm, marginTop: 2 },
  signedStamp: { marginTop: 4, fontSize: pdfSizes.xs, color: pdfColors.success },
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

export function ContractPdf({ data }: { data: ContractPdfData }) {
  const label = data.kind === "proposal" ? "Proposal" : "Contract";
  const accent = data.brandColor ?? pdfColors.primary;
  const parsedContent = parseContractContent(data.content);

  return (
    <Document title={`${label} - ${data.title}`} author={data.seller.businessName}>
      <Page size="A4" style={s.page}>
        <View style={[s.topRule, { backgroundColor: accent }]} />
        <View style={s.header}>
          <View style={s.brandBlock}>
            {data.seller.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.seller.logoDataUrl} style={s.logo} />
            )}
            <View>
              <Text style={s.brandName}>{data.seller.businessName}</Text>
              {data.seller.legalName &&
                data.seller.legalName !== data.seller.businessName && (
                  <Text style={s.brandMeta}>{data.seller.legalName}</Text>
                )}
              {data.seller.addressLines.map((line, i) => (
                <Text key={i} style={s.brandMeta}>
                  {line}
                </Text>
              ))}
              {data.seller.email && <Text style={s.brandMeta}>{data.seller.email}</Text>}
            </View>
          </View>
          <View>
            <Text style={[s.kindPill, { color: accent }]}>{label}</Text>
            <Text style={s.title}>{data.title}</Text>
          </View>
        </View>

        <View style={s.metaStrip}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Issued</Text>
            <Text style={s.metaValue}>{formatDate(data.issuedAt)}</Text>
          </View>
          {data.expiresAt && (
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Expires</Text>
              <Text style={s.metaValue}>{formatDate(data.expiresAt)}</Text>
            </View>
          )}
          {data.valueAmount !== null && (
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Value</Text>
              <Text style={s.metaValue}>
                {formatCurrency(data.valueAmount, data.currency)}
              </Text>
            </View>
          )}
        </View>

        <View style={s.parties}>
          <View style={s.partyBlock}>
            <Text style={s.partyHeading}>Between</Text>
            <Text style={s.partyName}>{data.seller.businessName}</Text>
            {data.seller.legalName && (
              <Text style={s.partyMuted}>{data.seller.legalName}</Text>
            )}
            {data.seller.addressLines.map((line, i) => (
              <Text key={i} style={s.partyMuted}>
                {line}
              </Text>
            ))}
          </View>
          <View style={s.partyBlock}>
            <Text style={s.partyHeading}>And</Text>
            <Text style={s.partyName}>{data.client.name}</Text>
            {data.client.detailLines.map((line, i) => (
              <Text key={i} style={s.partyMuted}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.body}>
          {parsedContent.sections.length > 0
            ? parsedContent.sections.map((section, i) => (
                <View key={i} style={s.section}>
                  <Text style={s.sectionTitle}>
                    <Text style={s.sectionNumber}>
                      {String(i + 1).padStart(2, "0")}{" "}
                    </Text>
                    {section.heading}
                  </Text>
                  <Text style={s.paragraph}>{section.body}</Text>
                </View>
              ))
            : parsedContent.paragraphs.map((p, i) => (
                <Text key={i} style={s.paragraph}>
                  {p}
                </Text>
              ))}
        </View>

        {data.kind === "contract" && (
          <View style={s.signature} wrap={false}>
            <PdfSignatureBlock
              label={`For ${data.seller.businessName}`}
              name={
                data.seller.signature?.legalName ??
                data.seller.legalName ??
                data.seller.businessName
              }
              email={data.seller.email}
              signedAt={data.seller.signature?.signedAt ?? data.issuedAt}
              signature={data.seller.signature}
            />
            <PdfSignatureBlock
              label={`For ${data.client.name}`}
              name={
                data.clientSignature?.legalName ??
                data.signerName ??
                data.client.name
              }
              email={data.clientSignature?.signerEmail ?? data.signerEmail}
              signedAt={data.clientSignature?.signedAt ?? data.signedAt}
              signature={data.clientSignature}
              pendingLabel="Awaiting client signature"
            />
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>
            {label} - {data.status}
          </Text>
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

function PdfSignatureBlock({
  label,
  name,
  email,
  signedAt,
  signature,
  pendingLabel = "Signature on file",
}: {
  label: string;
  name: string;
  email?: string | null;
  signedAt?: string | null;
  signature: ContractSignatureReference | null | undefined;
  pendingLabel?: string;
}) {
  const hasSignature = hasSignatureReference(signature);

  return (
    <View style={s.signatureBlock}>
      <Text style={s.signatureLabel}>{label}</Text>
      <View style={s.signatureLine}>
        {signature?.type === "type" && signature.textValue ? (
          <Text style={[s.signatureText, { fontFamily: pdfFonts.base }]}>
            {signature.textValue}
          </Text>
        ) : signature?.imageUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={signature.imageUrl} style={s.signatureImage} />
        ) : (
          <Text style={s.partyMuted}>{pendingLabel}</Text>
        )}
      </View>
      <Text style={s.signatureName}>{name}</Text>
      {signedAt && hasSignature ? (
        <Text style={s.signedStamp}>
          Signed on {formatDate(signedAt)}
          {email ? ` - ${email}` : ""}
        </Text>
      ) : (
        <Text style={s.partyMuted}>{hasSignature ? "Signed" : pendingLabel}</Text>
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${amount}`;
}
