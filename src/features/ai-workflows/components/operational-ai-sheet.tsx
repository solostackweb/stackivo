"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { generateOperationalDraftAction } from "@/features/ai-workflows/actions";
import type {
  AiClientDraft,
  AiContractDraft,
  AiPortalDraft,
  AiProjectDraft,
  AiTimeEntryDraft,
  AiWelcomeDraft,
} from "@/features/ai-workflows/types";
import type { OperationsDraft, OperationsWorkflow } from "../operations-workflow";

export type OperationalAiDraft =
  | AiClientDraft
  | AiProjectDraft
  | AiPortalDraft
  | AiTimeEntryDraft
  | AiContractDraft
  | AiWelcomeDraft;

interface EntityOption {
  id: string;
  name: string;
  clientId?: string | null;
}

interface OperationalAiSheetProps<TDraft extends OperationsDraft> {
  workflow: OperationsWorkflow;
  title: string;
  description: string;
  placeholder: string;
  clients?: EntityOption[];
  projects?: EntityOption[];
  selectedClientId?: string;
  selectedProjectId?: string;
  defaultHourlyRate?: number;
  compactTrigger?: boolean;
  triggerClassName?: string;
  onApplyDraft: (draft: TDraft) => void;
}

export function OperationalAiSheet<TDraft extends OperationsDraft>({
  workflow,
  title,
  description,
  placeholder,
  clients = [],
  projects = [],
  selectedClientId,
  selectedProjectId,
  defaultHourlyRate,
  compactTrigger,
  triggerClassName,
  onApplyDraft,
}: OperationalAiSheetProps<TDraft>) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [prompt, setPrompt] = React.useState("");
  const [clientId, setClientId] = React.useState(selectedClientId ?? "");
  const [projectId, setProjectId] = React.useState(selectedProjectId ?? "");
  const [draft, setDraft] = React.useState<OperationsDraft | null>(null);
  const [provider, setProvider] = React.useState<"groq" | "local" | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setClientId(selectedClientId ?? "");
    setProjectId(selectedProjectId ?? "");
  }, [open, selectedClientId, selectedProjectId]);

  const projectOptions = React.useMemo(
    () =>
      clientId
        ? projects.filter((project) => project.clientId === clientId)
        : projects,
    [clientId, projects],
  );

  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedProject = projects.find((project) => project.id === projectId);

  const submit = () => {
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        workflow,
        prompt,
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
      setDraft(result.data);
      setProvider(result.provider);
    });
  };

  const applyDraft = () => {
    if (!draft) return;
    onApplyDraft(draft as TDraft);
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
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Working context
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {clients.length > 0 && (
                  <Select
                    value={clientId}
                    onValueChange={(value) => {
                      setClientId(value);
                      setProjectId("");
                      setDraft(null);
                    }}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {projects.length > 0 && (
                  <Select
                    value={projectId}
                    onValueChange={(value) => {
                      setProjectId(value);
                      setDraft(null);
                    }}
                    disabled={projectOptions.length === 0}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectOptions.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {(selectedClient || selectedProject) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedClient ? `Client: ${selectedClient.name}` : ""}
                  {selectedClient && selectedProject ? " · " : ""}
                  {selectedProject ? `Project: ${selectedProject.name}` : ""}
                </p>
              )}
            </div>
          )}

          {prompt.trim() && <UserBubble>{prompt.trim()}</UserBubble>}

          {pending && (
            <AssistantBubble>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking through the workflow...
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
          <div className="rounded-lg border bg-background p-3 shadow-sm">
            <Textarea
              rows={5}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setDraft(null);
              }}
              placeholder={placeholder}
              className="min-h-[120px] resize-none border-0 p-0 shadow-none focus-visible:ring-0"
            />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={pending || prompt.trim().length < 4}
                onClick={submit}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Send />}
                Ask AI
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DraftPreview({ draft }: { draft: OperationsDraft }) {
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
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md bg-background p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {key.replace(/([A-Z])/g, " $1")}
          </p>
          <p className="mt-1 text-sm">{String(value)}</p>
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
