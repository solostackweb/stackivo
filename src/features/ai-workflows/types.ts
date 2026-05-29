import { z } from "zod";

export const aiInvoiceRequestSchema = z.object({
  clientId: z.string().min(1, "Choose a client"),
  projectId: z.string().optional().or(z.literal("")),
  workDescription: z
    .string()
    .min(8, "Describe the work in a little more detail")
    .max(1500, "Description is too long"),
  amount: z.coerce.number().nonnegative().optional(),
  quantity: z.coerce.number().positive().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(700, "Notes are too long").optional().or(z.literal("")),
});

export const aiInvoiceLineSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.coerce.number().positive().max(100000),
  rate: z.coerce.number().nonnegative(),
});

export const aiInvoiceDraftSchema = z.object({
  items: z.array(aiInvoiceLineSchema).min(1).max(8),
  notes: z.string().max(1000).optional().or(z.literal("")),
  terms: z.string().max(1000).optional().or(z.literal("")),
});

export type AiInvoiceRequest = z.infer<typeof aiInvoiceRequestSchema>;
export type AiInvoiceDraft = z.infer<typeof aiInvoiceDraftSchema>;

export const aiClientDraftSchema = z.object({
  fullName: z.string().min(1).max(160),
  businessName: z.string().max(160).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  billingAddress: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export const aiProjectDraftSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export const aiPortalDraftSchema = z.object({
  name: z.string().min(1).max(120),
  clientId: z.string().optional().or(z.literal("")),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const aiTimeEntryDraftSchema = z.object({
  description: z.string().min(1).max(300),
  projectId: z.string().optional().or(z.literal("")),
  date: z.string(),
  hours: z.coerce.number().min(0).max(24),
  minutes: z.coerce.number().min(0).max(59),
  billable: z.boolean(),
  hourlyRate: z.coerce.number().nonnegative(),
});

export const aiContractDraftSchema = z.object({
  title: z.string().min(1).max(200),
  kind: z.enum(["contract", "proposal"]),
  clientId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  valueAmount: z.coerce.number().nonnegative().optional(),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(160),
        body: z.string().min(1).max(6000),
      }),
    )
    .min(1)
    .max(12),
});

export const aiWelcomeDraftSchema = z.object({
  title: z.string().min(1).max(200),
  intro: z.string().max(5000).optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  acknowledgementRequired: z.boolean(),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(200),
        body: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(12),
});

export type AiClientDraft = z.infer<typeof aiClientDraftSchema>;
export type AiProjectDraft = z.infer<typeof aiProjectDraftSchema>;
export type AiPortalDraft = z.infer<typeof aiPortalDraftSchema>;
export type AiTimeEntryDraft = z.infer<typeof aiTimeEntryDraftSchema>;
export type AiContractDraft = z.infer<typeof aiContractDraftSchema>;
export type AiWelcomeDraft = z.infer<typeof aiWelcomeDraftSchema>;

export type AiWorkflowResult<T> =
  | { ok: true; data: T; provider: "groq" | "local" }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
