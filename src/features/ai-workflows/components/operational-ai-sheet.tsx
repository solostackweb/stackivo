"use client";

import * as React from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
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
  SheetDescription,
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
      onApplyDraft(result.data as TDraft);
      toast.success(
        result.provider === "groq"
          ? "AI draft applied"
          : "Draft applied with local workflow defaults",
      );
      setOpen(false);
    });
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
      <SheetContent side="right" className="w-[min(34rem,calc(100vw-1rem))] sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            {title}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-6">
          {clients.length > 0 && (
            <WorkflowField label="Client">
              <Select
                value={clientId}
                onValueChange={(value) => {
                  setClientId(value);
                  setProjectId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WorkflowField>
          )}

          {projects.length > 0 && (
            <WorkflowField label="Project">
              <Select
                value={projectId}
                onValueChange={setProjectId}
                disabled={projectOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Attach to a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </WorkflowField>
          )}

          <WorkflowField label="Brief">
            <Textarea
              rows={7}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={placeholder}
              className="resize-none"
            />
          </WorkflowField>
        </div>

        <div className="sticky bottom-0 border-t bg-background/95 p-4 backdrop-blur">
          <Button
            type="button"
            className="w-full"
            disabled={pending || prompt.trim().length < 4}
            onClick={submit}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Draft workflow
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WorkflowField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
