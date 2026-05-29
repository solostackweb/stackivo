import "server-only";

import type { ClientRecord } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";
import type { ProjectRecord } from "@/features/projects/server";
import { generateStructuredJson } from "./groq";
import {
  aiClientDraftSchema,
  aiContractDraftSchema,
  aiPortalDraftSchema,
  aiProjectDraftSchema,
  aiTimeEntryDraftSchema,
  aiWelcomeDraftSchema,
  type AiClientDraft,
  type AiContractDraft,
  type AiPortalDraft,
  type AiProjectDraft,
  type AiTimeEntryDraft,
  type AiWelcomeDraft,
} from "./types";

export type OperationsWorkflow =
  | "client"
  | "project"
  | "portal"
  | "time_entry"
  | "contract"
  | "welcome_document";

export type OperationsDraft =
  | AiClientDraft
  | AiProjectDraft
  | AiPortalDraft
  | AiTimeEntryDraft
  | AiContractDraft
  | AiWelcomeDraft;

interface DraftContext {
  prompt: string;
  clientId?: string;
  projectId?: string;
  clients: ClientRecord[];
  projects: ProjectRecord[];
  defaultHourlyRate?: number;
}

const today = () => new Date().toISOString().slice(0, 10);

function findClient(ctx: DraftContext) {
  return ctx.clientId
    ? ctx.clients.find((client) => client.id === ctx.clientId) ?? null
    : null;
}

function findProject(ctx: DraftContext) {
  return ctx.projectId
    ? ctx.projects.find((project) => project.id === ctx.projectId) ?? null
    : null;
}

function firstLine(prompt: string, fallback: string) {
  const line = prompt
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  return (line || fallback).slice(0, 160);
}

function localDraft(workflow: OperationsWorkflow, ctx: DraftContext): OperationsDraft {
  const client = findClient(ctx);
  const project = findProject(ctx);
  const prompt = ctx.prompt.trim();

  switch (workflow) {
    case "client":
      return {
        fullName: firstLine(prompt, "New client"),
        businessName: "",
        email: "",
        phone: "",
        billingAddress: "",
        notes: prompt,
      };
    case "project":
      return {
        name: firstLine(prompt, "New project"),
        description: prompt,
        clientId: client?.id ?? "",
        startDate: today(),
        dueDate: "",
      };
    case "portal":
      return {
        name: `${client ? getClientDisplayName(client) : firstLine(prompt, "Client")} Portal`,
        clientId: client?.id ?? "",
        brandColor: "#2563EB",
      };
    case "time_entry":
      return {
        description: firstLine(prompt, "Client work"),
        projectId: project?.id ?? "",
        date: today(),
        hours: 1,
        minutes: 0,
        billable: true,
        hourlyRate: ctx.defaultHourlyRate ?? 0,
      };
    case "contract":
      return {
        title: firstLine(prompt, "Service agreement"),
        kind: "contract",
        clientId: client?.id ?? "",
        projectId: project?.id ?? "",
        valueAmount: undefined,
        sections: [
          { heading: "Scope of Work", body: prompt || "Describe the agreed services." },
          { heading: "Timeline", body: "The parties will agree milestones in writing before work begins." },
          { heading: "Payment Terms", body: "Payment is due as per the invoice or written agreement." },
        ],
      };
    case "welcome_document":
      return {
        title: firstLine(prompt, "Welcome document"),
        intro: "Welcome aboard. This guide explains how we will work together.",
        clientId: client?.id ?? "",
        acknowledgementRequired: false,
        sections: [
          { heading: "How We Work", body: prompt || "We will communicate regularly and keep all key decisions documented." },
          { heading: "Next Steps", body: "Review this document, share any required access, and confirm the kickoff details." },
          { heading: "Payments & Deliverables", body: "Invoices and deliverables will be shared through Stackivo." },
        ],
      };
  }
}

function schemaFor(workflow: OperationsWorkflow) {
  switch (workflow) {
    case "client":
      return aiClientDraftSchema;
    case "project":
      return aiProjectDraftSchema;
    case "portal":
      return aiPortalDraftSchema;
    case "time_entry":
      return aiTimeEntryDraftSchema;
    case "contract":
      return aiContractDraftSchema;
    case "welcome_document":
      return aiWelcomeDraftSchema;
  }
}

export async function draftOperationalWorkflow(
  workflow: OperationsWorkflow,
  ctx: DraftContext,
): Promise<{ draft: OperationsDraft; provider: "groq" | "local" }> {
  const fallback = localDraft(workflow, ctx);
  const aiJson = await generateStructuredJson({
    messages: [
      {
        role: "system",
        content: [
          "You draft structured Stackivo workflow data for freelancers and agencies.",
          "Return only JSON. Never execute actions, mutate databases, calculate taxes, send messages, or invent private data.",
          "Prefer concise, practical business wording. Use only provided client and project ids.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          workflow,
          prompt: ctx.prompt,
          selectedClientId: ctx.clientId,
          selectedProjectId: ctx.projectId,
          clients: ctx.clients.map((client) => ({
            id: client.id,
            name: getClientDisplayName(client),
            businessName: client.businessName,
            email: client.email,
          })),
          projects: ctx.projects.map((project) => ({
            id: project.id,
            name: project.name,
            clientId: project.clientId,
            description: project.description,
          })),
          today: today(),
          defaultHourlyRate: ctx.defaultHourlyRate ?? 0,
          fallback,
        }),
      },
    ],
  }).catch(() => null);

  const parsed = schemaFor(workflow).safeParse(aiJson);
  if (!parsed.success) return { draft: fallback, provider: "local" };
  return { draft: parsed.data as OperationsDraft, provider: "groq" };
}
