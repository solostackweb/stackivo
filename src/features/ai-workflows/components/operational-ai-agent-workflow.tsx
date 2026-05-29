"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProfile } from "@/features/profile/context";
import { getDisplayName } from "@/features/profile/utils";
import { generateOperationalDraftAction } from "@/features/ai-workflows/actions";
import type {
  OperationsDraft,
  OperationsWorkflow,
} from "@/features/ai-workflows/operations-workflow";

interface EntityOption {
  id: string;
  name?: string;
  fullName?: string;
  businessName?: string | null;
  clientId?: string | null;
}

interface OperationalAiAgentWorkflowProps<TDraft extends OperationsDraft> {
  workflow: OperationsWorkflow;
  title: string;
  intro: string;
  clients?: EntityOption[];
  projects?: EntityOption[];
  selectedClientId?: string;
  selectedProjectId?: string;
  defaultHourlyRate?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDraft: (draft: TDraft) => void;
  applyLabel?: string;
}

const WORKFLOW_OPTIONS: Record<
  OperationsWorkflow,
  {
    contextLabel: string;
    firstQuestion: string;
    firstOptions: string[];
    secondQuestion: string;
    secondOptions: string[];
    finalQuestion: string;
    finalOptions: string[];
    detailQuestion?: string;
    detailPlaceholder?: string;
    generating: string;
  }
> = {
  client: {
    contextLabel: "new client",
    firstQuestion: "What kind of client are we adding?",
    firstOptions: ["Startup", "Agency", "Consultant", "Local business", "Enterprise", "Creator"],
    secondQuestion: "What should I remember?",
    secondOptions: ["Fast payer", "Needs GST billing", "Prefers email", "Multiple contacts", "Retainer client"],
    finalQuestion: "What tone should the notes use?",
    finalOptions: ["Concise", "Relationship-focused", "Finance-ready", "Operational"],
    generating: "Drafting the client profile...",
  },
  project: {
    contextLabel: "new project",
    firstQuestion: "What type of project is this?",
    firstOptions: ["Website redesign", "Brand identity", "Marketing campaign", "App development", "Consulting"],
    secondQuestion: "What pace are we working at?",
    secondOptions: ["One week sprint", "Two week sprint", "One month project", "Ongoing retainer"],
    finalQuestion: "What status should this imply?",
    finalOptions: ["Planning", "Kickoff ready", "Active work", "Needs client input"],
    generating: "Drafting the project setup...",
  },
  portal: {
    contextLabel: "client portal",
    firstQuestion: "What kind of portal should this be?",
    firstOptions: ["Project workspace", "Retainer hub", "File delivery room", "Approval center", "Client dashboard"],
    secondQuestion: "What feel should it have?",
    secondOptions: ["Clean blue", "Premium dark", "Friendly green", "Neutral studio", "Minimal"],
    finalQuestion: "What should it emphasize?",
    finalOptions: ["Files", "Invoices", "Contracts", "Updates", "All work"],
    generating: "Drafting the portal setup...",
  },
  time_entry: {
    contextLabel: "time entry",
    firstQuestion: "What did you work on?",
    firstOptions: ["Design revisions", "Development", "Client call", "Planning", "QA review", "Content updates"],
    secondQuestion: "How long did it take?",
    secondOptions: ["30 minutes", "1 hour", "2 hours", "3 hours", "Half day"],
    finalQuestion: "How should it be billed?",
    finalOptions: ["Billable", "Non-billable", "Use default rate", "Internal work"],
    generating: "Drafting the time entry...",
  },
  contract: {
    contextLabel: "contract",
    firstQuestion: "What agreement are we drafting?",
    firstOptions: ["Service agreement", "Project proposal", "Retainer agreement", "NDA", "Scope change", "Maintenance"],
    secondQuestion: "What commercial model fits?",
    secondOptions: ["Fixed fee", "Hourly", "Monthly retainer", "Milestone payments", "50% upfront"],
    finalQuestion: "What clauses matter most?",
    finalOptions: ["Scope control", "Payment terms", "Revision limits", "IP ownership", "Confidentiality"],
    detailQuestion: "Add the deal specifics",
    detailPlaceholder:
      "Example: Fixed fee ₹1,50,000. 50% upfront, 50% before handoff. Includes landing page design, Webflow build, 2 revision rounds, client provides copy and assets. Timeline 3 weeks.",
    generating: "Drafting the agreement...",
  },
  welcome_document: {
    contextLabel: "welcome document",
    firstQuestion: "Who is this welcome document for?",
    firstOptions: ["New design client", "New development client", "Retainer client", "Consulting client", "Agency client"],
    secondQuestion: "What should it explain?",
    secondOptions: ["Process", "Communication", "Feedback rounds", "Payments", "Deliverables", "Next steps"],
    finalQuestion: "What tone should it use?",
    finalOptions: ["Warm", "Premium", "Direct", "Detailed", "Friendly"],
    detailQuestion: "Add onboarding specifics",
    detailPlaceholder:
      "Example: Client is Acme Encore. Explain weekly Friday updates, feedback in one consolidated doc, invoices due in 15 days, final files via portal, kickoff call next Monday.",
    generating: "Drafting the welcome document...",
  },
};

const DETAIL_WORKFLOWS = new Set<OperationsWorkflow>(["contract", "welcome_document"]);

export function OperationalAiAgentWorkflow<TDraft extends OperationsDraft>({
  workflow,
  title,
  intro,
  clients = [],
  projects = [],
  selectedClientId,
  selectedProjectId,
  defaultHourlyRate,
  open,
  onOpenChange,
  onApplyDraft,
  applyLabel = "Use this draft",
}: OperationalAiAgentWorkflowProps<TDraft>) {
  const { profile } = useProfile();
  const [pending, startTransition] = React.useTransition();
  const [clientId, setClientId] = React.useState(selectedClientId ?? "");
  const [projectId, setProjectId] = React.useState(selectedProjectId ?? "");
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [customDetails, setCustomDetails] = React.useState("");
  const [draft, setDraft] = React.useState<TDraft | null>(null);
  const [provider, setProvider] = React.useState<"groq" | "local" | null>(null);
  const [introVisible, setIntroVisible] = React.useState(false);
  const [introTyping, setIntroTyping] = React.useState(false);
  const [visibleQuestions, setVisibleQuestions] = React.useState<number[]>([]);
  const [typingQuestion, setTypingQuestion] = React.useState<number | null>(null);
  const conversationRef = React.useRef<HTMLDivElement>(null);
  const config = WORKFLOW_OPTIONS[workflow];

  const projectOptions = React.useMemo(
    () => (clientId ? projects.filter((project) => project.clientId === clientId) : projects),
    [clientId, projects],
  );
  const selectedClient = clients.find((client) => client.id === clientId) ?? null;
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const acceptsDetails = DETAIL_WORKFLOWS.has(workflow);
  const canDraft = answers.length >= 3 && !pending;

  React.useEffect(() => {
    if (!open) return;
    setClientId(selectedClientId ?? "");
    setProjectId(selectedProjectId ?? "");
    setAnswers([]);
    setCustomDetails("");
    setDraft(null);
    setProvider(null);
    setIntroVisible(false);
    setIntroTyping(true);
    setVisibleQuestions([]);
    setTypingQuestion(null);
    const timer = window.setTimeout(() => {
      setIntroTyping(false);
      setIntroVisible(true);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [open, selectedClientId, selectedProjectId]);

  React.useEffect(() => {
    if (!open || !introVisible) return;
    const nextQuestion = answers.length;
    if (nextQuestion > 2 || visibleQuestions.includes(nextQuestion)) return;
    setTypingQuestion(nextQuestion);
    const timer = window.setTimeout(() => {
      setTypingQuestion(null);
      setVisibleQuestions((prev) =>
        prev.includes(nextQuestion) ? prev : [...prev, nextQuestion],
      );
    }, 560);
    return () => window.clearTimeout(timer);
  }, [answers.length, introVisible, open, visibleQuestions]);

  React.useEffect(() => {
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        const node = conversationRef.current;
        if (!node) return;
        node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
      });
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [
    answers,
    customDetails,
    draft,
    introTyping,
    introVisible,
    pending,
    typingQuestion,
    visibleQuestions,
  ]);

  const selectAnswer = (step: number, answer: string) => {
    setDraft(null);
    setAnswers((prev) => {
      const next = prev.slice(0, step);
      next[step] = answer;
      return next;
    });
  };

  const buildPrompt = () =>
    [
      selectedClient ? `Client: ${entityName(selectedClient)}` : "",
      selectedProject ? `Project: ${entityName(selectedProject)}` : "",
      ...answers,
      customDetails.trim() ? `Specific user details: ${customDetails.trim()}` : "",
    ]
      .filter(Boolean)
      .join(". ");

  const generateDraft = () => {
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        workflow,
        prompt: buildPrompt(),
        clientId,
        projectId,
        defaultHourlyRate,
      }),
    );
    startTransition(async () => {
      const result = await generateOperationalDraftAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft(result.data as TDraft);
      setProvider(result.provider);
    });
  };

  const applyDraft = () => {
    if (!draft) return;
    onApplyDraft(draft);
    toast.success("AI draft prepared");
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ opacity: 0, y: -10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.985 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-20 flex h-[calc(100vh-11rem)] min-h-[560px] max-h-[720px] w-full flex-col overflow-hidden rounded-xl border bg-background shadow-xl"
        >
          <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-primary shadow-sm">
                <Wand2 className="h-4 w-4" />
              </span>
              Stackivo AI
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="Close Stackivo AI"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <motion.div
            ref={conversationRef}
            className="scrollbar-modern flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.06),transparent_32rem)] px-5 py-5"
            layoutScroll
          >
            {introTyping && <TypingBubble />}
            {introVisible && (
              <AiBubble>
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block">
                  Hey {getDisplayName(profile) || "there"}, {intro}
                </span>
              </AiBubble>
            )}

            {(clients.length > 0 || projects.length > 0) && introVisible && (
              <ContextBubble
                clients={clients}
                projects={projectOptions}
                clientId={clientId}
                projectId={projectId}
                onClientChange={(value) => {
                  setClientId(value);
                  setProjectId("");
                  setDraft(null);
                }}
                onProjectChange={(value) => {
                  setProjectId(value);
                  setDraft(null);
                }}
              />
            )}

            {typingQuestion === 0 && <TypingBubble />}
            <QuestionBubble
              show={visibleQuestions.includes(0)}
              question={config.firstQuestion}
              options={config.firstOptions}
              value={answers[0]}
              onSelect={(answer) => selectAnswer(0, answer)}
            />
            {answers[0] && <UserBubble title="Direction">{answers[0]}</UserBubble>}

            {typingQuestion === 1 && <TypingBubble />}
            <QuestionBubble
              show={visibleQuestions.includes(1)}
              question={config.secondQuestion}
              options={config.secondOptions}
              value={answers[1]}
              onSelect={(answer) => selectAnswer(1, answer)}
            />
            {answers[1] && <UserBubble title="Context">{answers[1]}</UserBubble>}

            {typingQuestion === 2 && <TypingBubble />}
            <QuestionBubble
              show={visibleQuestions.includes(2)}
              question={config.finalQuestion}
              options={config.finalOptions}
              value={answers[2]}
              onSelect={(answer) => selectAnswer(2, answer)}
            />
            {answers[2] && <UserBubble title="Preference">{answers[2]}</UserBubble>}

            {answers.length >= 3 && acceptsDetails && !draft && (
              <AiBubble>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{config.detailQuestion}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This is where Groq helps most. Add scope, fees, timeline,
                      policies, tone, or anything the client should see.
                    </p>
                  </div>
                  <Textarea
                    value={customDetails}
                    onChange={(event) => {
                      setCustomDetails(event.target.value);
                      setDraft(null);
                    }}
                    placeholder={config.detailPlaceholder}
                    rows={5}
                    className="resize-none bg-background"
                  />
                </div>
              </AiBubble>
            )}

            {pending && (
              <AiBubble>
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {config.generating}
                </span>
              </AiBubble>
            )}

            {draft && (
              <AiBubble>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Draft ready
                  </div>
                  <DraftPreview draft={draft} />
                  <p className="text-xs text-muted-foreground">
                    Source: {provider === "groq" ? "Groq hosted model" : "local workflow fallback"}
                  </p>
                </div>
              </AiBubble>
            )}
          </motion.div>

          <div className="border-t bg-background/95 p-4 backdrop-blur">
            {draft ? (
              <Button type="button" className="h-11 w-full" onClick={applyDraft}>
                <Sparkles /> {applyLabel}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 w-full"
                disabled={!canDraft}
                onClick={generateDraft}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Generate {config.contextLabel} draft
              </Button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function AiWorkflowTriggerButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      className={cn(
        "hidden group relative isolate overflow-hidden border border-primary/30 bg-background text-primary shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary",
        active && "border-primary/60 bg-primary/5",
      )}
    >
      <span className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-blue-500 via-fuchsia-500 to-cyan-400 opacity-70 transition-opacity group-hover:opacity-100" />
      <span className="relative z-10 inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        {children}
      </span>
    </Button>
  );
}

function ContextBubble({
  clients,
  projects,
  clientId,
  projectId,
  onClientChange,
  onProjectChange,
}: {
  clients: EntityOption[];
  projects: EntityOption[];
  clientId: string;
  projectId: string;
  onClientChange: (value: string) => void;
  onProjectChange: (value: string) => void;
}) {
  return (
    <AiBubble>
      <div className="space-y-3">
        <p className="font-medium">I can use existing workspace context.</p>
        <div className="grid gap-2">
          {clients.length > 0 && (
            <select
              value={clientId}
              onChange={(event) => onClientChange(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/40 focus:ring-4 focus:ring-primary/15"
            >
              <option value="">No specific client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {entityName(client)}
                </option>
              ))}
            </select>
          )}
          {projects.length > 0 && (
            <select
              value={projectId}
              onChange={(event) => onProjectChange(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary/40 focus:ring-4 focus:ring-primary/15"
            >
              <option value="">No specific project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {entityName(project)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </AiBubble>
  );
}

function QuestionBubble({
  show,
  question,
  options,
  value,
  onSelect,
}: {
  show: boolean;
  question: string;
  options: string[];
  value?: string;
  onSelect: (answer: string) => void;
}) {
  if (!show) return null;
  return (
    <AiBubble>
      <p className="font-medium">{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </AiBubble>
  );
}

function DraftPreview({ draft }: { draft: OperationsDraft }) {
  if ("sections" in draft) {
    return (
      <div className="space-y-2">
        {"title" in draft && <p className="font-medium">{draft.title}</p>}
        {draft.sections.slice(0, 3).map((section, index) => (
          <div key={`${section.heading}-${index}`} className="rounded-md bg-muted/40 p-3">
            <p className="text-sm font-medium">{section.heading}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {section.body}
            </p>
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(draft)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md bg-muted/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {key.replace(/([A-Z])/g, " $1")}
          </p>
          <p className="mt-1 text-sm">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-primary shadow-sm">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="max-w-[88%] rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed shadow-sm">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-lg bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
          {title}
        </span>
        <span className="mt-1 block font-medium">{children}</span>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-primary shadow-sm">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="rounded-lg border bg-background px-4 py-3 shadow-sm">
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
  );
}

function entityName(entity: EntityOption) {
  return entity.name ?? entity.businessName ?? entity.fullName ?? "Untitled";
}
