"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { InvoiceTotalsBreakdown } from "./invoice-totals";
import { PAYMENT_METHOD_LABEL } from "../../schema";
import { computeItemAmount } from "../../schema";
import { useProfile } from "@/features/profile/context";
import { hasFreelancerSignature } from "@/features/profile/signature";
import type {
  InvoiceFormValues,
  InvoiceTotals,
  PaymentMethod,
} from "../../schema";

interface InvoicePreviewProps {
  values: InvoiceFormValues;
  totals: InvoiceTotals;
  clientName?: string;
  clientCompany?: string;
  clientEmail?: string;
}

/**
 * Professional paper-like invoice preview. Intentionally styled to mimic a
 * real document (serif-ish hierarchy, generous whitespace, no borders on the
 * "page" itself) so the user sees approximately what the recipient will see.
 */
export function InvoicePreview({
  values,
  totals,
  clientName,
  clientCompany,
  clientEmail,
}: InvoicePreviewProps) {
  const { profile } = useProfile();
  const issueDate = values.issueDate
    ? new Date(values.issueDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const dueDate = values.dueDate
    ? new Date(values.dueDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const businessName =
    profile?.businessName ?? profile?.legalName ?? profile?.fullName ?? "Your studio";
  const tagline = profile?.brandTagline ?? "Freelance operations";
  const accent = profile?.brandColor ?? "#0F172A";
  const signatureReady = hasFreelancerSignature(profile);
  const fromLines = [
    profile?.addressLine1,
    profile?.addressLine2,
    profile?.city,
    profile?.postalCode ? `${profile.postalCode}` : null,
  ].filter((v): v is string => Boolean(v && v.trim()));

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-xl shadow-black/5 ring-1 ring-black/5 dark:bg-white dark:text-slate-900">
      <div className="relative p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {profile?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt={businessName}
                className="h-10 w-10 rounded object-contain"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded text-sm font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {businessName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{businessName}</p>
              <p className="text-[11px] text-slate-500">{tagline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-tight">
              {values.invoiceNumber || "INV-—"}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Tax invoice
            </p>
          </div>
        </div>

        {/* From / Bill to / Dates */}
        <div className="mb-8 grid grid-cols-3 gap-6 text-[11px]">
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
              From
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {businessName}
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {fromLines.length > 0 ? (
                <>
                  {fromLines.map((line) => (
                    <React.Fragment key={line}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </>
              ) : (
                "—"
              )}
              {profile?.gstRegistered && profile?.gstin ? (
                <>GSTIN {profile.gstin}</>
              ) : (
                <>GST not registered</>
              )}
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
              Bill to
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {clientName || "—"}
            </p>
            {clientCompany && (
              <p className="text-[11px] text-slate-500">{clientCompany}</p>
            )}
            {clientEmail && (
              <p className="text-[11px] text-slate-500">{clientEmail}</p>
            )}
          </div>
          <div className="text-right">
            <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
              Dates
            </p>
            <p className="text-[11px] text-slate-500">
              Issued <span className="text-slate-900">{issueDate}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Due <span className="text-slate-900">{dueDate}</span>
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="mb-8">
          <div className="grid grid-cols-12 border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {values.items && values.items.length > 0 ? (
            values.items.map((item, i) => (
              <div
                key={item.id ?? i}
                className="grid grid-cols-12 border-b border-slate-100 py-3 text-sm last:border-b-0"
              >
                <div className="col-span-6 text-slate-900">
                  {item.description || (
                    <span className="text-slate-400">Untitled item</span>
                  )}
                </div>
                <div className="col-span-2 text-right tabular-nums text-slate-600">
                  {item.quantity || 0}
                </div>
                <div className="col-span-2 text-right tabular-nums text-slate-600">
                  {formatINR(Number(item.rate) || 0)}
                </div>
                <div className="col-span-2 text-right font-medium tabular-nums text-slate-900">
                  {formatINR(
                    computeItemAmount({
                      quantity: item.quantity,
                      rate: item.rate,
                    }),
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-sm text-slate-400">
              No items added yet
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mb-8 flex justify-end">
          <div className="w-64">
            <InvoiceTotalsBreakdown
              totals={totals}
              gstRate={values.gstRate}
              taxMode={values.taxMode}
              variant="document"
              className={cn("[&_*]:text-slate-700")}
            />
          </div>
        </div>

        {/* Payment method */}
        <div className="mb-6 rounded-md bg-slate-50 p-4 text-[11px]">
          <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
            Payment method
          </p>
          <p className="text-sm font-medium text-slate-900">
            {PAYMENT_METHOD_LABEL[values.paymentMethod as PaymentMethod]}
          </p>
          {values.paymentMethod === "bank" && (
            <p className="text-[11px] text-slate-500">
              Payment instructions will appear from your invoice settings.
            </p>
          )}
        </div>

        {/* Freelancer signature */}
        <div className="mb-6 grid grid-cols-2 gap-6 border-t border-slate-200 pt-6 text-[11px]">
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
              Freelancer Signature
            </p>
            <div className="flex min-h-16 items-end border-b border-slate-200 pb-2">
              {signatureReady && profile?.signatureType === "type" && profile.signatureTextValue ? (
                <span
                  className="text-3xl italic text-slate-900"
                  style={{
                    fontFamily:
                      profile.signatureFontFamily === "great-vibes"
                        ? '"Great Vibes", cursive'
                        : profile.signatureFontFamily === "pacifico"
                          ? '"Pacifico", cursive'
                          : profile.signatureFontFamily === "satisfy"
                            ? '"Satisfy", cursive'
                            : '"Dancing Script", cursive',
                  }}
                >
                  {profile.signatureTextValue}
                </span>
              ) : signatureReady && profile?.signatureImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.signatureImageUrl}
                  alt="Freelancer signature"
                  className="max-h-14 object-contain"
                />
              ) : (
                <span className="text-slate-400">Awaiting signature</span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{businessName}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
              Authorized Signature
            </p>
            <div className="flex min-h-16 items-end border-b border-slate-200 pb-2">
              {signatureReady ? (
                <span className="text-sm italic text-slate-500">
                  Digitally configured
                </span>
              ) : (
                <span className="text-slate-400">Awaiting signature</span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Signature used on outgoing invoices.
            </p>
          </div>
        </div>

        {/* Notes + terms */}
        {(values.notes || values.terms) && (
          <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-6 text-[11px]">
            {values.notes && (
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
                  Notes
                </p>
                <p className="whitespace-pre-line leading-relaxed text-slate-600">
                  {values.notes}
                </p>
              </div>
            )}
            {values.terms && (
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
                  Terms
                </p>
                <p className="whitespace-pre-line leading-relaxed text-slate-600">
                  {values.terms}
                </p>
              </div>
            )}
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
          style={{ backgroundColor: accent }}
        />
      </div>
    </div>
  );
}
