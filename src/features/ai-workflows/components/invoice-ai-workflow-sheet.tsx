"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Send, Sparkles, Wand2 } from "lucide-react";
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
  const [draft, setDraft] = React.useState<AiInvoiceDraft | null>(null);
  const [provider, setProvider] = React.useState<"groq" | "local" | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setClientId(selectedClientId ?? "");
    setProjectId(selectedProjectId ?? "");
  }, [open, selectedClientId, selectedProjectId]);

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;
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
      setDraft(result.data);
      setProvider(result.provider);
    });
  };

  const applyDraft = () => {
    if (!draft) return;
    onApplyDraft({
      ...draft,
      clientId,
      projectId: projectId || undefined,
      dueDate: dueDate || undefined,
    });
    toast.success("AI draft applied to your invoice");
    setOpen(false);
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
            I can create the invoice draft for you. Tell me what was delivered,
            the amount, and any payment context. I&apos;ll turn it into editable
            line items and terms.
          </AssistantBubble>

          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Context
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
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

              <Select
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                  setDraft(null);
                }}
                disabled={!clientId || projectOptions.length === 0}
              >
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue
                    placeholder={
                      !clientId
                        ? "Project after client"
                        : projectOptions.length
                          ? "Project"
                          : "No project"
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
            </div>
            {selectedClient && (
              <p className="mt-2 text-xs text-muted-foreground">
                Working in context of {getClientDisplayName(selectedClient)}.
              </p>
            )}
          </div>

          {workDescription.trim() && (
            <UserBubble>{workDescription.trim()}</UserBubble>
          )}

          {pending && (
            <AssistantBubble>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking through the invoice structure...
              </span>
            </AssistantBubble>
          )}

          {draft && (
            <AssistantBubble>
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Draft ready
                </div>
                <div className="space-y-2 text-sm">
                  {draft.items.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="rounded-md bg-background p-3">
                      <p className="font-medium">{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Qty {item.quantity} · Rate {item.rate}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Source: {provider === "groq" ? "Groq hosted model" : "local workflow fallback"}
                </p>
                <Button type="button" className="w-full" onClick={applyDraft}>
                  <Sparkles /> Apply to invoice
                </Button>
              </div>
            </AssistantBubble>
          )}
        </div>

        <div className="border-t bg-background/95 p-4 backdrop-blur">
          <div className="rounded-lg border bg-background p-3 shadow-sm">
            <Textarea
              rows={4}
              value={workDescription}
              onChange={(event) => {
                setWorkDescription(event.target.value);
                setDraft(null);
              }}
              placeholder="Message Stackivo AI... e.g. Invoice Acme 50000 for landing page design, responsive build, and launch support. Due next Friday."
              className="min-h-[96px] resize-none border-0 p-0 shadow-none focus-visible:ring-0"
            />
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Add precise billing details
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Amount"
                />
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
              <Textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes or payment terms"
                className="mt-2 resize-none"
              />
            </details>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={pending || !clientId || workDescription.trim().length < 8}
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
