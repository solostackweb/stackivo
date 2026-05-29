"use client";

import * as React from "react";
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

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function StackivoAiAssistant({ clients, projects }: StackivoAiAssistantProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [mode, setMode] = React.useState<AiMode>("general");
  const [input, setInput] = React.useState("");
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

  const projectOptions = React.useMemo(
    () => (clientId ? projects.filter((project) => project.clientId === clientId) : projects),
    [clientId, projects],
  );

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
    push({
      role: "assistant",
      content: modeIntro(nextMode),
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

  const submit = () => {
    const text = input.trim();
    if (!text || pending) return;
    const targetMode = mode === "general" ? detectMode(text) : mode;
    setMode(targetMode);
    setInput("");
    push({ role: "user", content: text });

    startTransition(async () => {
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
        const res = await submitBugReportAction({
          category: "how-to",
          summary: text.slice(0, 180),
          details: text,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        });
        if (!res.ok) {
          push({ role: "assistant", content: res.error });
          return;
        }
        push({
          role: "assistant",
          content: "I sent this to Stackivo support. As the docs/help center grows, I will also answer directly from those pages here.",
        });
        return;
      }

      push({
        role: "assistant",
        content:
          "I can help with invoices, contracts, welcome docs, clients, projects, and support. Pick one of the workflow cards or describe the action more directly.",
      });
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

      {open && (
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-background shadow-2xl transition-[width]",
            expanded ? "md:w-[min(720px,calc(100vw-18rem))]" : "md:w-[440px]",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b px-5">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-left font-semibold"
              onClick={() => setMode("general")}
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
                onClick={() => setMessages((prev) => prev.slice(0, 1))}
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
            className="scrollbar-modern flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.12),transparent_15rem)] bg-[length:24px_24px] px-5 py-5"
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
              <div className="relative h-20 w-32">
                <span className="absolute left-2 top-8 h-10 w-16 rounded-full bg-orange-300 blur-sm" />
                <span className="absolute left-8 top-3 h-16 w-20 rounded-full bg-orange-200" />
                <span className="absolute right-2 top-7 h-12 w-16 rounded-full bg-orange-400" />
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
                placeholder={placeholderForMode(mode)}
                rows={3}
                className="min-h-20 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  {mode === "general" ? "Ask" : labelForMode(mode)}
                </span>
                <Button type="button" size="icon" className="h-9 w-9 rounded-full" onClick={submit} disabled={pending || !input.trim()}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
