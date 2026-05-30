"use server";

import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";

import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { env } from "@/config/env";
import { getServerSupabase } from "@/lib/supabase/server";
import { getProfile } from "@/features/profile/server";
import { nextInvoiceNumber } from "@/features/invoices/server";
import { createInvoiceAction, setInvoiceStatusAction } from "@/features/invoices/actions";
import { sendInvoiceAction } from "@/features/invoices/delivery";
import { createContractAction } from "@/features/contracts/actions";
import { sendContractAction } from "@/features/contracts/delivery";
import { getContractShareUrl } from "@/features/documents/urls";
import { createClientAction } from "@/features/clients/actions";
import { createProjectAction } from "@/features/projects/actions";
import { INDIAN_STATES } from "@/features/gst/state-codes";
import { ensureInvoicePublicToken } from "@/features/share/server";
import { buildWaUrl } from "@/lib/whatsapp";
import {
  createWelcomeDocumentAction,
  publishWelcomeDocumentAction,
} from "@/features/welcome-documents/actions";
import { sendWelcomeDocumentAction } from "@/features/welcome-documents/delivery";
import {
  ensureWelcomePublicToken,
} from "@/features/welcome-documents/server";
import { getWelcomeShareUrl } from "@/features/welcome-documents/routes";
import { generateInvoiceDraftAction, generateOperationalDraftAction } from "./actions";
import { generateStructuredJson } from "./groq";
import type { AiClientDraft, AiContractDraft, AiProjectDraft, AiWelcomeDraft } from "./types";

const aiClientCreateSchema = z.object({
  prompt: z.string().trim().min(4).max(6000),
});

const aiProjectCreateSchema = z.object({
  prompt: z.string().trim().min(4).max(6000),
  clientId: z.string().optional().or(z.literal("")),
});

const aiInvoiceCreateSchema = z.object({
  prompt: z.string().trim().min(4).max(6000),
  clientId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
});

const aiInvoiceIdSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice id"),
});

const aiContractCreateSchema = z.object({
  prompt: z.string().trim().min(8).max(10000),
  clientId: z.string().min(1, "Choose a client"),
  projectId: z.string().optional().or(z.literal("")),
});

const aiContractIdSchema = z.object({
  contractId: z.string().uuid("Invalid contract id"),
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
  if (match) return Number(match[1]);
  const rupeeMatch =
    normalized.match(/₹\s*(\d+(?:\.\d+)?)/i) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*₹/i);
  return rupeeMatch ? Number(rupeeMatch[1]) : 0;
}

function quantityFromPrompt(prompt: string) {
  const normalized = prompt.replace(/,/g, "").toLowerCase();
  const match =
    normalized.match(/\bqty(?:uantity)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/) ??
    normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:x|units?|items?)\b/);
  const value = match ? Number(match[1]) : 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function quantityFromAnswer(value: string) {
  const cleaned = cleanAiAnswer(value);
  if (!cleaned) return 1;
  const explicit = quantityFromPrompt(cleaned);
  if (explicit !== 1 || /\b1\b/.test(cleaned)) return explicit;
  const number = cleaned.replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0];
  const parsed = number ? Number(number) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function discountFromPrompt(prompt: string, subtotal: number) {
  const normalized = prompt.replace(/,/g, "").toLowerCase();
  const percentMatch =
    normalized.match(/(?:discount|off)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*%/) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*%\s*(?:discount|off)/);
  if (percentMatch) {
    return Math.min(subtotal, Math.max(0, (subtotal * Number(percentMatch[1])) / 100));
  }

  const flatMatch =
    normalized.match(/(?:discount|off)\s*(?:of\s*)?(?:â‚¹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/) ??
    normalized.match(/(?:â‚¹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(?:discount|off)/);
  if (flatMatch) return Math.min(subtotal, Math.max(0, Number(flatMatch[1])));
  const rupeeMatch =
    normalized.match(/(?:discount|off)\s*(?:of\s*)?₹\s*(\d+(?:\.\d+)?)/) ??
    normalized.match(/₹\s*(\d+(?:\.\d+)?)\s*(?:discount|off)/);
  return rupeeMatch ? Math.min(subtotal, Math.max(0, Number(rupeeMatch[1]))) : 0;
}

function discountFromAnswer(value: string, subtotal: number) {
  const cleaned = cleanAiAnswer(value);
  if (!cleaned) return 0;
  const parsed = discountFromPrompt(cleaned, subtotal);
  if (parsed > 0) return parsed;
  const number = cleaned.replace(/,/g, "").match(/\d+(?:\.\d+)?/)?.[0];
  return number ? Math.min(subtotal, Math.max(0, Number(number))) : 0;
}

function workDescriptionFromPrompt(prompt: string) {
  const match = prompt.match(/\bfor\s+(.+?)(?=\s+(?:due|discount|offer|less|qty|quantity)\b|$)/i);
  return cleanAiAnswer(match?.[1]) || prompt;
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

function cleanAiAnswer(value: string | undefined | null) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "";
  if (/^(skip|none|no|n\/a|na|-|—)$/i.test(cleaned)) return "";
  return cleaned;
}

function answerForQuestion(prompt: string, questionIncludes: string) {
  const blocks = prompt
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const match = blocks.find((block) =>
    block.toLowerCase().startsWith(questionIncludes.toLowerCase()),
  );
  if (!match) return "";
  const [, ...answerLines] = match.split(/\n/);
  return cleanAiAnswer(answerLines.join("\n"));
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extractPhone(value: string) {
  const withoutEmail = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ");
  const match = withoutEmail.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match ? match[0].replace(/[^\d+]/g, "") : "";
}

function stateCodeFromText(value: string, fallback: string) {
  const normalized = value.toLowerCase();
  const state = INDIAN_STATES.find((item) => {
    const name = item.name.toLowerCase();
    return (
      normalized.includes(name) ||
      new RegExp(`\\b${item.isoAlpha.toLowerCase()}\\b`).test(normalized)
    );
  });
  if (state) return state.code;

  const cityMap: Record<string, string> = {
    indore: "23",
    bhopal: "23",
    mumbai: "27",
    pune: "27",
    delhi: "07",
    bengaluru: "29",
    bangalore: "29",
    hyderabad: "36",
    chennai: "33",
    ahmedabad: "24",
    jaipur: "08",
    lucknow: "09",
    kolkata: "19",
  };
  const city = Object.entries(cityMap).find(([name]) => normalized.includes(name));
  return city?.[1] ?? fallback;
}

function clientDraftFromWorkflowAnswers(prompt: string, fallbackStateCode: string) {
  const name = answerForQuestion(prompt, "What is the client/contact name?");
  const business = answerForQuestion(prompt, "What is the business or company name?");
  const contact = answerForQuestion(prompt, "What email and phone should I save?");
  const billing = answerForQuestion(prompt, "What billing address or city/state should I save?");
  const notes = answerForQuestion(prompt, "Any notes about this client?");

  if (!name && !business && !contact && !billing && !notes) return null;

  return {
    fullName: name || business || cleanPromptTitle(prompt, "New client"),
    businessName: business,
    email: extractEmail(contact),
    phone: extractPhone(contact),
    billingAddress: billing,
    stateCode: stateCodeFromText(billing, fallbackStateCode),
    notes,
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function nextWeekday(from: Date, weekday: number) {
  const date = new Date(from);
  const delta = (weekday + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function parseProjectDates(value: string) {
  const lower = value.toLowerCase();
  const todayDate = new Date();
  const isoMatches = value.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  if (isoMatches.length >= 2) {
    return { startDate: isoMatches[0] ?? "", dueDate: isoMatches[1] ?? "" };
  }

  let startDate = isoMatches[0] && !/(due|deadline|end|complete)/i.test(value) ? isoMatches[0] : "";
  let dueDate = isoMatches[0] && !startDate ? isoMatches[0] : "";

  const slashMatches = value.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) ?? [];
  const parsedSlash = slashMatches
    .map((item) => {
      const [day, month, rawYear] = item.split(/[/-]/).map(Number);
      const year = rawYear && rawYear < 100 ? 2000 + rawYear : rawYear;
      if (!day || !month || !year) return "";
      return isoDate(new Date(year, month - 1, day));
    })
    .filter(Boolean);
  if (parsedSlash.length >= 2) {
    return { startDate: parsedSlash[0] ?? "", dueDate: parsedSlash[1] ?? "" };
  }
  if (parsedSlash[0]) {
    if (/(due|deadline|end|complete)/i.test(value)) dueDate = parsedSlash[0];
    else startDate = parsedSlash[0];
  }

  if (!startDate) {
    if (lower.includes("start today") || lower.includes("starts today")) startDate = isoDate(todayDate);
    else if (lower.includes("start tomorrow") || lower.includes("starts tomorrow")) startDate = isoDate(addDays(todayDate, 1));
    else if (lower.includes("start next week") || lower.includes("starts next week")) startDate = isoDate(addDays(todayDate, 7));
    else if (lower.includes("next monday")) startDate = isoDate(nextWeekday(todayDate, 1));
  }

  if (!dueDate) {
    const dueDays = lower.match(/(?:due|deadline|complete|finish|ends?)\s*(?:in\s*)?(\d{1,3})\s*days?/);
    if (dueDays) dueDate = isoDate(addDays(todayDate, Number(dueDays[1])));
    else if (lower.includes("due next week") || lower.includes("deadline next week")) dueDate = isoDate(addDays(todayDate, 7));
    else if (lower.includes("due end of month") || lower.includes("end of month")) dueDate = isoDate(endOfMonth(todayDate));
    else if (lower.includes("due next month") || lower.includes("next month")) dueDate = isoDate(endOfMonth(addDays(endOfMonth(todayDate), 1)));
  }

  return { startDate, dueDate };
}

function projectStatusFromText(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("active") || lower.includes("started") || lower.includes("in progress")) return "active";
  if (lower.includes("waiting")) return "waiting_on_client";
  if (lower.includes("review")) return "review";
  if (lower.includes("hold") || lower.includes("paused")) return "on_hold";
  if (lower.includes("lead")) return "lead";
  if (lower.includes("completed") || lower.includes("done")) return "completed";
  return "planning";
}

function projectDraftFromWorkflowAnswers(prompt: string, selectedClientId: string | undefined) {
  const name = answerForQuestion(prompt, "What is the project name?");
  const scope = answerForQuestion(prompt, "What is the goal, scope, and deliverables?");
  const status = answerForQuestion(prompt, "What stage should I set?");
  const dates = answerForQuestion(prompt, "What start date and due date should I use?");

  if (!name && !scope && !status && !dates) return null;
  const parsedDates = parseProjectDates(dates);
  return {
    name: name || cleanPromptTitle(scope || prompt, "New project"),
    description: scope,
    clientId: selectedClientId ?? "",
    status: projectStatusFromText(status),
    startDate: parsedDates.startDate,
    dueDate: parsedDates.dueDate,
  };
}

function contractKindFromText(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("proposal")) return "proposal" as const;
  return "contract" as const;
}

function contractTitleFromDraft(kind: "contract" | "proposal", clientName: string, projectName: string, fallback: string) {
  const subject = projectName || clientName;
  if (subject) return `${subject} ${kind === "proposal" ? "Proposal" : "Agreement"}`;
  return cleanPromptTitle(fallback, kind === "proposal" ? "Project proposal" : "Service agreement");
}

function contractPromptFromWorkflowAnswers(prompt: string) {
  const type = answerForQuestion(prompt, "What are we drafting?");
  const amount = answerForQuestion(prompt, "What contract value or commercial amount should I include?");
  const scope = answerForQuestion(prompt, "Describe the scope, deliverables, and timeline.");
  const commercials = answerForQuestion(prompt, "What are the fees, payment schedule, revision limits, and IP terms?");
  const clauses = answerForQuestion(prompt, "Any special clauses, exclusions, or client responsibilities?");

  return {
    type,
    scope,
    commercials,
    clauses,
    combined: [
      type ? `Document type: ${type}` : "",
      amount ? `Contract value or commercial amount: ${amount}` : "",
      scope ? `Scope, deliverables, and timeline: ${scope}` : "",
      commercials ? `Commercials, payment, revisions, and IP: ${commercials}` : "",
      clauses ? `Special clauses, exclusions, and responsibilities: ${clauses}` : "",
    ].filter(Boolean).join("\n\n") || prompt,
  };
}

function invoiceDraftFromWorkflowAnswers(prompt: string, fallbackDueDays: number) {
  const workDescription = answerForQuestion(prompt, "What work should I invoice for?");
  const amountAnswer = answerForQuestion(prompt, "What total amount should I bill before discount?");
  const dueAnswer = answerForQuestion(prompt, "When should the invoice be due?");
  const quantityAnswer = answerForQuestion(prompt, "What quantity should I use?");
  const discountAnswer = answerForQuestion(prompt, "Should I apply a discount?");
  const terms = answerForQuestion(prompt, "Any payment terms to include?");
  const notes = answerForQuestion(prompt, "Any additional notes for the client?");
  const hasGuidedAnswers =
    workDescription ||
    amountAnswer ||
    dueAnswer ||
    quantityAnswer ||
    discountAnswer ||
    terms ||
    notes;

  if (!hasGuidedAnswers) {
    const originalSubtotal = amountFromPrompt(prompt);
    const quantity = quantityFromPrompt(prompt);
    return {
      workDescription: workDescriptionFromPrompt(prompt),
      originalSubtotal,
      quantity,
      discount: discountFromPrompt(prompt, originalSubtotal),
      dueDate: dueDateFromPrompt(prompt, fallbackDueDays),
      terms: "",
      notes: "",
    };
  }

  const originalSubtotal = amountFromPrompt(amountAnswer);
  const quantity = quantityFromAnswer(quantityAnswer);
  return {
    workDescription: workDescription || "Professional services",
    originalSubtotal,
    quantity,
    discount: discountFromAnswer(discountAnswer, originalSubtotal),
    dueDate: dueDateFromPrompt(dueAnswer, fallbackDueDays),
    terms,
    notes,
  };
}

function normalizedSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function entityMatchScore(prompt: string, ...labels: Array<string | null | undefined>) {
  const haystack = ` ${normalizedSearchText(prompt)} `;
  return labels.reduce((best, label) => {
    const normalized = normalizedSearchText(label ?? "");
    if (!normalized) return best;
    if (haystack.includes(` ${normalized} `)) return Math.max(best, normalized.length + 100);
    const wordScore = normalized
      .split(" ")
      .filter((word) => word.length >= 3 && haystack.includes(` ${word} `))
      .reduce((score, word) => score + word.length, 0);
    return Math.max(best, wordScore);
  }, 0);
}

export async function createClientFromAiAction(input: z.infer<typeof aiClientCreateSchema>) {
  const parsed = aiClientCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Tell me about the client first." };

  const profile = await getProfile();
  const fallbackStateCode = profile?.stateCode ?? "27";
  let draft: AiClientDraft & { stateCode?: string } =
    clientDraftFromWorkflowAnswers(parsed.data.prompt, fallbackStateCode) ?? {
      fullName: "",
      businessName: "",
      email: "",
      phone: "",
      billingAddress: "",
      notes: "",
      stateCode: fallbackStateCode,
    };

  if (!draft.fullName) {
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({ workflow: "client", prompt: parsed.data.prompt }),
    );
    const draftResult = await generateOperationalDraftAction(fd);
    if (!draftResult.ok || !("fullName" in draftResult.data)) {
      return { ok: false as const, error: draftResult.ok ? "Could not draft client." : draftResult.error };
    }
    const aiDraft = draftResult.data as AiClientDraft;
    draft = {
      fullName: cleanAiAnswer(aiDraft.fullName) || cleanPromptTitle(parsed.data.prompt, "New client"),
      businessName: cleanAiAnswer(aiDraft.businessName),
      email: extractEmail(aiDraft.email ?? parsed.data.prompt),
      phone: extractPhone(aiDraft.phone ?? parsed.data.prompt),
      billingAddress: cleanAiAnswer(aiDraft.billingAddress),
      notes: cleanAiAnswer(aiDraft.notes),
      stateCode: stateCodeFromText(aiDraft.billingAddress ?? parsed.data.prompt, fallbackStateCode),
    };
  }

  const fd = new FormData();
  fd.set("gstRegistered", "false");
  fd.set("fullName", cleanAiAnswer(draft.fullName) || cleanPromptTitle(parsed.data.prompt, "New client"));
  fd.set("businessName", cleanAiAnswer(draft.businessName) || "");
  fd.set("email", extractEmail(draft.email ?? "") || "");
  fd.set("phone", extractPhone(draft.phone ?? "") || cleanAiAnswer(draft.phone) || "");
  fd.set("stateCode", draft.stateCode || fallbackStateCode);
  fd.set("billingAddress", cleanAiAnswer(draft.billingAddress) || "");
  fd.set("notes", cleanAiAnswer(draft.notes) || "");
  fd.set("gstin", "");

  const res = await createClientAction(undefined, fd);
  if (!res.ok) return res;
  return { ok: true as const, data: { ...res.data, draft }, message: res.message };
}

export async function createProjectFromAiAction(input: z.infer<typeof aiProjectCreateSchema>) {
  const parsed = aiProjectCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Tell me about the project first." };

  let draft: (AiProjectDraft & { status?: string }) | null = projectDraftFromWorkflowAnswers(
    parsed.data.prompt,
    parsed.data.clientId || undefined,
  );

  if (!draft?.name) {
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

    const aiDraft = draftResult.data as AiProjectDraft;
    draft = {
      name: cleanAiAnswer(aiDraft.name) || cleanPromptTitle(parsed.data.prompt, "New project"),
      description: cleanAiAnswer(aiDraft.description) || parsed.data.prompt,
      clientId: parsed.data.clientId || aiDraft.clientId || "",
      status: "planning",
      startDate: cleanAiAnswer(aiDraft.startDate),
      dueDate: cleanAiAnswer(aiDraft.dueDate),
    };
  }

  const fd = new FormData();
  fd.set("name", cleanAiAnswer(draft.name) || cleanPromptTitle(parsed.data.prompt, "New project"));
  fd.set("description", cleanAiAnswer(draft.description) || "");
  fd.set("clientId", parsed.data.clientId || cleanAiAnswer(draft.clientId) || "");
  fd.set("status", projectStatusFromText(draft.status || "planning"));
  fd.set("startDate", cleanAiAnswer(draft.startDate) || "");
  fd.set("dueDate", cleanAiAnswer(draft.dueDate) || "");

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
  const supabase = await getServerSupabase();
  const [profile, nextNumber, { data: clientRows }, { data: projectRows }] = await Promise.all([
    getProfile(),
    nextInvoiceNumber(userId),
    supabase
      .from("clients")
      .select("id, full_name, business_name")
      .eq("user_id", userId),
    supabase
      .from("projects")
      .select("id, client_id, name")
      .eq("user_id", userId),
  ]);
  const availableClients = (clientRows ?? []) as Array<{
    id: string;
    full_name?: string | null;
    business_name?: string | null;
  }>;
  const inferredClient = availableClients
    .map((client) => ({
      client,
      score: entityMatchScore(parsed.data.prompt, client.business_name, client.full_name),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.client;
  const clientId = parsed.data.clientId || inferredClient?.id || "";
  if (!clientId) {
    return {
      ok: false as const,
      error: "Which client is this invoice for? Mention the client name, or select one from workspace context.",
    };
  }

  const availableProjects = (projectRows ?? []) as Array<{
    id: string;
    client_id?: string | null;
    name?: string | null;
  }>;
  const inferredProject = availableProjects
    .filter((project) => project.client_id === clientId)
    .map((project) => ({
      project,
      score: entityMatchScore(parsed.data.prompt, project.name),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.project;
  const projectId = parsed.data.projectId || inferredProject?.id || "";

  const invoiceInput = invoiceDraftFromWorkflowAnswers(
    parsed.data.prompt,
    profile?.invoiceDefaultDueDays ?? 15,
  );
  const { originalSubtotal, quantity, discount, dueDate } = invoiceInput;
  if (originalSubtotal <= 0) {
    return {
      ok: false as const,
      error: "Add an invoice amount, for example: invoice Acme ₹50000 for landing page design.",
    };
  }

  const netSubtotal = Math.max(0, originalSubtotal - discount);
  const unitPrice = quantity > 0 ? originalSubtotal / quantity : originalSubtotal;
  const draftFd = new FormData();
  draftFd.set(
    "payload",
    JSON.stringify({
      clientId,
      projectId,
      workDescription: invoiceInput.workDescription,
      amount: netSubtotal,
      quantity,
      dueDate,
      notes: invoiceInput.notes,
    }),
  );
  const draftResult = await generateInvoiceDraftAction(draftFd);
  if (!draftResult.ok) return draftResult;
  const line = draftResult.data.items[0];

  const fd = new FormData();
  fd.set(
    "payload",
    JSON.stringify({
      clientId,
      projectId: projectId || undefined,
      invoiceNumber: nextNumber.formatted,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate,
      currency: profile?.defaultCurrency ?? "INR",
      status: "draft",
      discount,
      notes: invoiceInput.notes || draftResult.data.notes || undefined,
      terms: invoiceInput.terms || draftResult.data.terms || profile?.invoiceDefaultTerms || undefined,
      lines: [
        {
          description: line?.description || cleanPromptTitle(invoiceInput.workDescription, "Professional services"),
          quantity,
          unitPrice,
          gstRate: profile?.gstRegistered ? profile.invoiceDefaultGstRate : 0,
          position: 0,
        },
      ],
    }),
  );

  const res = await createInvoiceAction(undefined, fd);
  if (!res.ok) return res;
  if (!res.data?.id) return { ok: false as const, error: "Invoice was saved but its id was not returned." };
  const invoiceId = res.data.id;

  const [{ data: invoiceRow }, { data: clientRow }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, currency, subtotal, discount_amount, gst_amount, total_amount, due_date, status, notes, terms")
      .eq("id", invoiceId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("full_name, business_name, email, phone")
      .eq("id", clientId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const invoice = invoiceRow as
    | {
        id: string;
        invoice_number: string;
        currency: string;
        subtotal: number;
        discount_amount: number;
        gst_amount: number;
        total_amount: number;
        due_date: string;
        status: string;
        notes?: string | null;
        terms?: string | null;
      }
    | null;
  const client = clientRow as
    | {
        full_name?: string | null;
        business_name?: string | null;
        email?: string | null;
        phone?: string | null;
      }
    | null;

  return {
    ok: true as const,
    data: {
      ...res.data,
      invoiceNumber: invoice?.invoice_number ?? nextNumber.formatted,
      draft: draftResult.data,
      preview: {
        id: invoiceId,
        invoiceNumber: invoice?.invoice_number ?? nextNumber.formatted,
        clientName: client?.business_name || client?.full_name || "Selected client",
        clientEmail: client?.email ?? null,
        clientPhone: client?.phone ?? null,
        description: line?.description || cleanPromptTitle(invoiceInput.workDescription, "Professional services"),
        quantity,
        unitPrice,
        originalSubtotal,
        discount: Number(invoice?.discount_amount ?? discount),
        subtotal: Number(invoice?.subtotal ?? netSubtotal),
        taxTotal: Number(invoice?.gst_amount ?? 0),
        totalAmount: Number(invoice?.total_amount ?? netSubtotal),
        currency: invoice?.currency ?? profile?.defaultCurrency ?? "INR",
        dueDate: invoice?.due_date ?? dueDate,
        status: invoice?.status ?? "draft",
        terms: invoice?.terms ?? draftResult.data.terms ?? profile?.invoiceDefaultTerms ?? null,
        notes: invoice?.notes ?? draftResult.data.notes ?? null,
      },
    },
    message: "Invoice draft created.",
  };
}

export async function approveInvoiceFromAiAction(input: z.infer<typeof aiInvoiceIdSchema>) {
  const parsed = aiInvoiceIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid invoice." };

  const fd = new FormData();
  fd.set("id", parsed.data.invoiceId);
  fd.set("status", "sent");
  const res = await setInvoiceStatusAction(undefined, fd);
  if (!res.ok) return res;
  return { ok: true as const, message: "Invoice approved and marked as sent." };
}

export async function emailInvoiceFromAiAction(input: z.infer<typeof aiInvoiceIdSchema>) {
  const parsed = aiInvoiceIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid invoice." };
  return sendInvoiceAction({ invoiceId: parsed.data.invoiceId });
}

export async function invoiceWhatsappFromAiAction(input: z.infer<typeof aiInvoiceIdSchema>) {
  const parsed = aiInvoiceIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid invoice." };

  const userId = await requireUserId();
  const supabase = await getServerSupabase();
  const { data: invoiceRow } = await supabase
    .from("invoices")
    .select("id, user_id, client_id, invoice_number, currency, total_amount")
    .eq("id", parsed.data.invoiceId)
    .eq("user_id", userId)
    .maybeSingle();
  const invoice = invoiceRow as
    | {
        id: string;
        user_id: string;
        client_id?: string | null;
        invoice_number: string;
        currency: string;
        total_amount: number;
      }
    | null;
  if (!invoice) return { ok: false as const, error: "Invoice not found." };

  const [{ data: clientRow }, { data: profileRow }] = await Promise.all([
    invoice.client_id
      ? supabase
          .from("clients")
          .select("full_name, business_name, phone")
          .eq("id", invoice.client_id)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("user_profiles")
      .select("business_name, legal_name, full_name, display_name")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  const client = clientRow as
    | { full_name?: string | null; business_name?: string | null; phone?: string | null }
    | null;
  const profile = profileRow as
    | {
        business_name?: string | null;
        legal_name?: string | null;
        full_name?: string | null;
        display_name?: string | null;
      }
    | null;
  const token = await ensureInvoicePublicToken(invoice.id);
  if (!token) return { ok: false as const, error: "Could not create invoice share link." };

  const fd = new FormData();
  fd.set("invoiceId", invoice.id);
  fd.set("status", "sent");
  await setInvoiceStatusAction(undefined, fd);

  const shareUrl = `${env.appUrl.replace(/\/$/, "")}/i/${token}`;
  const senderName =
    profile?.business_name || profile?.legal_name || profile?.display_name || profile?.full_name || "Stackivo";

  return {
    ok: true as const,
    data: {
      url: buildWaUrl({
        phone: client?.phone ?? null,
        clientName: client?.business_name || client?.full_name || null,
        documentType: "invoice",
        documentNumber: invoice.invoice_number,
        amount: Number(invoice.total_amount) || 0,
        currency: invoice.currency,
        senderName,
        shareUrl,
      }),
    },
  };
}

export async function createContractFromAiAction(input: z.infer<typeof aiContractCreateSchema>) {
  const parsed = aiContractCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Contract details are incomplete." };
  }

  const userId = await requireUserId();
  const supabase = await getServerSupabase();
  const [{ data: clientRow }, { data: projectRow }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, business_name, email")
      .eq("id", parsed.data.clientId)
      .eq("user_id", userId)
      .maybeSingle(),
    parsed.data.projectId
      ? supabase
          .from("projects")
          .select("id, name")
          .eq("id", parsed.data.projectId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const client = clientRow as
    | { id: string; full_name?: string | null; business_name?: string | null; email?: string | null }
    | null;
  if (!client) return { ok: false as const, error: "Choose a client you have access to." };
  const project = projectRow as { id: string; name?: string | null } | null;
  const workflow = contractPromptFromWorkflowAnswers(parsed.data.prompt);
  const amount = amountFromPrompt(parsed.data.prompt);

  const fdDraft = new FormData();
  fdDraft.set(
    "payload",
    JSON.stringify({
      workflow: "contract",
      prompt: workflow.combined,
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
    }),
  );
  const draftResult = await generateOperationalDraftAction(fdDraft);
  if (!draftResult.ok || !("sections" in draftResult.data)) {
    return { ok: false as const, error: draftResult.ok ? "Could not draft contract." : draftResult.error };
  }

  const draft = draftResult.data as AiContractDraft;
  const kind = contractKindFromText(workflow.type || draft.kind);
  const title =
    cleanAiAnswer(draft.title) ||
    contractTitleFromDraft(
      kind,
      client.business_name || client.full_name || "",
      project?.name || "",
      parsed.data.prompt,
    );
  const sections = draft.sections.length > 0
    ? draft.sections
    : [
        { heading: "Scope of Work", body: workflow.scope || "The service provider will deliver the agreed services." },
        { heading: "Fees and Payment", body: workflow.commercials || "Fees and payment terms will follow the agreed commercial terms." },
        { heading: "Responsibilities", body: workflow.clauses || "Both parties will cooperate in good faith to complete the engagement." },
      ];

  const fd = new FormData();
  fd.set("kind", kind);
  fd.set("title", title);
  fd.set("content", JSON.stringify(sections));
  fd.set("clientId", parsed.data.clientId);
  if (parsed.data.projectId) fd.set("projectId", parsed.data.projectId);
  fd.set("status", "draft");
  fd.set("currency", "INR");
  if (amount > 0) fd.set("valueAmount", String(amount));

  const res = await createContractAction(undefined, fd);
  if (!res.ok) return res;
  if (!res.data?.id) return { ok: false as const, error: "Contract was saved but its id was not returned." };

  return {
    ok: true as const,
    data: {
      id: res.data.id,
      title,
      kind,
      clientName: client.business_name || client.full_name || "Selected client",
      clientEmail: client.email ?? null,
      projectName: project?.name ?? null,
      valueAmount: amount > 0 ? amount : draft.valueAmount ?? null,
      currency: "INR",
      sections,
    },
    message: "Contract draft created.",
  };
}

export async function sendContractFromAiAction(input: z.infer<typeof aiContractIdSchema>) {
  const parsed = aiContractIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid contract." };
  return sendContractAction({ contractId: parsed.data.contractId });
}

export async function answerFromDocsAction(input: z.infer<typeof aiDocsQuestionSchema>) {
  const parsed = aiDocsQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Ask a docs or support question first." };
  }

  async function readPageText(relPath: string, limit = 10000): Promise<string> {
    try {
      const raw = await readFile(path.join(process.cwd(), "src", "app", relPath), "utf8");
      return raw
        .replace(/import[\s\S]*?;\n/g, "")
        .replace(/export const[\s\S]*?;\n/g, "")
        .replace(/[{}()<>=`"'$]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, limit);
    } catch {
      return "";
    }
  }

  const [docsText, privacyText, termsText] = await Promise.all([
    readPageText("(marketing)/docs/page.tsx", 14000),
    readPageText("(marketing)/privacy/page.tsx", 5000),
    readPageText("(marketing)/terms/page.tsx", 5000),
  ]);

  const combinedContext = [
    docsText ? `--- DOCS ---\n${docsText}` : "",
    privacyText ? `--- PRIVACY POLICY ---\n${privacyText}` : "",
    termsText ? `--- TERMS & CONDITIONS ---\n${termsText}` : "",
  ].filter(Boolean).join("\n\n").slice(0, 22000);

  const ai = await generateStructuredJson({
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You answer Stackivo product support, privacy, and terms questions from the provided page text. Return JSON with answer and usedDocs boolean. If the text does not contain the answer, say what is known and suggest contacting support. Keep answers concise and actionable. Never invent policies or features.",
      },
      {
        role: "user",
        content: JSON.stringify({
          question: parsed.data.question,
          context: combinedContext,
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

// ---------------------------------------------------------------------------
// Welcome document AI pipeline
// ---------------------------------------------------------------------------

const aiWelcomeDocCreateSchema = z.object({
  prompt: z.string().trim().min(8).max(10000),
  clientId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
});

const aiWelcomeDocIdSchema = z.object({
  welcomeDocId: z.string().uuid("Invalid welcome document id"),
});

export async function createWelcomeDocFromAiAction(
  input: z.infer<typeof aiWelcomeDocCreateSchema>,
) {
  const parsed = aiWelcomeDocCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Welcome doc details incomplete." };
  }

  const userId = await requireUserId();
  const supabase = await getServerSupabase();
  const clientId = parsed.data.clientId || undefined;
  const projectId = parsed.data.projectId || undefined;

  const [{ data: clientRow }, { data: projectRow }] = await Promise.all([
    clientId
      ? supabase.from("clients").select("id, full_name, business_name, email, phone").eq("id", clientId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    projectId
      ? supabase.from("projects").select("id, name").eq("id", projectId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const client = clientRow as { id: string; full_name?: string | null; business_name?: string | null; email?: string | null; phone?: string | null } | null;
  const project = projectRow as { id: string; name?: string | null } | null;

  const fdDraft = new FormData();
  fdDraft.set("payload", JSON.stringify({
    workflow: "welcome_document",
    prompt: parsed.data.prompt,
    clientId: parsed.data.clientId,
    projectId: parsed.data.projectId,
  }));
  const draftResult = await generateOperationalDraftAction(fdDraft);
  if (!draftResult.ok || !("sections" in draftResult.data)) {
    return { ok: false as const, error: draftResult.ok ? "Could not draft welcome document." : draftResult.error };
  }

  const draft = draftResult.data as AiWelcomeDraft;
  const clientDisplay = client?.business_name || client?.full_name || null;

  const res = await createWelcomeDocumentAction({
    title: draft.title || (clientDisplay ? `Welcome, ${clientDisplay}` : "Welcome document"),
    intro: draft.intro || null,
    sections: draft.sections,
    clientId: clientId ?? null,
    projectId: projectId ?? null,
    acknowledgementRequired: draft.acknowledgementRequired ?? false,
    brandColor: null,
  });
  if (!res.ok || !res.data?.id) {
    return { ok: false as const, error: res.ok ? "Welcome document was saved but id was not returned." : res.error };
  }

  return {
    ok: true as const,
    data: {
      id: res.data.id,
      title: draft.title,
      intro: draft.intro ?? null,
      sections: draft.sections,
      acknowledgementRequired: draft.acknowledgementRequired,
      clientName: clientDisplay,
      clientEmail: client?.email ?? null,
      clientPhone: client?.phone ?? null,
      projectName: project?.name ?? null,
    },
    message: "Welcome document draft created.",
  };
}

export async function approveWelcomeDocFromAiAction(
  input: z.infer<typeof aiWelcomeDocIdSchema>,
) {
  const parsed = aiWelcomeDocIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid welcome document." };
  const res = await publishWelcomeDocumentAction({ id: parsed.data.welcomeDocId });
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const, message: "Welcome document published." };
}

export async function sendWelcomeDocFromAiAction(
  input: z.infer<typeof aiWelcomeDocIdSchema>,
) {
  const parsed = aiWelcomeDocIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid welcome document." };
  return sendWelcomeDocumentAction({ documentId: parsed.data.welcomeDocId });
}

export async function welcomeDocWhatsappFromAiAction(
  input: z.infer<typeof aiWelcomeDocIdSchema>,
) {
  const parsed = aiWelcomeDocIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid welcome document." };

  const userId = await requireUserId();
  const supabase = await getServerSupabase();

  const { data: docRow } = await supabase
    .from("welcome_documents")
    .select("id, title, client_id, public_token")
    .eq("id", parsed.data.welcomeDocId)
    .eq("user_id", userId)
    .maybeSingle();
  const doc = docRow as { id: string; title: string; client_id?: string | null; public_token?: string | null } | null;
  if (!doc) return { ok: false as const, error: "Welcome document not found." };

  const token = doc.public_token ?? await ensureWelcomePublicToken(doc.id);
  if (!token) return { ok: false as const, error: "Could not create share link." };

  const [{ data: clientRow }, { data: profileRow }] = await Promise.all([
    doc.client_id
      ? supabase.from("clients").select("full_name, business_name, phone").eq("id", doc.client_id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("user_profiles").select("business_name, legal_name, full_name, display_name").eq("id", userId).maybeSingle(),
  ]);
  const client = clientRow as { full_name?: string | null; business_name?: string | null; phone?: string | null } | null;
  const profile = profileRow as { business_name?: string | null; legal_name?: string | null; full_name?: string | null; display_name?: string | null } | null;

  const shareUrl = getWelcomeShareUrl(token, env.appUrl);
  const senderName = profile?.business_name || profile?.legal_name || profile?.display_name || profile?.full_name || "Stackivo";
  const clientName = client?.business_name || client?.full_name || null;
  const clientPhone = client?.phone ?? null;

  const message = `Hi${clientName ? ` ${clientName}` : ""}! ${senderName} has shared a welcome document with you. Open it here: ${shareUrl}`;
  const waBase = clientPhone ? `https://wa.me/${clientPhone.replace(/\D/g, "")}` : "https://wa.me/";
  const url = `${waBase}?text=${encodeURIComponent(message)}`;

  return { ok: true as const, data: { url, shareUrl } };
}

// ---------------------------------------------------------------------------
// Contract WhatsApp delivery
// ---------------------------------------------------------------------------

const aiContractWhatsappSchema = z.object({
  contractId: z.string().uuid("Invalid contract id"),
});

export async function contractWhatsappFromAiAction(
  input: z.infer<typeof aiContractWhatsappSchema>,
) {
  const parsed = aiContractWhatsappSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid contract." };

  const userId = await requireUserId();
  const supabase = await getServerSupabase();

  const { data: contractRow } = await supabase
    .from("contracts")
    .select("id, title, kind, client_id, value_amount, currency, public_token")
    .eq("id", parsed.data.contractId)
    .eq("user_id", userId)
    .maybeSingle();
  const contract = contractRow as {
    id: string;
    title: string;
    kind: string;
    client_id?: string | null;
    value_amount?: number | null;
    currency: string;
    public_token?: string | null;
  } | null;
  if (!contract) return { ok: false as const, error: "Contract not found." };

  // Mint or reuse public token — mirrors requestSignatureAction
  let token = contract.public_token ?? null;
  if (!token) {
    token = randomUUID();
    await supabase
      .from("contracts")
      .update({ public_token: token, status: "sent", sent_at: new Date().toISOString() } as never)
      .eq("id", contract.id);
  }

  const [{ data: clientRow }, { data: profileRow }] = await Promise.all([
    contract.client_id
      ? supabase.from("clients").select("full_name, business_name, phone").eq("id", contract.client_id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("user_profiles").select("business_name, legal_name, full_name, display_name").eq("id", userId).maybeSingle(),
  ]);
  const client = clientRow as { full_name?: string | null; business_name?: string | null; phone?: string | null } | null;
  const profile = profileRow as { business_name?: string | null; legal_name?: string | null; full_name?: string | null; display_name?: string | null } | null;

  const shareUrl = getContractShareUrl(token);
  const senderName = profile?.business_name || profile?.legal_name || profile?.display_name || profile?.full_name || "Stackivo";
  const clientName = client?.business_name || client?.full_name || null;
  const clientPhone = client?.phone ?? null;
  const docLabel = contract.kind === "proposal" ? "proposal" : "contract";

  const message = `Hi${clientName ? ` ${clientName}` : ""}! ${senderName} has shared a ${docLabel} with you. Review and sign here: ${shareUrl}`;
  const waBase = clientPhone ? `https://wa.me/${clientPhone.replace(/\D/g, "")}` : "https://wa.me/";
  const url = `${waBase}?text=${encodeURIComponent(message)}`;

  return { ok: true as const, data: { url, shareUrl } };
}
