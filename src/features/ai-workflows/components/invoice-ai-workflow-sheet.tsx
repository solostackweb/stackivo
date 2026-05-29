"use client";

import * as React from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getClientDisplayName, getClientInitials } from "@/features/clients/utils";
import type { ClientRecord } from "@/features/clients/server";
import type { ProjectRecord } from "@/features/projects/server";
import { generateInvoiceDraftAction } from "@/features/ai-workflows/actions";
import type { AiInvoiceDraft } from "@/features/ai-workflows/types";
import { cn } from "@/lib/utils";

interface InvoiceAiWorkflowSheetProps {
  clients: ClientRecord[];
  projects: ProjectRecord[];
  selectedClientId?: string;
  selectedProjectId?: string;
  compactTrigger?: boolean;
  triggerClassName?: string;
  onApplyDraft: (
    draft: AiInvoiceDraft & {
      clientId: string;
      projectId?: string;
      dueDate?: string;
    },
  ) => void;
}

export function InvoiceAiWorkflowSheet({
  clients,
  projects,
  selectedClientId,
  selectedProjectId,
  compactTrigger,
  triggerClassName,
  onApplyDraft,
}: InvoiceAiWorkflowSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [clientId, setClientId] = React.useState(selectedClientId ?? "");
  const [projectId, setProjectId] = React.useState(selectedProjectId ?? "");
  const [workDescription, setWorkDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setClientId(selectedClientId ?? "");
    setProjectId(selectedProjectId ?? "");
  }, [open, selectedClientId, selectedProjectId]);

  const projectOptions = React.useMemo(
    () => projects.filter((project) => project.clientId === clientId),
    [clientId, projects],
  );

  const submit = () => {
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        clientId,
        projectId,
        workDescription,
        amount: amount ? Number(amount) : undefined,
        quantity: quantity ? Number(quantity) : undefined,
        dueDate,
        notes,
      }),
    );

    startTransition(async () => {
      const result = await generateInvoiceDraftAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onApplyDraft({
        ...result.data,
        clientId,
        projectId: projectId || undefined,
        dueDate: dueDate || undefined,
      });
      toast.success(
        result.provider === "groq"
          ? "AI draft applied to your invoice"
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
          size="sm"
          variant="outline"
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
            Let&apos;s create your invoice
          </SheetTitle>
          <SheetDescription>
            Stackivo AI will draft line items, notes, and terms. You review before
            creating or sending.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-6">
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
                {clients.map((client) => {
                  const name = getClientDisplayName(client);
                  return (
                    <SelectItem key={client.id} value={client.id}>
                      <span className="inline-flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {getClientInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{name}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </WorkflowField>

          <WorkflowField label="Project">
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={!clientId || projectOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !clientId
                      ? "Choose a client first"
                      : projectOptions.length
                        ? "Attach to a project"
                        : "No projects for this client"
                  }
                />
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

          <WorkflowField label="Describe work">
            <Textarea
              rows={5}
              value={workDescription}
              onChange={(event) => setWorkDescription(event.target.value)}
              placeholder="Example: Website landing page design, mobile responsive build, and launch support"
              className="resize-none"
            />
          </WorkflowField>

          <div className="grid gap-4 sm:grid-cols-2">
            <WorkflowField label="Quantity">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </WorkflowField>
            <WorkflowField label="Amount">
              <Input
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="50000"
              />
            </WorkflowField>
          </div>

          <WorkflowField label="Due date">
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </WorkflowField>

          <WorkflowField label="Notes">
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional payment context or client-specific instructions"
              className="resize-none"
            />
          </WorkflowField>
        </div>

        <div className="sticky bottom-0 border-t bg-background/95 p-4 backdrop-blur">
          <Button
            type="button"
            className="w-full"
            disabled={pending || !clientId || workDescription.trim().length < 8}
            onClick={submit}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Draft invoice
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
