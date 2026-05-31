import "server-only";

import type { ClientRecord } from "@/features/clients/server";
import type { ProjectRecord } from "@/features/projects/server";
import { getClientDisplayName } from "@/features/clients/utils";
import { generateStructuredJson } from "./groq";
import {
  AI_WORKFLOWS,
  type AiFields,
  type AiIntent,
  type AiInterpretation,
} from "./types";

interface InterpretContext {
  message: string;
  currentWorkflow?: AiIntent;
  collected?: AiFields;
  clients: ClientRecord[];
  projects: ProjectRecord[];
}

const CANONICAL_FIELDS: Record<string, string[]> = {
  invoice: ["workDescription", "amount", "quantity", "dueDate", "discount", "notes"],
  contract: ["scope", "type", "commercials", "clauses", "amount"],
  welcome_document: ["relationship", "process", "operations", "tone"],
  client: ["fullName", "businessName", "email", "phone", "billingAddress", "notes"],
  project: ["name", "scope", "status", "dates"],
  time_entry: ["description", "duration", "billable"],
  support: ["question", "page"],
};

// ---------------------------------------------------------------------------
// Deterministic fallback (used when Groq is unavailable or returns junk)
// ---------------------------------------------------------------------------

function detectIntentLocally(text: string): { intent: AiIntent; confident: boolean } {
  const t = text.toLowerCase();
  // Explicit switch phrasing makes us confident even mid-flow.
  const explicit = /\b(create|make|draft|add|new|start|log|raise|generate)\b/.test(t);
  if (/\binvoice|bill\b|billing|receipt|charge\b/.test(t)) return { intent: "invoice", confident: explicit };
  if (/\bcontract|agreement|proposal|nda|retainer\b/.test(t)) return { intent: "contract", confident: explicit };
  if (/\bwelcome|onboard|onboarding|kickoff\b/.test(t)) return { intent: "welcome_document", confident: explicit };
  if (/\bproject\b/.test(t)) return { intent: "project", confident: explicit };
  if (/\bclient|customer|contact\b/.test(t)) return { intent: "client", confident: explicit };
  if (/\btime\b|\bhours?\b|\bminutes?\b|\blog time\b|\bbillable\b/.test(t)) return { intent: "time_entry", confident: explicit };
  if (/\bsupport|bug|issue|\bhelp\b|how do|how to|what is|privacy|terms\b/.test(t)) return { intent: "support", confident: true };
  return { intent: "general", confident: false };
}

function amountFromText(text: string): string {
  const normalized = text.replace(/,/g, "");
  const match =
    normalized.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/i) ??
    normalized.match(/(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|inr)/i) ??
    normalized.match(/\b(\d{3,}(?:\.\d+)?)\b/);
  return match ? match[1] : "";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveEntity<T extends { id: string }>(
  text: string,
  items: T[],
  label: (item: T) => string,
): string | undefined {
  const haystack = ` ${normalize(text)} `;
  let best: { id: string; score: number } | null = null;
  for (const item of items) {
    const name = normalize(label(item));
    if (!name) continue;
    let score = 0;
    if (haystack.includes(` ${name} `)) score = name.length + 100;
    else {
      score = name
        .split(" ")
        .filter((w) => w.length >= 3 && haystack.includes(` ${w} `))
        .reduce((s, w) => s + w.length, 0);
    }
    if (score > 0 && (!best || score > best.score)) best = { id: item.id, score };
  }
  return best?.id;
}

function localFields(intent: AiIntent, text: string): AiFields {
  const fields: AiFields = {};
  if (intent === "invoice" || intent === "contract") {
    const amount = amountFromText(text);
    if (amount) fields.amount = amount;
  }
  if (intent === "support") fields.question = text;
  return fields;
}

function localInterpret(ctx: InterpretContext): AiInterpretation {
  const { intent, confident } = detectIntentLocally(ctx.message);
  const effective = intent === "general" && ctx.currentWorkflow ? ctx.currentWorkflow : intent;
  const clientId = resolveEntity(ctx.message, ctx.clients, (c) => getClientDisplayName(c));
  const projectId = resolveEntity(ctx.message, ctx.projects, (p) => p.name);
  return {
    intent: effective,
    confident,
    fields: localFields(effective, ctx.message),
    clientId,
    projectId,
    provider: "local",
  };
}

// ---------------------------------------------------------------------------
// Groq-powered interpretation
// ---------------------------------------------------------------------------

export async function interpretMessage(ctx: InterpretContext): Promise<AiInterpretation> {
  const fallback = localInterpret(ctx);

  const clientList = ctx.clients.slice(0, 200).map((c) => ({
    id: c.id,
    name: getClientDisplayName(c),
    business: c.businessName ?? "",
  }));
  const projectList = ctx.projects.slice(0, 200).map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
  }));

  const aiJson = await generateStructuredJson({
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: [
          "You are the routing + extraction brain of Stackivo, a workflow automation tool for freelancers and agencies.",
          "Classify the user's message into exactly one intent and extract structured fields. Return ONLY JSON.",
          `Valid intents: ${[...AI_WORKFLOWS, "general"].join(", ")}.`,
          "If the user clearly asks to start or switch to a different task (e.g. 'now create a client', 'actually make an invoice'), set intent to that task and confident=true.",
          "If the message just adds detail to the current workflow, keep the current workflow as the intent.",
          "Resolve clientName/projectName to an id from the provided lists when the message names a known client/project; otherwise leave the id fields empty.",
          "Never invent ids, money totals, taxes, or private data. Extract only what the user stated.",
          "Field keys by intent — invoice: workDescription, amount, quantity, dueDate, discount, notes; contract: scope, type, commercials, clauses, amount; welcome_document: relationship, process, operations, tone; client: fullName, businessName, email, phone, billingAddress, notes; project: name, scope, status, dates; time_entry: description, duration, billable; support: question, page.",
          "amount/discount must be plain numbers as strings (no currency symbols). billable is 'true' or 'false'.",
          'Return shape: {"intent":"...","confident":true,"fields":{...},"clientId":"","projectId":""}.',
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          message: ctx.message,
          currentWorkflow: ctx.currentWorkflow ?? "general",
          alreadyCollected: ctx.collected ?? {},
          clients: clientList,
          projects: projectList,
          fieldKeysByIntent: CANONICAL_FIELDS,
        }),
      },
    ],
  }).catch(() => null);

  if (!aiJson || typeof aiJson !== "object") return fallback;

  const raw = aiJson as Record<string, unknown>;
  const intentRaw = typeof raw.intent === "string" ? raw.intent : "";
  const intent = ([...AI_WORKFLOWS, "general"] as string[]).includes(intentRaw)
    ? (intentRaw as AiIntent)
    : fallback.intent;

  const fields: AiFields = {};
  if (raw.fields && typeof raw.fields === "object") {
    for (const [key, value] of Object.entries(raw.fields as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      const str = String(value).trim();
      if (str) fields[key] = str;
    }
  }

  // Trust an explicit, validated id; otherwise fall back to local resolution.
  const clientId =
    (typeof raw.clientId === "string" && ctx.clients.some((c) => c.id === raw.clientId)
      ? raw.clientId
      : undefined) ?? fallback.clientId;
  const projectId =
    (typeof raw.projectId === "string" && ctx.projects.some((p) => p.id === raw.projectId)
      ? raw.projectId
      : undefined) ?? fallback.projectId;

  return {
    intent,
    confident: raw.confident === true,
    fields: { ...fallback.fields, ...fields },
    clientId,
    projectId,
    provider: "groq",
  };
}
