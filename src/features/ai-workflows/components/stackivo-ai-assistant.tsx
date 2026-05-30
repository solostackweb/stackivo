"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  FileSignature,
  FileText,
  Headphones,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  Plus,
  ReceiptText,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { generateOperationalDraftAction } from "@/features/ai-workflows/actions";
import {
  approveInvoiceFromAiAction,
  createClientFromAiAction,
  createContractFromAiAction,
  createInvoiceFromAiAction,
  createProjectFromAiAction,
  emailInvoiceFromAiAction,
  invoiceWhatsappFromAiAction,
  answerFromDocsAction,
  sendContractFromAiAction,
} from "@/features/ai-workflows/global-actions";
import { submitBugReportAction } from "@/features/support/actions";
import type { AiContractDraft, AiWelcomeDraft } from "@/features/ai-workflows/types";

interface AiEntityOption {
  id: string;
  name: string;
  clientId?: string | null;
}

interface StackivoAiAssistantProps {
  clients: AiEntityOption[];
  projects: AiEntityOption[];
}

type AiMode =
  | "general"
  | "invoice"
  | "contract"
  | "welcome_document"
  | "client"
  | "project"
  | "support";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: React.ReactNode;
}

interface AiInvoicePreview {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  originalSubtotal: number;
  discount: number;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  currency: string;
  dueDate: string;
  status: string;
  terms: string | null;
  notes: string | null;
}

interface AiContractPreview {
  id: string;
  title: string;
  kind: "contract" | "proposal";
  clientName: string;
  clientEmail: string | null;
  projectName: string | null;
  valueAmount: number | null;
  currency: string;
  sections: Array<{ heading: string; body: string }>;
}

const QUICK_ACTIONS: Array<{
  mode: AiMode;
  title: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    mode: "invoice",
    title: "Create invoice",
    description: "Draft an invoice from client, work, amount, and due terms.",
    icon: ReceiptText,
  },
  {
    mode: "contract",
    title: "Draft contract",
    description: "Generate a full agreement or proposal in the builder.",
    icon: FileSignature,
  },
  {
    mode: "welcome_document",
    title: "Welcome doc",
    description: "Prepare a polished onboarding guide.",
    icon: FileText,
  },
  {
    mode: "client",
    title: "Add client",
    description: "Create a client record directly from chat.",
    icon: Users,
  },
  {
    mode: "project",
    title: "Add project",
    description: "Create a project with client context.",
    icon: LayoutDashboard,
  },
  {
    mode: "support",
    title: "Support",
    description: "Ask a question or submit a support request.",
    icon: Headphones,
  },
];

interface WorkflowStep {
  id: string;
  question: string;
  kind: "text" | "client" | "project" | "choice";
  placeholder?: string;
  options?: string[];
  optional?: boolean;
}

const WORKFLOW_STEPS: Partial<Record<AiMode, WorkflowStep[]>> = {
  invoice: [
    {
      id: "brief",
      question: "Tell me the client, work, amount, due date, and any discount. I will fill the invoice and ask only if something important is missing.",
      kind: "text",
      placeholder: "Example: Invoice Acme 25000 for website redesign, due in 15 days, discount 5000",
    },
  ],
  contract: [
    { id: "client", question: "Who is this contract or proposal for?", kind: "client" },
    { id: "project", question: "Should it be linked to a project?", kind: "project", optional: true },
    {
      id: "type",
      question: "What are we drafting?",
      kind: "choice",
      options: ["Service agreement", "Project proposal", "Retainer agreement", "NDA", "Maintenance contract"],
    },
    {
      id: "amount",
      question: "What contract value or commercial amount should I include?",
      kind: "text",
      optional: true,
      placeholder: "Example: INR 150000 fixed fee, 50% upfront, or skip if not applicable",
    },
    {
      id: "scope",
      question: "Describe the scope, deliverables, and timeline.",
      kind: "text",
      placeholder: "Example: Website redesign, 5 pages, CMS setup, 3 week timeline, client provides copy and assets",
    },
    {
      id: "commercials",
      question: "What are the fees, payment schedule, revision limits, and IP terms?",
      kind: "text",
      placeholder: "Example: INR 150000 fixed fee, 50% upfront, 2 revision rounds, final IP transfers after full payment",
    },
    {
      id: "clauses",
      question: "Any special clauses, exclusions, or client responsibilities?",
      kind: "text",
      optional: true,
      placeholder: "Example: excludes paid plugins, client must approve milestones within 3 business days",
    },
  ],
  welcome_document: [
    { id: "client", question: "Who is this welcome document for?", kind: "client", optional: true },
    {
      id: "relationship",
      question: "What kind of client or engagement is this?",
      kind: "choice",
      options: ["Design client", "Development client", "Retainer client", "Consulting client", "Agency client"],
    },
    {
      id: "process",
      question: "What process, communication cadence, and feedback rules should it explain?",
      kind: "text",
      placeholder: "Example: Weekly Friday updates, feedback in one doc, replies within 1 business day",
    },
    {
      id: "operations",
      question: "What should it say about payments, files, deliverables, and approvals?",
      kind: "text",
      placeholder: "Example: Invoices due in 15 days, final files via portal, approvals in writing",
    },
    {
      id: "tone",
      question: "What tone and next steps should the client see?",
      kind: "choice",
      options: ["Warm and premium", "Direct and concise", "Detailed and structured", "Friendly and simple"],
    },
  ],
  client: [
    { id: "name", question: "What is the client/contact name?", kind: "text", placeholder: "Example: Riya Sharma" },
    { id: "business", question: "What is the business or company name?", kind: "text", optional: true, placeholder: "Example: Acme Encore" },
    { id: "contact", question: "What email and phone should I save?", kind: "text", optional: true, placeholder: "Example: riya@acme.com, +91..." },
    { id: "billing", question: "What billing address or city/state should I save?", kind: "text", optional: true, placeholder: "Example: Mumbai, Maharashtra" },
    { id: "notes", question: "Any notes about this client?", kind: "text", optional: true, placeholder: "Example: Retainer client, prefers email, fast approvals" },
  ],
  project: [
    { id: "client", question: "Which client should this project belong to?", kind: "client", optional: true },
    { id: "name", question: "What is the project name?", kind: "text", placeholder: "Example: Website Redesign" },
    { id: "scope", question: "What is the goal, scope, and deliverables?", kind: "text", placeholder: "Example: Redesign landing page, CMS setup, analytics, launch support" },
    {
      id: "status",
      question: "What stage should I set?",
      kind: "choice",
      options: ["Planning", "Active", "Waiting on client", "Review", "On hold"],
    },
    { id: "dates", question: "What start date and due date should I use?", kind: "text", optional: true, placeholder: "Example: starts next Monday, due end of month" },
  ],
  support: [
    { id: "question", question: "What do you need help with?", kind: "text", placeholder: "Ask a Stackivo docs or support question" },
    { id: "page", question: "What page or workflow were you using?", kind: "text", optional: true, placeholder: "Example: invoices page, contract builder, payments settings" },
    {
      id: "route",
      question: "Should I answer from docs first, or send this to support?",
      kind: "choice",
      options: ["Answer from docs first", "Send to support"],
    },
  ],
};

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function StackivoAiAssistant({ clients, projects }: StackivoAiAssistantProps) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [mode, setMode] = React.useState<AiMode>("general");
  const [input, setInput] = React.useState("");
  const [workflowStep, setWorkflowStep] = React.useState<number | null>(null);
  const [workflowAnswers, setWorkflowAnswers] = React.useState<string[]>([]);
  const [clientId, setClientId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [messages, setMessages] = React.useState<Message[]>(() => [
    {
      id: newId(),
      role: "assistant",
      content: (
        <>
          <span className="block font-semibold">Good to see you.</span>
          <span className="mt-1 block text-muted-foreground">
            Tell me what you want to do, or pick a workflow. I can create
            invoices, clients, projects, contracts, welcome docs, and support
            requests from here.
          </span>
        </>
      ),
    },
  ]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("stackivo-ai-open", open);
    document.documentElement.style.setProperty(
      "--stackivo-ai-width",
      expanded ? "min(720px, calc(100vw - 18rem))" : "440px",
    );
    return () => {
      document.documentElement.classList.remove("stackivo-ai-open");
      document.documentElement.style.removeProperty("--stackivo-ai-width");
    };
  }, [expanded, mounted, open]);

  const projectOptions = React.useMemo(
    () => (clientId ? projects.filter((project) => project.clientId === clientId) : projects),
    [clientId, projects],
  );
  const activeSteps = WORKFLOW_STEPS[mode];
  const activeStep =
    workflowStep !== null && activeSteps ? activeSteps[workflowStep] : null;

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, open, pending]);

  const push = React.useCallback((message: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...message, id: newId() }]);
  }, []);

  const handleInvoiceDelivery = React.useCallback(
    (preview: AiInvoicePreview, channel: "email" | "whatsapp" | "both") => {
      push({
        role: "user",
        content:
          channel === "both"
            ? "Send by email and WhatsApp"
            : channel === "email"
              ? "Send by email"
              : "Open WhatsApp",
      });
      startTransition(async () => {
        if (channel === "email" || channel === "both") {
          const email = await emailInvoiceFromAiAction({ invoiceId: preview.id });
          if (!email.ok) {
            push({ role: "assistant", content: email.error });
            return;
          }
        }

        if (channel === "whatsapp" || channel === "both") {
          const whatsapp = await invoiceWhatsappFromAiAction({ invoiceId: preview.id });
          if (!whatsapp.ok) {
            push({ role: "assistant", content: whatsapp.error });
            return;
          }
          window.open(whatsapp.data.url, "_blank", "noopener,noreferrer");
        }

        push({
          role: "assistant",
          content:
            channel === "both"
              ? "Done. I emailed the invoice and opened WhatsApp with the invoice link ready to send."
              : channel === "email"
                ? "Done. I emailed the invoice to the client."
                : "WhatsApp is open with the invoice link ready to send.",
        });
        router.refresh();
      });
    },
    [push, router],
  );

  const handleInvoiceApprove = React.useCallback(
    (preview: AiInvoicePreview) => {
      push({ role: "user", content: `Approve ${preview.invoiceNumber}` });
      startTransition(async () => {
        const res = await approveInvoiceFromAiAction({ invoiceId: preview.id });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: (
            <InvoiceDeliveryActions
              preview={{ ...preview, status: "sent" }}
              onDeliver={handleInvoiceDelivery}
              onOpen={() => router.push(`/dashboard/invoices/${preview.id}`)}
            />
          ),
        });
        router.refresh();
      });
    },
    [handleInvoiceDelivery, push, router],
  );

  const handleContractSend = React.useCallback(
    (preview: AiContractPreview) => {
      push({ role: "user", content: `Approve and send ${preview.title}` });
      startTransition(async () => {
        const res = await sendContractFromAiAction({ contractId: preview.id });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: `${preview.kind === "proposal" ? "Proposal" : "Contract"} sent to ${preview.clientEmail ?? "the selected client"}.`,
        });
        router.refresh();
      });
    },
    [push, router],
  );

  const selectMode = (nextMode: AiMode) => {
    setMode(nextMode);
    setInput("");
    setWorkflowAnswers([]);
    const steps = WORKFLOW_STEPS[nextMode];
    setWorkflowStep(steps ? 0 : null);
    push({
      role: "assistant",
      content: (
        <>
          <span className="block">{modeIntro(nextMode)}</span>
          {steps ? <span className="mt-2 block font-medium">{steps[0].question}</span> : null}
        </>
      ),
    });
  };

  const detectMode = (text: string): AiMode => {
    const lower = text.toLowerCase();
    if (lower.includes("invoice") || lower.includes("bill ")) return "invoice";
    if (lower.includes("contract") || lower.includes("agreement") || lower.includes("proposal")) return "contract";
    if (lower.includes("welcome") || lower.includes("onboard")) return "welcome_document";
    if (lower.includes("client") || lower.includes("customer")) return "client";
    if (lower.includes("project")) return "project";
    if (lower.includes("support") || lower.includes("bug") || lower.includes("issue") || lower.includes("help")) return "support";
    return mode;
  };

  const executeWorkflow = React.useCallback(
    async (targetMode: AiMode, text: string) => {
      if (targetMode === "invoice") {
        const res = await createInvoiceFromAiAction({ prompt: text, clientId, projectId });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: (
            <InvoiceDraftPreview
              preview={res.data.preview}
              onApprove={handleInvoiceApprove}
              onOpen={() => router.push(`/dashboard/invoices/${res.data.preview.id}`)}
            />
          ),
        });
        router.refresh();
        return;
      }

      if (targetMode === "client") {
        const res = await createClientFromAiAction({ prompt: text });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title="Client created"
              description="I added the client to your workspace using the details from this chat."
              actionLabel="Open clients"
              onAction={() => router.push("/dashboard/clients")}
            />
          ),
        });
        router.refresh();
        return;
      }

      if (targetMode === "project") {
        const res = await createProjectFromAiAction({ prompt: text, clientId });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title="Project created"
              description="I created the project and linked the selected client if one was chosen."
              actionLabel="Open projects"
              onAction={() => router.push("/dashboard/projects")}
            />
          ),
        });
        router.refresh();
        return;
      }

      if (targetMode === "contract") {
        if (!clientId) {
          push({
            role: "assistant",
            content: "Choose a client first, then I can prepare the contract draft.",
          });
          return;
        }
        const res = await createContractFromAiAction({ prompt: text, clientId, projectId });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: (
            <ContractDraftPreview
              preview={res.data}
              onSend={handleContractSend}
              onOpen={() => router.push(`/dashboard/contracts/${res.data.id}`)}
            />
          ),
        });
        router.refresh();
        return;
      }

      if (targetMode === "welcome_document") {
        const fd = new FormData();
        fd.set(
          "payload",
          JSON.stringify({
            workflow: targetMode,
            prompt: text,
            clientId,
            projectId,
          }),
        );
        const res = await generateOperationalDraftAction(fd);
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        window.sessionStorage.setItem("stackivo.ai.welcomeDraft", JSON.stringify(res.data));
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title="Welcome document ready"
              description="I prepared a structured draft. Continue in the editor to review the title, sections, and final content before saving."
              actionLabel="Open welcome editor"
              onAction={() => router.push("/dashboard/welcome/new")}
            >
              <DraftSummary draft={res.data as AiContractDraft | AiWelcomeDraft} />
            </ResultBlock>
          ),
        });
        return;
      }

      if (targetMode === "support") {
        const docs = await answerFromDocsAction({ question: text });
        if (docs.ok && docs.data.usedDocs) {
          push({ role: "assistant", content: docs.data.answer });
          return;
        }
        const res = await submitBugReportAction({
          category: "how-to",
          summary: text.slice(0, 180),
          details: text,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        });
        if (!res.ok) {
          push({ role: "assistant", content: docs.ok ? docs.data.answer : res.error });
          return;
        }
        push({
          role: "assistant",
          content: docs.ok
            ? `${docs.data.answer}\n\nI also sent this to Stackivo support so the team can follow up.`
            : "I sent this to Stackivo support so the team can follow up.",
        });
        return;
      }

      push({
        role: "assistant",
        content:
          "I can help with invoices, contracts, welcome docs, clients, projects, and support. Pick one of the workflow cards or describe the action more directly.",
      });
    },
    [clientId, handleContractSend, handleInvoiceApprove, projectId, push, router],
  );

  const submit = (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || pending) return;
    const targetMode = mode === "general" ? detectMode(text) : mode;
    const steps = WORKFLOW_STEPS[targetMode];
    setMode(targetMode);
    setInput("");
    push({ role: "user", content: text });

    if (steps && workflowStep !== null) {
      const nextAnswers = [...workflowAnswers, text];
      setWorkflowAnswers(nextAnswers);
      const nextStep = workflowStep + 1;
      if (nextStep < steps.length) {
        setWorkflowStep(nextStep);
        push({ role: "assistant", content: steps[nextStep].question });
        return;
      }
      setWorkflowStep(null);
      startTransition(async () => {
        await executeWorkflow(
          targetMode,
          nextAnswers
            .map((answer, index) => `${steps[index].question}\n${answer}`)
            .join("\n\n"),
        );
      });
      return;
    }

    if (steps && mode === "general") {
      setWorkflowAnswers([text]);
      if (steps.length > 1) {
        setWorkflowStep(1);
        push({
          role: "assistant",
          content: (
            <>
              <span className="block">{modeIntro(targetMode)}</span>
              <span className="mt-2 block font-medium">{steps[1].question}</span>
            </>
          ),
        });
        return;
      }
    }

    startTransition(async () => {
      await executeWorkflow(targetMode, text);
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="hidden gap-1.5 text-sm font-semibold md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" /> Ask AI
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Ask AI"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      {mounted && open && createPortal((
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-[100] flex h-dvh w-full flex-col border-l bg-background transition-[width]",
            expanded ? "md:w-[min(720px,calc(100vw-18rem))]" : "md:w-[440px]",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b px-5">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-left font-semibold"
              onClick={() => {
                setMode("general");
                setWorkflowStep(null);
                setWorkflowAnswers([]);
              }}
            >
              <Sparkles className="h-4 w-4" />
              New conversation
            </button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setMessages((prev) => prev.slice(0, 1));
                  setMode("general");
                  setWorkflowStep(null);
                  setWorkflowAnswers([]);
                }}
                aria-label="New conversation"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden h-8 w-8 md:inline-flex"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? "Collapse AI panel" : "Expand AI panel"}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
                aria-label="Close AI panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="scrollbar-modern flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_18rem)] px-5 py-5"
          >
            <div className="rounded-xl border bg-background p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Need more help?</span>
                <Button type="button" variant="outline" size="sm" onClick={() => selectMode("support")}>
                  Support
                </Button>
              </div>
            </div>

            <div className="mx-auto flex max-w-sm flex-col items-center py-2 text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border bg-primary/10 text-primary shadow-sm">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold">What are we doing today?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Chat freely, or choose a workflow.
              </p>
            </div>

            <div className="grid gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.mode}
                  type="button"
                  onClick={() => selectMode(action.mode)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-background/95 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                    mode === action.mode && "border-primary/50 bg-primary/5",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <action.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{action.title}</span>
                    <span className="block text-xs text-muted-foreground">{action.description}</span>
                  </span>
                </button>
              ))}
            </div>

            {mode !== "general" && mode !== "support" && (
              <div className="rounded-xl border bg-background p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace context
                </p>
                <div className="grid gap-2">
                  <select
                    value={clientId}
                    onChange={(event) => {
                      setClientId(event.target.value);
                      setProjectId("");
                    }}
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">No specific client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {(mode === "invoice" || mode === "contract") && (
                    <select
                      value={projectId}
                      onChange={(event) => setProjectId(event.target.value)}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">No specific project</option>
                      {projectOptions.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm",
                    message.role === "user"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {activeStep && (
              <WorkflowStepInput
                step={activeStep}
                clients={clients}
                projects={projectOptions}
                clientId={clientId}
                projectId={projectId}
                onClientChange={(value, label) => {
                  setClientId(value);
                  setProjectId("");
                  submit(label || "No specific client");
                }}
                onProjectChange={(value, label) => {
                  setProjectId(value);
                  submit(label || "No specific project");
                }}
                onChoice={(value) => submit(value)}
                onSkip={() => submit("Skip")}
              />
            )}

            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border bg-background px-4 py-3 shadow-sm">
                  <span className="flex items-center gap-1">
                    {[0, 1, 2].map((item) => (
                      <span
                        key={item}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                        style={{ animationDelay: `${item * 120}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-background p-4">
            <div className="rounded-2xl border bg-background p-3 shadow-sm focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/15">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder={activeStep?.placeholder ?? placeholderForMode(mode)}
                rows={3}
                className="min-h-20 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  {mode === "general" ? "Ask" : labelForMode(mode)}
                </span>
                <Button type="button" size="icon" className="h-9 w-9 rounded-full" onClick={() => submit()} disabled={pending || !input.trim()}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
}

function modeIntro(mode: AiMode) {
  switch (mode) {
    case "invoice":
      return "Describe the invoice naturally. Include the client, work, amount, due date, and any discount you already know. I will infer the fields and ask only when something essential is missing.";
    case "contract":
      return "Describe the agreement, fee model, scope, timeline, revision limits, IP terms, and client responsibilities. I will open the contract builder with a full draft.";
    case "welcome_document":
      return "Tell me the client onboarding process, communication rules, payment terms, deliverables, and tone. I will open the welcome editor with a polished draft.";
    case "client":
      return "Tell me the client name, business, email, phone, billing address, and notes. I will create the client record directly.";
    case "project":
      return "Tell me the project name, goal, timeline, and client context. I will create the project directly.";
    case "support":
      return "Describe the issue or question. I can submit this to support now, and later I will answer from your docs/help center too.";
    default:
      return "Ask me what you want to do in Stackivo.";
  }
}

function placeholderForMode(mode: AiMode) {
  switch (mode) {
    case "invoice":
      return "Example: Invoice Acme 25000 for website redesign, due in 15 days, discount 5000.";
    case "contract":
      return "Example: Draft a service agreement for a website redesign, ₹150000 fixed fee, 50% upfront, 2 revisions, 3 week timeline...";
    case "welcome_document":
      return "Example: Create a premium welcome doc explaining weekly updates, feedback process, invoices due in 15 days, and deliverables...";
    case "client":
      return "Example: Add Acme Encore, contact Riya Sharma, riya@acme.com, Mumbai, prefers email, retainer client...";
    case "project":
      return "Example: Create Website Redesign for Acme Encore, starts next week, due end of month, includes landing page and CMS setup...";
    case "support":
      return "Describe your issue or question...";
    default:
      return "What can Stackivo AI help you with?";
  }
}

function labelForMode(mode: AiMode) {
  return QUICK_ACTIONS.find((action) => action.mode === mode)?.title ?? "Ask";
}

function WorkflowStepInput({
  step,
  clients,
  projects,
  clientId,
  projectId,
  onClientChange,
  onProjectChange,
  onChoice,
  onSkip,
}: {
  step: WorkflowStep;
  clients: AiEntityOption[];
  projects: AiEntityOption[];
  clientId: string;
  projectId: string;
  onClientChange: (value: string, label: string) => void;
  onProjectChange: (value: string, label: string) => void;
  onChoice: (value: string) => void;
  onSkip: () => void;
}) {
  if (step.kind === "text") {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[88%] rounded-2xl border bg-background px-4 py-3 text-sm shadow-sm">
        <p className="font-medium">{step.question}</p>

        {step.kind === "client" && (
          <div className="mt-3 space-y-2">
            <select
              value={clientId}
              onChange={(event) => {
                const option = event.currentTarget.selectedOptions[0];
                onClientChange(event.target.value, option?.textContent ?? "");
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {step.optional && (
              <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            )}
          </div>
        )}

        {step.kind === "project" && (
          <div className="mt-3 space-y-2">
            <select
              value={projectId}
              onChange={(event) => {
                const option = event.currentTarget.selectedOptions[0];
                onProjectChange(event.target.value, option?.textContent ?? "");
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
            >
              <option value="">No specific project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
              Skip project
            </Button>
          </div>
        )}

        {step.kind === "choice" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {step.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChoice(option)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {option}
              </button>
            ))}
            {step.optional && (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                Skip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatAiMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function InvoiceDraftPreview({
  preview,
  onApprove,
  onOpen,
}: {
  preview: AiInvoicePreview;
  onApprove: (preview: AiInvoicePreview) => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">Draft invoice ready for approval</p>
        <p className="mt-1 text-muted-foreground">
          I created {preview.invoiceNumber} as a draft. Here is the quick review before I publish it.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <div className="border-b bg-background px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {preview.invoiceNumber}
          </p>
          <p className="mt-0.5 font-semibold">{preview.clientName}</p>
          <p className="text-xs text-muted-foreground">Due {preview.dueDate}</p>
        </div>
        <div className="space-y-2 px-3 py-3 text-xs">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 text-muted-foreground">{preview.description}</span>
            <span className="shrink-0 font-medium">
              {preview.quantity} x {formatAiMoney(preview.unitPrice, preview.currency)}
            </span>
          </div>
          {preview.discount > 0 && (
            <div className="flex justify-between gap-3 text-emerald-700">
              <span>Discount applied</span>
              <span>-{formatAiMoney(preview.discount, preview.currency)}</span>
            </div>
          )}
          {preview.taxTotal > 0 && (
            <div className="flex justify-between gap-3 text-muted-foreground">
              <span>Tax</span>
              <span>{formatAiMoney(preview.taxTotal, preview.currency)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatAiMoney(preview.totalAmount, preview.currency)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onApprove(preview)}>
          Approve invoice
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          Open invoice
        </Button>
      </div>
    </div>
  );
}

function InvoiceDeliveryActions({
  preview,
  onDeliver,
  onOpen,
}: {
  preview: AiInvoicePreview;
  onDeliver: (preview: AiInvoicePreview, channel: "email" | "whatsapp" | "both") => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">Invoice approved</p>
        <p className="mt-1 text-muted-foreground">
          {preview.invoiceNumber} is now ready to send. Choose how you want me to deliver it.
        </p>
      </div>
      <div className="rounded-xl border bg-muted/20 p-3 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{preview.clientName}</span>
          <span className="font-semibold">{formatAiMoney(preview.totalAmount, preview.currency)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-3 text-muted-foreground">
          <span>Email {preview.clientEmail ? "available" : "not saved"}</span>
          <span>WhatsApp {preview.clientPhone ? "available" : "manual contact"}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onDeliver(preview, "email")}>
          Email
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDeliver(preview, "whatsapp")}>
          WhatsApp
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => onDeliver(preview, "both")}>
          Both
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onOpen}>
          Open invoice
        </Button>
      </div>
    </div>
  );
}

function ContractDraftPreview({
  preview,
  onSend,
  onOpen,
}: {
  preview: AiContractPreview;
  onSend: (preview: AiContractPreview) => void;
  onOpen: () => void;
}) {
  const kindLabel = preview.kind === "proposal" ? "Proposal" : "Contract";
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">{kindLabel} draft ready for review</p>
        <p className="mt-1 text-muted-foreground">
          I saved this as a draft. Review the structure below, then open it for manual checking or approve sending to the client.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <div className="border-b bg-background px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {kindLabel}
          </p>
          <p className="mt-0.5 font-semibold">{preview.title}</p>
          <p className="text-xs text-muted-foreground">
            {preview.clientName}
            {preview.projectName ? ` · ${preview.projectName}` : ""}
          </p>
        </div>
        <div className="space-y-2 px-3 py-3 text-xs">
          {preview.valueAmount != null && preview.valueAmount > 0 ? (
            <div className="flex justify-between gap-3 rounded-lg bg-background px-2 py-1.5">
              <span className="text-muted-foreground">Contract value</span>
              <span className="font-semibold">{formatAiMoney(preview.valueAmount, preview.currency)}</span>
            </div>
          ) : null}
          <div className="space-y-2">
            {preview.sections.slice(0, 4).map((section) => (
              <div key={section.heading} className="rounded-lg bg-background px-2 py-2">
                <p className="font-medium">{section.heading}</p>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{section.body}</p>
              </div>
            ))}
          </div>
          {preview.sections.length > 4 ? (
            <p className="text-muted-foreground">+ {preview.sections.length - 4} more sections in the draft</p>
          ) : null}
        </div>
      </div>
      <div className="rounded-xl border bg-background p-3 text-xs text-muted-foreground">
        Client email: {preview.clientEmail || "not saved. Add an email before sending."}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onSend(preview)}>
          Approve and send
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          Open draft
        </Button>
      </div>
    </div>
  );
}

function ResultBlock({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
      <Button type="button" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function DraftSummary({ draft }: { draft: AiContractDraft | AiWelcomeDraft }) {
  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <p className="text-sm font-medium">{draft.title}</p>
      {"intro" in draft && draft.intro ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{draft.intro}</p>
      ) : null}
      <div className="space-y-1">
        {draft.sections.slice(0, 3).map((section) => (
          <p key={section.heading} className="text-xs text-muted-foreground">
            {section.heading}
          </p>
        ))}
      </div>
    </div>
  );
}
