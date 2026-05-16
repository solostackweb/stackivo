import { z } from "zod";

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => !v || /^[0-9a-fA-F-]{36}$/.test(v), "Invalid id");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined));

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

/**
 * Manual time entry — user enters duration directly. Used for
 * after-the-fact time logging when they forgot to start the timer.
 */
export const manualTimeEntrySchema = z.object({
  description: optionalText(500),
  projectId: optionalUuid,
  clientId: optionalUuid,
  startedAt: isoDate,
  durationSeconds: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 second")
    .max(60 * 60 * 24 * 31, "Max 31 days per entry"),
  billable: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((v) => v === true || v === "true")
    .default(true),
  hourlyRate: z.coerce.number().min(0).default(0),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) =>
      Array.isArray(v)
        ? v
        : typeof v === "string" && v.length > 0
          ? v.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
    ),
});

export type ManualTimeEntryInput = z.infer<typeof manualTimeEntrySchema>;

export const startTimerSchema = z.object({
  description: optionalText(500),
  projectId: optionalUuid,
  clientId: optionalUuid,
  hourlyRate: z.coerce.number().min(0).default(0),
  billable: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((v) => v === true || v === "true")
    .default(true),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;

export const timeEntryIdSchema = z.string().uuid("Invalid time entry id");
