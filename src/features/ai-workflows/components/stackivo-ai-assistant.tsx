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
  createClientFromAiAction,
  createInvoiceFromAiAction,
  createProjectFromAiAction,
  answerFromDocsAction,
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
      id: "client",
      question: "Choose the client for this invoice.",
      kind: "client",
    },
    {
      id: "project",
      question: "Should I link this invoice to a project?",
      kind: "project",
      optional: true,
    },
    {
      id: "work",
      question: "What work should I invoice for?",
      kind: "text",
      placeholder: "Example: Landing page design, responsive build, and launch support",
    },
    {
      id: "amount",
      question: "What amount should I bill?",
      kind: "text",
      placeholder: "Example: INR 50000, quantity 1",
    },
    {
      id: "due",
      question: "When should the invoice be due?",
      kind: "choice",
      options: ["7 days", "15 days", "30 days", "End of month"],
    },
    {
      id: "notes",
      question: "Any discount, payment terms, or notes?",
      kind: "text",
      optional: true,
      placeholder: "Example: 10% discount, payment by bank transfer, thanks for the quick feedback",
    },
  ],
  contract: [
    { id: "client", question: "Who is this contract or proposal for?", kind: "client", optional: true },
    { id: "project", question: "Should it be linked to a project?", kind: "project", optional: true },
    {
      id: "type",
      question: "What are we drafting?",
      kind: "choice",
      options: ["Service agreement", "Project proposal", "Retainer agreement", "NDA", "Maintenance contract"],
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
        if (!clientId) {
          push({
            role: "assistant",
            content: "Choose a client first, then send the invoice details again.",
          });
          return;
        }
        const res = await createInvoiceFromAiAction({ prompt: text, clientId, projectId });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title={`Invoice ${res.data.invoiceNumber} created as draft`}
              description="I saved it in Invoices. You can review, edit, send, or share it from the invoice page."
              actionLabel="Open invoices"
              onAction={() => router.push("/dashboard/invoices")}
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

      if (targetMode === "contract" || targetMode === "welcome_document") {
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
        const key =
          targetMode === "contract"
            ? "stackivo.ai.contractDraft"
            : "stackivo.ai.welcomeDraft";
        window.sessionStorage.setItem(key, JSON.stringify(res.data));
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title={targetMode === "contract" ? "Contract draft ready" : "Welcome document ready"}
              description="I prepared a structured draft. Continue in the editor to review the title, sections, and final content before saving."
              actionLabel={targetMode === "contract" ? "Open contract builder" : "Open welcome editor"}
              onAction={() =>
                router.push(
                  targetMode === "contract"
                    ? "/dashboard/contracts/new"
                    : "/dashboard/welcome/new",
                )
              }
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
    [clientId, projectId, push, router],
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
      return "Tell me the client, work delivered, amount, due terms, and any notes. Choose the client from context so I can save the invoice draft.";
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
      return "Example: Create invoice for landing page design, responsive build, and launch support for ₹50000 due in 15 days.";
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
