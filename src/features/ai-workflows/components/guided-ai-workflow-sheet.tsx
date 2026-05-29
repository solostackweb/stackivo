"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  generateInvoiceDraftAction,
  generateOperationalDraftAction,
} from "@/features/ai-workflows/actions";
import type {
  AiClientDraft,
  AiContractDraft,
  AiInvoiceDraft,
  AiPortalDraft,
  AiProjectDraft,
  AiTimeEntryDraft,
  AiWelcomeDraft,
} from "@/features/ai-workflows/types";
import type {
  OperationsDraft,
  OperationsWorkflow,
} from "@/features/ai-workflows/operations-workflow";

type GuidedWorkflow = "invoice" | OperationsWorkflow;
type GuidedDraft =
  | AiInvoiceDraft
  | OperationsDraft
  | AiClientDraft
  | AiProjectDraft
  | AiPortalDraft
  | AiTimeEntryDraft
  | AiContractDraft
  | AiWelcomeDraft;

interface EntityOption {
  id: string;
  name?: string;
  fullName?: string;
  businessName?: string | null;
  clientId?: string | null;
}

interface GuidedAiWorkflowSheetProps<TDraft extends GuidedDraft> {
  workflow: GuidedWorkflow;
  title: string;
  description: string;
  placeholder?: string;
  clients?: EntityOption[];
  projects?: EntityOption[];
  selectedClientId?: string;
  selectedProjectId?: string;
  defaultHourlyRate?: number;
  compactTrigger?: boolean;
  triggerClassName?: string;
  onApplyDraft: (draft: TDraft) => void;
}

const WORKFLOW_OPTIONS: Record<
  GuidedWorkflow,
  {
    firstQuestion: string;
    firstOptions: string[];
    secondQuestion: string;
    secondOptions: string[];
    finalQuestion: string;
    finalOptions: string[];
  }
> = {
  invoice: {
    firstQuestion: "What did you deliver?",
    firstOptions: [
      "Landing page",
      "Website build",
      "Design sprint",
      "Development work",
      "Consulting session",
      "Monthly retainer",
    ],
    secondQuestion: "What should I bill?",
    secondOptions: ["10000", "25000", "50000", "75000", "100000", "150000"],
    finalQuestion: "When should it be due?",
    finalOptions: ["7 days", "14 days", "30 days", "End of month"],
  },
  client: {
    firstQuestion: "What kind of client is this?",
    firstOptions: ["Startup", "Agency", "Consultant", "Local business", "Enterprise", "Creator"],
    secondQuestion: "What should I remember?",
    secondOptions: ["Fast payer", "Needs GST billing", "Prefers email", "Has multiple contacts", "Retainer client"],
    finalQuestion: "What tone should the notes use?",
    finalOptions: ["Concise", "Relationship-focused", "Finance-ready", "Operational"],
  },
  project: {
    firstQuestion: "What type of project is this?",
    firstOptions: ["Website redesign", "Brand identity", "Marketing campaign", "App development", "Consulting engagement"],
    secondQuestion: "What pace are we working at?",
    secondOptions: ["One week sprint", "Two week sprint", "One month project", "Ongoing retainer"],
    finalQuestion: "What status should this imply?",
    finalOptions: ["Planning", "Kickoff ready", "Active work", "Needs client input"],
  },
  portal: {
    firstQuestion: "What kind of portal should this be?",
    firstOptions: ["Project workspace", "Retainer hub", "File delivery room", "Approval center", "Client dashboard"],
    secondQuestion: "What feel should it have?",
    secondOptions: ["Clean blue", "Premium dark", "Friendly green", "Neutral studio", "Minimal"],
    finalQuestion: "What should it emphasize?",
    finalOptions: ["Files", "Invoices", "Contracts", "Updates", "All work"],
  },
  time_entry: {
    firstQuestion: "What did you work on?",
    firstOptions: ["Design revisions", "Development", "Client call", "Planning", "QA review", "Content updates"],
    secondQuestion: "How long did it take?",
    secondOptions: ["30 minutes", "1 hour", "2 hours", "3 hours", "Half day"],
    finalQuestion: "How should it be billed?",
    finalOptions: ["Billable", "Non-billable", "Use default rate", "Internal work"],
  },
  contract: {
    firstQuestion: "What agreement are we drafting?",
    firstOptions: ["Service agreement", "Project proposal", "Retainer agreement", "NDA", "Scope change", "Maintenance contract"],
    secondQuestion: "What commercial model fits?",
    secondOptions: ["Fixed fee", "Hourly", "Monthly retainer", "Milestone payments", "50% upfront"],
    finalQuestion: "What clauses matter most?",
    finalOptions: ["Scope control", "Payment terms", "Revision limits", "IP ownership", "Confidentiality"],
  },
  welcome_document: {
    firstQuestion: "Who is this welcome document for?",
    firstOptions: ["New design client", "New development client", "Retainer client", "Consulting client", "Agency client"],
    secondQuestion: "What should it explain?",
    secondOptions: ["Process", "Communication", "Feedback rounds", "Payments", "Deliverables", "Next steps"],
    finalQuestion: "What tone should it use?",
    finalOptions: ["Warm", "Premium", "Direct", "Detailed", "Friendly"],
  },
};

export function GuidedAiWorkflowSheet<TDraft extends GuidedDraft>({
  workflow,
  title,
  description,
  clients = [],
  projects = [],
  selectedClientId,
  selectedProjectId,
  defaultHourlyRate,
  compactTrigger,
  triggerClassName,
  onApplyDraft,
}: GuidedAiWorkflowSheetProps<TDraft>) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [clientId, setClientId] = React.useState(selectedClientId ?? "");
  const [projectId, setProjectId] = React.useState(selectedProjectId ?? "");
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [draft, setDraft] = React.useState<GuidedDraft | null>(null);
  const [provider, setProvider] = React.useState<"groq" | "local" | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setClientId(selectedClientId ?? "");
    setProjectId(selectedProjectId ?? "");
  }, [open, selectedClientId, selectedProjectId]);

  const config = WORKFLOW_OPTIONS[workflow];
  const projectOptions = React.useMemo(
    () =>
      clientId
        ? projects.filter((project) => project.clientId === clientId)
        : projects,
    [clientId, projects],
  );
  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedProject = projects.find((project) => project.id === projectId);
  const canDraft =
    answers.length >= 3 && (workflow !== "invoice" || clientId.length > 0);

  const selectAnswer = (step: number, answer: string) => {
    setDraft(null);
    setAnswers((prev) => {
      const next = prev.slice(0, step);
      next[step] = answer;
      return next;
    });
  };

  const buildPrompt = () => {
    const context = [
      selectedClient ? `Client: ${entityName(selectedClient)}` : "",
      selectedProject ? `Project: ${entityName(selectedProject)}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    return [context, ...answers].filter(Boolean).join(". ");
  };

  const dueDateFromAnswer = () => {
    const answer = answers[2];
    const date = new Date();
    if (answer === "7 days") date.setDate(date.getDate() + 7);
    else if (answer === "14 days") date.setDate(date.getDate() + 14);
    else if (answer === "30 days") date.setDate(date.getDate() + 30);
    else if (answer === "End of month") date.setMonth(date.getMonth() + 1, 0);
    else return "";
    return date.toISOString().slice(0, 10);
  };

  const generateDraft = () => {
    const prompt = buildPrompt();
    const fd = new FormData();
    const amount = Number(answers[1]) || undefined;

    fd.set(
      "payload",
      JSON.stringify(
        workflow === "invoice"
          ? {
              clientId,
              projectId,
              workDescription: prompt,
              amount,
              quantity: 1,
              dueDate: dueDateFromAnswer(),
              notes: "",
            }
          : {
              workflow,
              prompt,
              clientId,
              projectId,
              defaultHourlyRate,
            },
      ),
    );

    startTransition(async () => {
      const result =
        workflow === "invoice"
          ? await generateInvoiceDraftAction(fd)
          : await generateOperationalDraftAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft(result.data);
      setProvider(result.provider);
    });
  };

  const applyDraft = () => {
    if (!draft) return;
    if (workflow === "invoice") {
      onApplyDraft({
        ...(draft as AiInvoiceDraft),
        clientId,
        projectId: projectId || undefined,
        dueDate: dueDateFromAnswer() || undefined,
      } as unknown as TDraft);
    } else {
      onApplyDraft(draft as TDraft);
    }
    toast.success("AI draft applied");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(triggerClassName, compactTrigger && "px-0")}
          aria-label={compactTrigger ? "Generate with AI" : undefined}
        >
          <Sparkles />
          {compactTrigger ? (
            <span className="sr-only">Generate with AI</span>
          ) : (
            "Generate with AI"
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[min(38rem,calc(100vw-1rem))] flex-col overflow-hidden bg-background p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Wand2 className="h-4 w-4" />
            </span>
            Stackivo AI
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <AssistantBubble>
            <span className="block font-medium">{title}</span>
            <span className="mt-1 block text-muted-foreground">{description}</span>
          </AssistantBubble>

          {(clients.length > 0 || projects.length > 0) && (
            <ContextPicker
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

          <QuestionBubble
            question={config.firstQuestion}
            options={config.firstOptions}
            value={answers[0]}
            onSelect={(answer) => selectAnswer(0, answer)}
          />
          {answers[0] && (
            <QuestionBubble
              question={config.secondQuestion}
              options={config.secondOptions}
              value={answers[1]}
              onSelect={(answer) => selectAnswer(1, answer)}
            />
          )}
          {answers[1] && (
            <QuestionBubble
              question={config.finalQuestion}
              options={config.finalOptions}
              value={answers[2]}
              onSelect={(answer) => selectAnswer(2, answer)}
            />
          )}

          {answers.length >= 3 && (
            <UserBubble>
              {answers.join(" · ")}
              {selectedClient ? ` · ${entityName(selectedClient)}` : ""}
            </UserBubble>
          )}

          {pending && (
            <AssistantBubble>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Building the draft from your choices...
              </span>
            </AssistantBubble>
          )}

          {draft && (
            <AssistantBubble>
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Draft ready for review
                </div>
                <DraftPreview draft={draft} />
                <p className="text-xs text-muted-foreground">
                  Source: {provider === "groq" ? "Groq hosted model" : "local workflow fallback"}
                </p>
                <Button type="button" className="w-full" onClick={applyDraft}>
                  <Sparkles /> Apply draft
                </Button>
              </div>
            </AssistantBubble>
          )}
        </div>

        <div className="border-t bg-background/95 p-4 backdrop-blur">
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!canDraft || pending}
            onClick={generateDraft}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate draft from choices
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ContextPicker({
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
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Context
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {clients.length > 0 && (
          <Select value={clientId} onValueChange={onClientChange}>
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {entityName(client)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={projectId}
          onValueChange={onProjectChange}
          disabled={projects.length === 0}
        >
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder={projects.length ? "Project" : "Project after client"} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {entityName(project)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function QuestionBubble({
  question,
  options,
  value,
  onSelect,
}: {
  question: string;
  options: string[];
  value?: string;
  onSelect: (answer: string) => void;
}) {
  return (
    <AssistantBubble>
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
    </AssistantBubble>
  );
}

function entityName(entity: EntityOption) {
  return entity.name ?? entity.businessName ?? entity.fullName ?? "Untitled";
}

function DraftPreview({ draft }: { draft: GuidedDraft }) {
  if ("items" in draft) {
    return (
      <div className="space-y-2">
        {draft.items.map((item, index) => (
          <div key={`${item.description}-${index}`} className="rounded-md bg-background p-3">
            <p className="text-sm font-medium">{item.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Qty {item.quantity} · Rate {item.rate}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if ("sections" in draft) {
    return (
      <div className="space-y-2">
        {"title" in draft && <p className="font-medium">{draft.title}</p>}
        {draft.sections.slice(0, 4).map((section, index) => (
          <div key={`${section.heading}-${index}`} className="rounded-md bg-background p-3">
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
    .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== "")
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {entries.map(([key, entryValue]) => (
        <div key={key} className="rounded-md bg-background p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {key.replace(/([A-Z])/g, " $1")}
          </p>
          <p className="mt-1 text-sm">{String(entryValue)}</p>
        </div>
      ))}
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="max-w-[88%] rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed shadow-sm">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-lg bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
        {children}
      </div>
    </div>
  );
}
