/**
 * Zod schemas for each onboarding step + the business-profile settings page.
 *
 * Schemas are defensive about empty strings (HTML inputs submit "") and
 * normalise GSTIN / PAN to uppercase. Field-level required-when-GST rules
 * live here so they apply to BOTH client-side form validation and
 * server-side action validation.
 */

import { z } from "zod";
import { isValidGstin, isValidPan } from "@/features/gst/validation";
import { isValidStateCode } from "@/features/gst/state-codes";

// --- Helpers ----------------------------------------------------------------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined));

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isValidGstin, "Enter a valid 15-character GSTIN");

const stateCodeSchema = z
  .string()
  .trim()
  .refine(isValidStateCode, "Pick a valid Indian state");

// --- Step 1: Business identity ---------------------------------------------

export const businessStepSchema = z.object({
  legalName: requiredText("Legal name", 120),
  businessName: optionalText(120),
  businessType: z.enum([
    "individual",
    "sole_proprietor",
    "partnership",
    "llp",
    "private_limited",
    "other",
  ]),
  addressLine1: requiredText("Address", 200),
  addressLine2: optionalText(200),
  city: requiredText("City", 100),
  stateCode: stateCodeSchema,
  postalCode: optionalText(20),
  country: z.string().trim().min(2).max(2).default("IN"),
});

export type BusinessStepInput = z.infer<typeof businessStepSchema>;

// --- Step 2: GST registration ----------------------------------------------

/**
 * Discriminated by `gstRegistered`. When `false`, GSTIN / PAN are skipped
 * entirely (per GST doc § 4 — "If freelancer selects NO, skip GSTIN").
 */
export const gstStepSchema = z.discriminatedUnion("gstRegistered", [
  z.object({
    gstRegistered: z.literal(false),
    gstin: z.literal("").optional(),
    pan: optionalText(10).pipe(
      z
        .string()
        .optional()
        .refine(
          (v) => !v || isValidPan(v),
          "Enter a valid 10-character PAN",
        ),
    ),
  }),
  z.object({
    gstRegistered: z.literal(true),
    gstin: gstinSchema,
    pan: optionalText(10).pipe(
      z
        .string()
        .optional()
        .refine(
          (v) => !v || isValidPan(v),
          "Enter a valid 10-character PAN",
        ),
    ),
  }),
]);

export type GstStepInput = z.infer<typeof gstStepSchema>;

// --- Step 3: Invoice preferences -------------------------------------------

export const invoiceStepSchema = z.object({
  defaultCurrency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  timezone: z.string().trim().min(1).max(64).default("Asia/Kolkata"),
  invoicePrefix: z
    .string()
    .trim()
    .max(10, "Prefix is too long")
    .default("INV-"),
  invoiceNextNumber: z.coerce
    .number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .default(1),
  invoiceDefaultDueDays: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(365, "Cap of 365 days")
    .default(14),
  invoiceDefaultNotes: optionalText(500),
  invoiceDefaultTerms: optionalText(2000),
});

export type InvoiceStepInput = z.infer<typeof invoiceStepSchema>;

// --- Step 4: First client ---------------------------------------------------

/**
 * Slim version of the client schema used during onboarding. The full client
 * CRUD schema lives in `src/features/clients/schemas.ts`.
 *
 * Same discriminated-union pattern as the GST step.
 */
export const firstClientStepSchema = z.discriminatedUnion("gstRegistered", [
  z.object({
    gstRegistered: z.literal(false),
    fullName: requiredText("Client name", 120),
    businessName: optionalText(120),
    email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    phone: optionalText(20),
    stateCode: stateCodeSchema,
    billingAddress: optionalText(300),
    notes: optionalText(500),
    gstin: z.literal("").optional(),
  }),
  z.object({
    gstRegistered: z.literal(true),
    fullName: requiredText("Client name", 120),
    businessName: optionalText(120),
    email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    phone: optionalText(20),
    stateCode: stateCodeSchema,
    billingAddress: requiredText("Billing address", 300),
    notes: optionalText(500),
    gstin: gstinSchema,
  }),
]);

export type FirstClientStepInput = z.infer<typeof firstClientStepSchema>;

// --- Settings (combined business + GST) ------------------------------------

/**
 * Used by the settings → Profile / Company pages. Accepts every business
 * + GST + locale field at once.
 */
export const businessProfileSettingsSchema = businessStepSchema
  .merge(invoiceStepSchema)
  .extend({
    fullName: requiredText("Your name", 120),
  })
  .and(gstStepSchema);

export type BusinessProfileSettingsInput = z.infer<
  typeof businessProfileSettingsSchema
>;

// Compatibility alias used by onboarding signature step/server actions.
// Keeping this export here prevents runtime import mismatches in the dev server.
export const signatureSchema = z.object({
  signatureType: z.enum(["draw", "type", "upload"]),
  signatureImageUrl: optionalText(200000),
  signatureTextValue: optionalText(120),
  signatureFontFamily: optionalText(80),
});

export type SignatureInput = z.infer<typeof signatureSchema>;
