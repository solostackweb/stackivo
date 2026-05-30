"use server";

import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { getServerSupabase } from "@/lib/supabase/server";
import { getProfile } from "@/features/profile/server";
import { nextInvoiceNumber } from "@/features/invoices/server";
import { createInvoiceAction } from "@/features/invoices/actions";
import { createClientAction } from "@/features/clients/actions";
import { createProjectAction } from "@/features/projects/actions";
import { generateInvoiceDraftAction, generateOperationalDraftAction } from "./actions";
import { generateStructuredJson } from "./groq";
import type { AiClientDraft, AiProjectDraft } from "./types";

const aiClientCreateSchema = z.object({
  prompt: z.string().trim().min(4).max(6000),
});

const aiProjectCreateSchema = z.object({
  prompt: z.string().trim().min(4).max(6000),
  clientId: z.string().optional().or(z.literal("")),
});

const aiInvoiceCreateSchema = z.object({
  prompt: z.string().trim().min(4).max(6000),
  clientId: z.string().min(1, "Choose a client"),
  projectId: z.string().optional().or(z.literal("")),
});

const aiDocsQuestionSchema = z.object({
  question: z.string().trim().min(4).max(3000),
});

async function requireUserId() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);
  return user.id;
}

function amountFromPrompt(prompt: string) {
  const normalized = prompt.replace(/,/g, "");
  const match =
    normalized.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/i) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|inr)/i) ??
    normalized.match(/\b(\d{4,}(?:\.\d+)?)\b/);
  return match ? Number(match[1]) : 0;
}

function dueDateFromPrompt(prompt: string, fallbackDays: number) {
  const date = new Date();
  const lower = prompt.toLowerCase();
  const daysMatch = lower.match(/\b(\d{1,3})\s*days?\b/);
  if (daysMatch) {
    date.setDate(date.getDate() + Number(daysMatch[1]));
    return date.toISOString().slice(0, 10);
  }
  if (lower.includes("next week")) {
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  }
  if (lower.includes("month end") || lower.includes("end of month")) {
    date.setMonth(date.getMonth() + 1, 0);
    return date.toISOString().slice(0, 10);
  }
  date.setDate(date.getDate() + fallbackDays);
  return date.toISOString().slice(0, 10);
}

function cleanPromptTitle(prompt: string, fallback: string) {
  return (
    prompt
      .split(/[.\n]/)
      .map((part) => part.trim())
      .find(Boolean) ?? fallback
  ).slice(0, 180);
}

export async function createClientFromAiAction(input: z.infer<typeof aiClientCreateSchema>) {
  const parsed = aiClientCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Tell me about the client first." };

  const [profile, draftResult] = await Promise.all([
    getProfile(),
    (async () => {
      const fd = new FormData();
      fd.set(
        "payload",
        JSON.stringify({ workflow: "client", prompt: parsed.data.prompt }),
      );
      return generateOperationalDraftAction(fd);
    })(),
  ]);

  if (!draftResult.ok || !("fullName" in draftResult.data)) {
    return { ok: false as const, error: draftResult.ok ? "Could not draft client." : draftResult.error };
  }

  const draft = draftResult.data as AiClientDraft;
  const fd = new FormData();
  fd.set("gstRegistered", "false");
  fd.set("fullName", draft.fullName || cleanPromptTitle(parsed.data.prompt, "New client"));
  fd.set("businessName", draft.businessName ?? "");
  fd.set("email", draft.email ?? "");
  fd.set("phone", draft.phone ?? "");
  fd.set("stateCode", profile?.stateCode ?? "27");
  fd.set("billingAddress", draft.billingAddress ?? "");
  fd.set("notes", draft.notes || parsed.data.prompt);
  fd.set("gstin", "");

  const res = await createClientAction(undefined, fd);
  if (!res.ok) return res;
  return { ok: true as const, data: { ...res.data, draft }, message: res.message };
}

export async function createProjectFromAiAction(input: z.infer<typeof aiProjectCreateSchema>) {
  const parsed = aiProjectCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Tell me about the project first." };

  const fdDraft = new FormData();
  fdDraft.set(
    "payload",
    JSON.stringify({
      workflow: "project",
      prompt: parsed.data.prompt,
      clientId: parsed.data.clientId,
    }),
  );
  const draftResult = await generateOperationalDraftAction(fdDraft);
  if (!draftResult.ok || !("name" in draftResult.data)) {
    return { ok: false as const, error: draftResult.ok ? "Could not draft project." : draftResult.error };
  }

  const draft = draftResult.data as AiProjectDraft;
  const fd = new FormData();
  fd.set("name", draft.name || cleanPromptTitle(parsed.data.prompt, "New project"));
  fd.set("description", draft.description || parsed.data.prompt);
  fd.set("clientId", draft.clientId || parsed.data.clientId || "");
  fd.set("status", "planning");
  fd.set("startDate", draft.startDate ?? "");
  fd.set("dueDate", draft.dueDate ?? "");

  const res = await createProjectAction(undefined, fd);
  if (!res.ok) return res;
  return { ok: true as const, data: { ...res.data, draft }, message: res.message };
}

export async function createInvoiceFromAiAction(input: z.infer<typeof aiInvoiceCreateSchema>) {
  const parsed = aiInvoiceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invoice details are incomplete." };
  }

  const userId = await requireUserId();
  const [profile, nextNumber] = await Promise.all([
    getProfile(),
    nextInvoiceNumber(userId),
  ]);
  const amount = amountFromPrompt(parsed.data.prompt);
  if (amount <= 0) {
    return {
      ok: false as const,
      error: "Add an invoice amount, for example: invoice Acme ₹50000 for landing page design.",
    };
  }

  const dueDate = dueDateFromPrompt(
    parsed.data.prompt,
    profile?.invoiceDefaultDueDays ?? 15,
  );
  const draftFd = new FormData();
  draftFd.set(
    "payload",
    JSON.stringify({
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      workDescription: parsed.data.prompt,
      amount,
      quantity: 1,
      dueDate,
      notes: "",
    }),
  );
  const draftResult = await generateInvoiceDraftAction(draftFd);
  if (!draftResult.ok) return draftResult;
  const line = draftResult.data.items[0];

  const fd = new FormData();
  fd.set(
    "payload",
    JSON.stringify({
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId || undefined,
      invoiceNumber: nextNumber.formatted,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate,
      currency: profile?.defaultCurrency ?? "INR",
      status: "draft",
      notes: draftResult.data.notes || undefined,
      terms: draftResult.data.terms || profile?.invoiceDefaultTerms || undefined,
      lines: [
        {
          description: line?.description || cleanPromptTitle(parsed.data.prompt, "Professional services"),
          quantity: line?.quantity || 1,
          unitPrice: line?.rate || amount,
          gstRate: profile?.gstRegistered ? profile.invoiceDefaultGstRate : 0,
          position: 0,
        },
      ],
    }),
  );

  const res = await createInvoiceAction(undefined, fd);
  if (!res.ok) return res;
  return {
    ok: true as const,
    data: { ...res.data, invoiceNumber: nextNumber.formatted, draft: draftResult.data },
    message: "Invoice draft created.",
  };
}

export async function answerFromDocsAction(input: z.infer<typeof aiDocsQuestionSchema>) {
  const parsed = aiDocsQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Ask a docs or support question first." };
  }

  let docsText = "";
  try {
    const docsPath = path.join(process.cwd(), "src", "app", "(marketing)", "docs", "page.tsx");
    const raw = await readFile(docsPath, "utf8");
    docsText = raw
      .replace(/import[\s\S]*?;\n/g, "")
      .replace(/export const[\s\S]*?;\n/g, "")
      .replace(/[{}()<>=`"'$]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 18000);
  } catch {
    docsText = "";
  }

  const ai = await generateStructuredJson({
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You answer Stackivo product support questions from the provided docs text. Return JSON with answer and usedDocs boolean. If the docs do not contain the answer, say what is known and suggest contacting support. Keep answers concise and actionable.",
      },
      {
        role: "user",
        content: JSON.stringify({
          question: parsed.data.question,
          docsText,
          requiredShape: {
            answer: "string",
            usedDocs: "boolean",
          },
        }),
      },
    ],
  }).catch(() => null);

  const shaped = z
    .object({
      answer: z.string().min(1).max(3000),
      usedDocs: z.boolean(),
    })
    .safeParse(ai);

  if (!shaped.success) {
    return {
      ok: true as const,
      data: {
        answer:
          "I could not read a precise answer from the docs yet. Share a little more detail, or use support and I will send this to the Stackivo team.",
        usedDocs: false,
      },
    };
  }

  return { ok: true as const, data: shaped.data };
}
