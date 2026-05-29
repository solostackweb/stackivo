"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import type { ProjectRecord } from "../server";
import {
  createProjectAction,
  updateProjectAction,
  type ActionResult,
} from "../actions";
import type { ProjectStatusRow } from "@/lib/supabase/types";
import { OperationalAiSheet } from "@/features/ai-workflows/components/operational-ai-sheet";
import type { AiProjectDraft } from "@/features/ai-workflows/types";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill when editing. Omit to create. */
  project?: ProjectRecord;
  clients: Array<{ id: string; name: string }>;
}

type ProjectFormResult = ActionResult<{ id: string }>;

const NO_CLIENT = "__none__";

/**
 * Create / edit project dialog. Submits through the real server actions and
 * `router.refresh()`es so the list + detail views re-hydrate.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  clients,
}: ProjectFormDialogProps) {
  const router = useRouter();
  const isEdit = !!project;
  const [pending, startTransition] = React.useTransition();
  const [state, setState] = React.useState<ProjectFormResult | undefined>();
  // Status is captured implicitly: edits keep the project's current status
  // (the chip handles transitions live); new projects start at "planning".
  const initialStatus: ProjectStatusRow = project?.status ?? "planning";
  const [clientId, setClientId] = React.useState<string>(
    project?.clientId ?? NO_CLIENT,
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (open) {
      setState(undefined);
      setClientId(project?.clientId ?? NO_CLIENT);
    }
  }, [open, project]);

  const errs = state && !state.ok ? state.fieldErrors : undefined;

  const handleSubmit = (formData: FormData) => {
    formData.set("status", initialStatus);
    if (clientId !== NO_CLIENT) formData.set("clientId", clientId);
    else formData.set("clientId", "");
    if (isEdit) formData.set("id", project.id);

    startTransition(async () => {
      const res = isEdit
        ? await updateProjectAction(undefined, formData)
        : await createProjectAction(undefined, formData);
      setState(res);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? (isEdit ? "Project updated" : "Project created"));
      onOpenChange(false);
      router.refresh();
    });
  };

  const applyAiDraft = React.useCallback((draft: AiProjectDraft) => {
    const form = formRef.current;
    if (!form) return;
    const setField = (name: string, value: string | null | undefined) => {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.value = value ?? "";
      }
    };
    setField("name", draft.name);
    setField("description", draft.description);
    setField("startDate", draft.startDate);
    setField("dueDate", draft.dueDate);
    setClientId(draft.clientId || NO_CLIENT);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>
                {isEdit ? "Edit project" : "Create a project"}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update the core details for this project."
                  : "Group related invoices, contracts, and files under one project."}
              </DialogDescription>
            </div>
            {!isEdit && (
              <OperationalAiSheet<AiProjectDraft>
                workflow="project"
                title="Let's create your project"
                description="Describe the project and Stackivo AI will draft the core fields."
                placeholder="Example: Brand identity sprint for Acme, starts next week, due by end of month, includes logo, colors, and handoff files"
                clients={clients}
                selectedClientId={clientId === NO_CLIENT ? "" : clientId}
                onApplyDraft={applyAiDraft}
              />
            )}
          </div>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {state && !state.ok && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {state.error}
            </p>
          )}

          <Field label="Project name" required error={errs?.name?.[0]}>
            <Input
              name="name"
              defaultValue={project?.name ?? ""}
              required
              placeholder="Website redesign"
              autoFocus
            />
          </Field>

          <Field label="Description" error={errs?.description?.[0]}>
            <Textarea
              name="description"
              rows={2}
              className="resize-none"
              defaultValue={project?.description ?? ""}
              placeholder="What's this project about?"
            />
          </Field>

          <Field label="Client" error={errs?.clientId?.[0]}>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CLIENT}>No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isEdit && (
            <p className="rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              Status is changed inline from the project header.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" error={errs?.startDate?.[0]}>
              <Input
                type="date"
                name="startDate"
                defaultValue={project?.startDate ?? ""}
              />
            </Field>
            <Field label="Due date" error={errs?.dueDate?.[0]}>
              <Input
                type="date"
                name="dueDate"
                defaultValue={project?.dueDate ?? ""}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
