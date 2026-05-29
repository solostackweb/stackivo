"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Mail, Send, Smartphone, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import type { ClientRecord } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";
import type { ProjectRecord } from "@/features/projects/server";
import { createInvoiceAction } from "../actions";
import { sendInvoiceAction } from "../delivery";
import { generateInvoiceDraftAction } from "@/features/ai-workflows/actions";
import { ensureInvoicePublicTokenAction } from "@/features/share/actions";
import { buildWaUrl } from "@/lib/whatsapp";
import { useProfile } from "@/features/profile/context";
import { getDisplayName } from "@/features/profile/utils";

interface InvoiceAiAgentWorkflowProps {
  clients: ClientRecord[];
  projects: ProjectRecord[];
  nextInvoiceNumber: string;
}

type Step =
  | "client"
  | "project"
  | "work"
  | "due"
  | "amount"
  | "discount"
  | "notes"
  | "creating"
  | "ready";

interface CreatedInvoice {
  id: string;
  number: string;
  total: number;
  publicUrl: string;
}

const dueOptions = [
  { label: "7 days", days: 7 },
  { label: "15 days", days: 15 },
  { label: "30 days", days: 30 },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function InvoiceAiAgentWorkflow({
  clients,
  projects,
  nextInvoiceNumber,
}: InvoiceAiAgentWorkflowProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [step, setStep] = React.useState<Step>("client");
  const [clientId, setClientId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [work, setWork] = React.useState("");
  const [dueDate, setDueDate] = React.useState(addDays(15));
  const [quantity, setQuantity] = React.useState(1);
  const [rate, setRate] = React.useState(0);
  const [discount, setDiscount] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [created, setCreated] = React.useState<CreatedInvoice | null>(null);
  const [emailSent, setEmailSent] = React.useState(false);

  const client = clients.find((item) => item.id === clientId) ?? null;
  const projectOptions = React.useMemo(
    () => projects.filter((project) => project.clientId === clientId),
    [clientId, projects],
  );
  const project = projects.find((item) => item.id === projectId) ?? null;
  const subtotal = Math.max(0, quantity * rate);
  const effectiveTotal = Math.max(0, subtotal - discount);
  const senderName = getDisplayName(profile) || profile?.businessName || "Stackivo";

  const reset = React.useCallback(() => {
    setStep("client");
    setClientId("");
    setProjectId("");
    setWork("");
    setDueDate(addDays(profile?.invoiceDefaultDueDays ?? 15));
    setQuantity(1);
    setRate(0);
    setDiscount(0);
    setNotes("");
    setCreated(null);
    setEmailSent(false);
  }, [profile?.invoiceDefaultDueDays]);

  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const createInvoice = () => {
    if (!clientId || !work.trim() || rate <= 0) return;
    setStep("creating");
    const finalRate = quantity > 0 ? Math.max(0, effectiveTotal / quantity) : 0;
    const discountNote =
      discount > 0
        ? `Discount applied: ${profile?.defaultCurrency ?? "INR"} ${discount.toLocaleString("en-IN")}.`
        : "";
    startTransition(async () => {
      const aiFd = new FormData();
      aiFd.set(
        "payload",
        JSON.stringify({
          clientId,
          projectId,
          workDescription: work.trim(),
          amount: rate,
          quantity,
          dueDate,
          notes,
        }),
      );
      const aiDraft = await generateInvoiceDraftAction(aiFd);
      const aiLine = aiDraft.ok ? aiDraft.data.items[0] : null;
      const aiNotes = aiDraft.ok ? aiDraft.data.notes : "";
      const aiTerms = aiDraft.ok ? aiDraft.data.terms : "";
      const payload = {
        clientId,
        projectId: projectId || undefined,
        invoiceNumber: nextInvoiceNumber,
        issueDate: todayIso(),
        dueDate,
        currency: profile?.defaultCurrency ?? "INR",
        status: "draft",
        notes:
          [notes.trim(), aiNotes, discountNote]
            .filter(Boolean)
            .join("\n\n") || undefined,
        terms: aiTerms || profile?.invoiceDefaultTerms || undefined,
        lines: [
          {
            description: aiLine?.description || work.trim(),
            quantity,
            unitPrice: finalRate,
            gstRate: profile?.gstRegistered ? profile.invoiceDefaultGstRate : 0,
            position: 0,
          },
        ],
      };
      const fd = new FormData();
      fd.set("payload", JSON.stringify(payload));

      const res = await createInvoiceAction(undefined, fd);
      if (!res.ok || !res.data?.id) {
        toast.error(res.ok ? "Could not create invoice." : res.error);
        setStep("notes");
        return;
      }
      const tokenRes = await ensureInvoicePublicTokenAction({ invoiceId: res.data.id });
      const publicUrl =
        tokenRes.ok && tokenRes.data?.token
          ? `${window.location.origin}/i/${tokenRes.data.token}`
          : `${window.location.origin}/dashboard/invoices/${res.data.id}`;
      setCreated({
        id: res.data.id,
        number: nextInvoiceNumber,
        total: effectiveTotal,
        publicUrl,
      });
      setStep("ready");
      router.refresh();
    });
  };

  const sendEmail = React.useCallback(async () => {
    if (!created) return false;
    const res = await sendInvoiceAction({ invoiceId: created.id });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setEmailSent(true);
    toast.success("Invoice emailed to client");
    router.refresh();
    return true;
  }, [created, router]);

  const openWhatsApp = React.useCallback(() => {
    if (!created) return;
    const url = buildWaUrl({
      phone: client?.phone,
      clientName: client ? getClientDisplayName(client) : null,
      documentType: "invoice",
      documentNumber: created.number,
      amount: created.total,
      currency: profile?.defaultCurrency ?? "INR",
      senderName,
      shareUrl: created.publicUrl,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }, [client, created, profile?.defaultCurrency, senderName]);

  const sendBoth = React.useCallback(() => {
    startTransition(async () => {
      const ok = emailSent || (await sendEmail());
      if (ok) openWhatsApp();
    });
  }, [emailSent, openWhatsApp, sendEmail, startTransition]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Sparkles /> Generate with AI
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[min(42rem,calc(100vw-1rem))] flex-col overflow-hidden bg-background p-0 sm:max-w-2xl"
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
          <AiBubble>
            Hey {getDisplayName(profile) || "there"}, let&apos;s create a new
            invoice. I&apos;ll collect the details, generate the invoice, then help
            you send it by email or WhatsApp.
          </AiBubble>

          <AiQuestion show={true} title="Choose a client">
            <Select
              value={clientId}
              onValueChange={(value) => {
                setClientId(value);
                setProjectId("");
                setStep("project");
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {getClientDisplayName(item)}
                    {item.email ? ` · ${item.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AiQuestion>

          <AiQuestion show={step !== "client"} title="Choose a project">
            <Select
              value={projectId}
              onValueChange={(value) => {
                setProjectId(value);
                setStep("work");
              }}
              disabled={!clientId}
            >
              <SelectTrigger className="bg-background">
                <SelectValue
                  placeholder={
                    projectOptions.length ? "Select a project" : "No project for this client"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep("work")}
              className="mt-2"
            >
              Skip project
            </Button>
          </AiQuestion>

          <AiQuestion show={["work", "due", "amount", "discount", "notes", "creating", "ready"].includes(step)} title="Describe the work">
            <Textarea
              value={work}
              onChange={(event) => setWork(event.target.value)}
              placeholder="Example: Landing page design, responsive build, and launch support"
              className="resize-none"
              rows={3}
            />
            <Button
              type="button"
              size="sm"
              className="mt-2"
              disabled={work.trim().length < 4}
              onClick={() => setStep("due")}
            >
              Continue
            </Button>
          </AiQuestion>

          <AiQuestion show={["due", "amount", "discount", "notes", "creating", "ready"].includes(step)} title="Choose due date">
            <div className="flex flex-wrap gap-2">
              {dueOptions.map((option) => (
                <Choice
                  key={option.label}
                  selected={dueDate === addDays(option.days)}
                  onClick={() => {
                    setDueDate(addDays(option.days));
                    setStep("amount");
                  }}
                >
                  {option.label}
                </Choice>
              ))}
            </div>
            <Input
              type="date"
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value);
                setStep("amount");
              }}
              className="mt-3"
            />
          </AiQuestion>

          <AiQuestion show={["amount", "discount", "notes", "creating", "ready"].includes(step)} title="Quantity and rate">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(Math.max(0, Number(event.target.value) || 0))}
                placeholder="Quantity"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={rate || ""}
                onChange={(event) => setRate(Math.max(0, Number(event.target.value) || 0))}
                placeholder="Rate"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              disabled={quantity <= 0 || rate <= 0}
              onClick={() => setStep("discount")}
            >
              Continue
            </Button>
          </AiQuestion>

          <AiQuestion show={["discount", "notes", "creating", "ready"].includes(step)} title="Any discount?">
            <Input
              type="number"
              min="0"
              step="1"
              value={discount || ""}
              onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))}
              placeholder="0"
            />
            <Button type="button" size="sm" className="mt-2" onClick={() => setStep("notes")}>
              Continue
            </Button>
          </AiQuestion>

          <AiQuestion show={["notes", "creating", "ready"].includes(step)} title="Any extra notes or payment terms?">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={profile?.invoiceDefaultTerms ?? "Optional notes for the client"}
              className="resize-none"
              rows={3}
            />
            <Button
              type="button"
              size="sm"
              className="mt-2"
              disabled={pending}
              onClick={createInvoice}
            >
              {pending || step === "creating" ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Generate invoice
            </Button>
          </AiQuestion>

          {step === "creating" && (
            <AiBubble>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating the invoice, assigning the number, and preparing the share link...
              </span>
            </AiBubble>
          )}

          {created && (
            <AiBubble>
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Invoice created
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="font-medium">{created.number}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {client ? getClientDisplayName(client) : "Client"} {project ? `· ${project.name}` : ""}
                  </p>
                  <p className="mt-2 text-sm">
                    {(profile?.defaultCurrency ?? "INR")} {created.total.toLocaleString("en-IN")}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  How should I send it?
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || emailSent}
                    onClick={() => startTransition(() => void sendEmail())}
                  >
                    <Mail /> {emailSent ? "Emailed" : "Email"}
                  </Button>
                  <Button type="button" variant="outline" onClick={openWhatsApp}>
                    <Smartphone /> WhatsApp
                  </Button>
                  <Button type="button" disabled={pending} onClick={sendBoth}>
                    <Send /> Both
                  </Button>
                </div>
              </div>
            </AiBubble>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AiQuestion({
  show,
  title,
  children,
}: {
  show: boolean;
  title: string;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <AiBubble>
      <p className="mb-3 font-medium">{title}</p>
      {children}
    </AiBubble>
  );
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="max-w-[88%] rounded-lg border bg-background px-4 py-3 text-sm leading-relaxed shadow-sm animate-in fade-in-0 slide-in-from-bottom-1">
        {children}
      </div>
    </div>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:border-primary/50 hover:bg-primary/5"
      }`}
    >
      {children}
    </button>
  );
}
