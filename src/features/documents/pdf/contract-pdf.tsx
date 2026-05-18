import "server-only";

/**
 * Contract / Proposal PDF.
 *
 * Same shape covers both — the only difference is the eyebrow label and
 * whether a signature pair renders at the end.
 *
 * Design intent: legally serious, not generic. Wide line height, clear
 * section numbering, real signature blocks with date + IP capture for
 * countersigned contracts.
 *
 * Layout:
 *   1. Branded header (logo, eyebrow "CONTRACT" / "PROPOSAL", title).
 *   2. Meta grid — Issued / Expires / Value.
 *   3. Party pair — "Between" (seller) / "And" (client).
 *   4. Body: parsed sections rendered with section numbers and snug
 *      typography. Falls back to a paragraph dump when content lacks
 *      structure.
 *   5. (Contracts only) Signature pair — countersigned + counterparty.
 *      Each block keeps `wrap={false}` so it never splits across pages.
 *   6. Fixed branded footer.
 */

import * as React from "react";
import { Document, StyleSheet, Text, View } from "@react-pdf/renderer";
import { parseContractContent } from "@/features/contracts/content";
import {
  hasSignatureReference,
  type ContractSignatureReference,
} from "@/features/contracts/signatures";
import {
  pdfColors,
  pdfFonts,
  pdfSizes,
  pdfSpacing,
  pdfTracking,
  pdfLineHeights,
} from "./theme";
import { resolveBrand, type ResolvedBrand } from "./brand";
import {
  Badge,
  DocumentFooter,
  DocumentHeader,
  DocumentPage,
  MetaGrid,
  PartyPair,
  SignatureBlock,
  formatCurrency,
  formatDate,
  type SignatureData,
} from "./primitives";
import type { UserProfileRow } from "@/lib/supabase/types";

// --- Data shape (preserved) -------------------------------------------------

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
  clientSignature:
    | (ContractSignatureReference & {
        legalName: string | null;
        signedAt: string | null;
        signerEmail: string | null;
        signedIp: string | null;
      })
    | null;
  publicUrl: string | null;
  brandColor: string | null;
  seller: {
    businessName: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    addressLines: string[];
    logoDataUrl: string | null;
    signature:
      | (ContractSignatureReference & {
          legalName: string | null;
          signedAt: string | null;
        })
      | null;
  };
  client: ContractPdfParty;
}

// --- Body typography --------------------------------------------------------

const bodyStyles = StyleSheet.create({
  section: { marginBottom: pdfSpacing.lg },
  numberRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  number: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    letterSpacing: pdfTracking.wider,
    marginRight: 8,
    minWidth: 22,
  },
  heading: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
    letterSpacing: pdfTracking.tight,
  },
  paragraph: {
    fontSize: pdfSizes.sm,
    color: pdfColors.text,
    lineHeight: pdfLineHeights.relaxed,
    marginTop: 6,
  },
  signaturePair: {
    flexDirection: "row",
    marginTop: pdfSpacing["3xl"],
    justifyContent: "space-between",
  },
  signatureSpacer: { width: pdfSpacing.lg },
  signatureSlot: { flex: 1 },
});

// --- Template ---------------------------------------------------------------

export function ContractPdf({
  data,
  seller,
  logoDataUrl,
}: {
  data: ContractPdfData;
  seller?: UserProfileRow | null;
  logoDataUrl?: string | null;
}) {
  const brand = buildBrandFromData(data, seller, logoDataUrl);
  const isContract = data.kind === "contract";
  const eyebrow = isContract ? "CONTRACT" : "PROPOSAL";
  const parsedContent = parseContractContent(data.content);

  const decorationTone =
    data.status === "signed"
      ? "success"
      : data.status === "declined"
        ? "danger"
        : data.status === "expired"
          ? "warning"
          : "brand";

  return (
    <Document title={`${eyebrow} – ${data.title}`} author={brand.businessName}>
      <DocumentPage brand={brand}>
        <DocumentHeader
          brand={brand}
          eyebrow={eyebrow}
          title={data.title}
          subtitle={data.status === "signed" ? "Signed copy" : undefined}
          decoration={
            <Badge
              tone={decorationTone}
              brandAccent={brand.accent}
              label={data.status.replace(/_/g, " ")}
            />
          }
        />

        <MetaGrid
          items={[
            { label: "Issued", value: formatDate(data.issuedAt) },
            {
              label: "Expires",
              value: data.expiresAt ? formatDate(data.expiresAt) : "Open",
            },
            {
              label: "Value",
              value:
                data.valueAmount !== null
                  ? formatCurrency(data.valueAmount, data.currency)
                  : "To be agreed",
            },
          ]}
        />

        <PartyPair
          left={{
            label: "Between",
            name: brand.businessName,
            lines: [
              ...(brand.legalName ? [brand.legalName] : []),
              ...brand.addressLines.slice(0, 4),
              ...(brand.contact.email ? [brand.contact.email] : []),
              ...(brand.contact.phone ? [brand.contact.phone] : []),
            ],
          }}
          right={{
            label: "And",
            name: data.client.name,
            lines: data.client.detailLines.slice(0, 6),
          }}
        />

        {/* Body — sectioned with leading numbers when structured, paragraphs otherwise. */}
        <View>
          {parsedContent.sections.length > 0 ? (
            parsedContent.sections.map((section, i) => (
              <View key={i} style={bodyStyles.section} wrap={true}>
                <View style={bodyStyles.numberRow}>
                  <Text style={bodyStyles.number}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <Text style={bodyStyles.heading}>{section.heading}</Text>
                </View>
                <Text style={bodyStyles.paragraph}>{section.body}</Text>
              </View>
            ))
          ) : (
            parsedContent.paragraphs.map((p, i) => (
              <Text key={i} style={bodyStyles.paragraph}>
                {p}
              </Text>
            ))
          )}
        </View>

        {isContract ? (
          <View style={bodyStyles.signaturePair} wrap={false}>
            <View style={bodyStyles.signatureSlot}>
              <SignatureBlock
                label={`Signed for ${brand.businessName}`}
                signature={
                  data.seller.signature
                    ? coerceSignature(
                        data.seller.signature,
                        data.seller.signature.signedAt ?? data.issuedAt,
                      )
                    : null
                }
                fallbackName={
                  data.seller.signature?.legalName ??
                  data.seller.legalName ??
                  brand.businessName
                }
                width={240}
              />
            </View>
            <View style={bodyStyles.signatureSpacer} />
            <View style={bodyStyles.signatureSlot}>
              <SignatureBlock
                label={`Signed for ${data.client.name}`}
                signature={
                  hasSignatureReference(data.clientSignature)
                    ? coerceSignature(
                        data.clientSignature!,
                        data.clientSignature!.signedAt ?? data.signedAt,
                        data.clientSignature?.signedIp ?? null,
                      )
                    : null
                }
                fallbackName={
                  data.clientSignature?.legalName ??
                  data.signerName ??
                  data.client.name
                }
                width={240}
              />
            </View>
          </View>
        ) : null}

        <DocumentFooter
          brand={brand}
          label={`${eyebrow.charAt(0)}${eyebrow.slice(1).toLowerCase()} · ${data.title}`}
        />
      </DocumentPage>
    </Document>
  );
}

// --- Helpers ----------------------------------------------------------------

function coerceSignature(
  ref: ContractSignatureReference,
  signedAt: string | null,
  signedIp: string | null = null,
): SignatureData {
  return {
    type: ref.type,
    imageUrl: ref.imageUrl ?? null,
    textValue: ref.textValue ?? null,
    fontFamily: ref.fontFamily ?? null,
    legalName: (ref as { legalName?: string | null }).legalName ?? null,
    signedAt,
    signedIp,
  };
}

function buildBrandFromData(
  data: ContractPdfData,
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
    website: null,
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
