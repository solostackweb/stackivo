"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileSignature,
  FileText,
  Headphones,
  LayoutDashboard,
  Mail,
  Maximize2,
  MessageCircle,
  Minimize2,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { generateOperationalDraftAction } from "@/features/ai-workflows/actions";
import {
  approveInvoiceFromAiAction,
  approveWelcomeDocFromAiAction,
  contractWhatsappFromAiAction,
  createClientFromAiAction,
  createContractFromAiAction,
  createInvoiceFromAiAction,
  createProjectFromAiAction,
  createWelcomeDocFromAiAction,
  emailInvoiceFromAiAction,
  invoiceWhatsappFromAiAction,
  sendContractFromAiAction,
  sendWelcomeDocFromAiAction,
  welcomeDocWhatsappFromAiAction,
  answerFromDocsAction,
} from "@/features/ai-workflows/global-actions";
import { submitBugReportAction } from "@/features/support/actions";
import type { AiContractDraft, AiWelcomeDraft } from "@/features/ai-workflows/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  | "time_entry"
  | "support";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: React.ReactNode;
}

interface AiInvoicePreview {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  originalSubtotal: number;
  discount: number;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  currency: string;
  dueDate: string;
  status: string;
  terms: string | null;
  notes: string | null;
}

interface AiContractPreview {
  id: string;
  title: string;
  kind: "contract" | "proposal";
  clientName: string;
  clientEmail: string | null;
  projectName: string | null;
  valueAmount: number | null;
  currency: string;
  sections: Array<{ heading: string; body: string }>;
}

interface AiWelcomeDocPreview {
  id: string;
  title: string;
  intro: string | null;
  sections: Array<{ heading: string; body: string }>;
  acknowledgementRequired: boolean;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  projectName: string | null;
}

interface PendingInvoiceRetry {
  prompt: string;
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS: Array<{
  mode: AiMode;
  title: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    mode: "invoice",
    title: "Create invoice",
    description: "Draft and approve an invoice from a single prompt.",
    icon: ReceiptText,
  },
  {
    mode: "contract",
    title: "Draft contract",
    description: "Generate a full agreement or proposal with all clauses.",
    icon: FileSignature,
  },
  {
    mode: "welcome_document",
    title: "Welcome doc",
    description: "Prepare a polished onboarding guide for a client.",
    icon: FileText,
  },
  {
    mode: "client",
    title: "Add client",
    description: "Create a client record from a description.",
    icon: Users,
  },
  {
    mode: "project",
    title: "Add project",
    description: "Create a project and link it to a client.",
    icon: LayoutDashboard,
  },
  {
    mode: "time_entry",
    title: "Log time",
    description: "Record billable hours against a project.",
    icon: Clock,
  },
  {
    mode: "support",
    title: "Support",
    description: "Ask a question or submit a support request.",
    icon: Headphones,
  },
];

// ---------------------------------------------------------------------------
// Workflow steps
// ---------------------------------------------------------------------------

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
      id: "brief",
      question:
        "Tell me the client, work, amount, due date, and any discount — I'll fill the rest.",
      kind: "text",
      placeholder:
        "Example: Invoice Acme 25000 for website redesign, due in 15 days, discount 5000",
    },
  ],
  contract: [
    { id: "client", question: "Who is this contract or proposal for?", kind: "client" },
    { id: "project", question: "Link to a project? (optional)", kind: "project", optional: true },
    {
      id: "type",
      question: "What kind of document?",
      kind: "choice",
      options: [
        "Service agreement",
        "Project proposal",
        "Retainer agreement",
        "NDA",
        "Maintenance contract",
      ],
    },
    {
      id: "scope",
      question: "Describe the scope, deliverables, and timeline.",
      kind: "text",
      placeholder:
        "Example: Website redesign — 5 pages, CMS setup, 3-week timeline, client provides copy",
    },
    {
      id: "commercials",
      question: "Fees, payment schedule, revisions, and IP terms?",
      kind: "text",
      placeholder:
        "Example: INR 150000 fixed, 50% upfront, 2 revision rounds, IP transfers on full payment",
    },
    {
      id: "clauses",
      question: "Any special clauses, exclusions, or client responsibilities? (optional)",
      kind: "text",
      optional: true,
      placeholder:
        "Example: Excludes paid plugins, client must approve milestones within 3 business days",
    },
  ],
  welcome_document: [
    { id: "client", question: "Who is this welcome document for?", kind: "client", optional: true },
    {
      id: "relationship",
      question: "What kind of engagement?",
      kind: "choice",
      options: [
        "Design client",
        "Development client",
        "Retainer client",
        "Consulting client",
        "Agency client",
      ],
    },
    {
      id: "process",
      question: "What process, communication cadence, and feedback rules should it explain?",
      kind: "text",
      placeholder:
        "Example: Weekly Friday updates, feedback in one doc, replies within 1 business day",
    },
    {
      id: "operations",
      question: "What about payments, files, deliverables, and approvals?",
      kind: "text",
      placeholder:
        "Example: Invoices due in 15 days, final files via portal, approvals in writing",
    },
    {
      id: "tone",
      question: "Tone and style?",
      kind: "choice",
      options: [
        "Warm and premium",
        "Direct and concise",
        "Detailed and structured",
        "Friendly and simple",
      ],
    },
  ],
  client: [
    {
      id: "name",
      question: "Client or contact name?",
      kind: "text",
      placeholder: "Example: Riya Sharma",
    },
    {
      id: "business",
      question: "Business or company name? (optional)",
      kind: "text",
      optional: true,
      placeholder: "Example: Acme Encore",
    },
    {
      id: "contact",
      question: "Email and phone? (optional)",
      kind: "text",
      optional: true,
      placeholder: "Example: riya@acme.com, +91 9876543210",
    },
    {
      id: "billing",
      question: "Billing address or city/state? (optional)",
      kind: "text",
      optional: true,
      placeholder: "Example: Mumbai, Maharashtra",
    },
    {
      id: "notes",
      question: "Notes about this client? (optional)",
      kind: "text",
      optional: true,
      placeholder: "Example: Retainer client, prefers email, fast approvals",
    },
  ],
  project: [
    {
      id: "client",
      question: "Which client should this project belong to? (optional)",
      kind: "client",
      optional: true,
    },
    {
      id: "name",
      question: "Project name?",
      kind: "text",
      placeholder: "Example: Website Redesign",
    },
    {
      id: "scope",
      question: "Goal, scope, and deliverables?",
      kind: "text",
      placeholder:
        "Example: Redesign landing page, CMS setup, analytics, launch support",
    },
    {
      id: "status",
      question: "What stage?",
      kind: "choice",
      options: ["Planning", "Active", "Waiting on client", "Review", "On hold"],
    },
    {
      id: "dates",
      question: "Start and due date? (optional)",
      kind: "text",
      optional: true,
      placeholder: "Example: starts next Monday, due end of month",
    },
  ],
  time_entry: [
    {
      id: "project",
      question: "Which project should I log this against? (optional)",
      kind: "project",
      optional: true,
    },
    {
      id: "description",
      question: "What work did you do?",
      kind: "text",
      placeholder: "Example: Client calls, wireframe revisions, API integration",
    },
    {
      id: "duration",
      question: "How long? And is this billable?",
      kind: "text",
      placeholder: "Example: 2h 30m, billable — or: 45 minutes, non-billable",
    },
  ],
  support: [
    {
      id: "question",
      question: "What do you need help with?",
      kind: "text",
      placeholder:
        "Ask anything — docs, privacy, terms, or raise a support ticket",
    },
    {
      id: "page",
      question: "Which page or workflow were you using? (optional)",
      kind: "text",
      optional: true,
      placeholder: "Example: invoices page, contract builder",
    },
    {
      id: "route",
      question: "Should I answer from docs, or send to support?",
      kind: "choice",
      options: ["Answer from docs first", "Send to support"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAiMoney(amount: number | null | undefined, currency = "INR") {
  if (!amount) return "";
  return formatMoney(amount, currency);
}

function modeIntro(mode: AiMode): string {
  switch (mode) {
    case "invoice":
      return "Let's create an invoice. Describe the client, work, amount, and due date.";
    case "contract":
      return "Let's draft a contract or proposal. I'll walk you through it.";
    case "welcome_document":
      return "Let's prepare a welcome document. A few questions and I'll generate the full guide.";
    case "client":
      return "Let's add a client. Tell me the details and I'll create the record.";
    case "project":
      return "Let's create a project. Tell me the name, scope, and timeline.";
    case "time_entry":
      return "Let's log some time. Which project and how long?";
    case "support":
      return "I can answer from docs, privacy, or terms — or send this to support.";
    default:
      return "What would you like to do?";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProviderBadge({ provider }: { provider?: "groq" | "local" }) {
  if (!provider || provider === "groq") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
      <RefreshCw className="h-2.5 w-2.5" />
      Local draft — AI unavailable
    </span>
  );
}

function SectionList({
  sections,
  limit,
}: {
  sections: Array<{ heading: string; body: string }>;
  limit?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const shown = limit && !expanded ? sections.slice(0, limit) : sections;
  const hasMore = limit && sections.length > limit && !expanded;
  return (
    <div className="space-y-3">
      {shown.map((s, i) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-3 text-xs">
          <p className="font-semibold text-foreground">{s.heading}</p>
          <p className="mt-1 whitespace-pre-line leading-relaxed text-muted-foreground">
            {s.body}
          </p>
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Show {sections.length - (limit ?? 0)} more sections…
        </button>
      )}
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
  const sections = "sections" in draft ? draft.sections : [];
  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3 text-xs">
      {"title" in draft && <p className="font-medium">{draft.title}</p>}
      {"intro" in draft && draft.intro && (
        <p className="text-muted-foreground">{draft.intro}</p>
      )}
      <p className="text-muted-foreground">
        {sections.length} section{sections.length !== 1 ? "s" : ""} generated
      </p>
    </div>
  );
}

// Invoice preview
function InvoiceDraftPreview({
  preview,
  onApprove,
  onOpen,
}: {
  preview: AiInvoicePreview;
  onApprove: (preview: AiInvoicePreview) => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">Draft invoice ready for approval</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {preview.invoiceNumber} · {preview.clientName}
        </p>
      </div>
      <div className="rounded-xl border bg-muted/20 p-3 text-xs space-y-1.5">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Work</span>
          <span className="text-right font-medium">{preview.description}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Qty × Rate</span>
          <span>
            {preview.quantity} × {formatAiMoney(preview.unitPrice, preview.currency)}
          </span>
        </div>
        {preview.discount > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-red-500">
              −{formatAiMoney(preview.discount, preview.currency)}
            </span>
          </div>
        )}
        {preview.taxTotal > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatAiMoney(preview.taxTotal, preview.currency)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t pt-1.5 font-semibold">
          <span>Total</span>
          <span>{formatAiMoney(preview.totalAmount, preview.currency)}</span>
        </div>
        {preview.dueDate && (
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span>Due</span>
            <span>{preview.dueDate}</span>
          </div>
        )}
        {preview.notes && (
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span>Notes</span>
            <span className="text-right">{preview.notes}</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onApprove(preview)}>
          Approve invoice
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          Open invoice
        </Button>
      </div>
    </div>
  );
}

function InvoiceDeliveryActions({
  preview,
  onDeliver,
  onOpen,
}: {
  preview: AiInvoicePreview;
  onDeliver: (preview: AiInvoicePreview, channel: "email" | "whatsapp" | "both") => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">Invoice approved</p>
        <p className="mt-1 text-muted-foreground">
          {preview.invoiceNumber} is ready to send. How would you like to deliver it?
        </p>
      </div>
      <div className="rounded-xl border bg-muted/20 p-3 text-xs space-y-1">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{preview.clientName}</span>
          <span className="font-semibold">
            {formatAiMoney(preview.totalAmount, preview.currency)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onDeliver(preview, "email")}
          className="gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onDeliver(preview, "whatsapp")}
          className="gap-1.5"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onDeliver(preview, "both")}
        >
          Both
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onOpen}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function InvoiceClientPicker({
  clients,
  onSelect,
}: {
  clients: AiEntityOption[];
  onSelect: (clientId: string) => void;
}) {
  const [selected, setSelected] = React.useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm">Which client is this invoice for?</p>
      <select
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Choose a client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
      >
        Use selected client
      </Button>
    </div>
  );
}

// Contract preview — all sections
function ContractDraftPreview({
  preview,
  onApproveAndSend,
  onWhatsApp,
  onOpen,
}: {
  preview: AiContractPreview;
  onApproveAndSend: (preview: AiContractPreview) => void;
  onWhatsApp: (preview: AiContractPreview) => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">
          {preview.kind === "proposal" ? "Proposal" : "Contract"} ready
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {preview.title} · {preview.clientName}
          {preview.projectName ? ` · ${preview.projectName}` : ""}
        </p>
        {preview.valueAmount && preview.valueAmount > 0 && (
          <p className="mt-0.5 text-xs font-medium">
            {formatAiMoney(preview.valueAmount, preview.currency)}
          </p>
        )}
      </div>
      <SectionList sections={preview.sections} limit={4} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onApproveAndSend(preview)}
          className="gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          Approve &amp; Email
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onWhatsApp(preview)}
          className="gap-1.5"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          Open editor
        </Button>
      </div>
    </div>
  );
}

// Welcome document preview — full sections
function WelcomeDocDraftPreview({
  preview,
  onApprove,
  onOpen,
}: {
  preview: AiWelcomeDocPreview;
  onApprove: (preview: AiWelcomeDocPreview) => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">Welcome document ready</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {preview.title}
          {preview.clientName ? ` · ${preview.clientName}` : ""}
          {preview.projectName ? ` · ${preview.projectName}` : ""}
        </p>
      </div>
      {preview.intro && (
        <p className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          {preview.intro}
        </p>
      )}
      <SectionList sections={preview.sections} limit={4} />
      {preview.acknowledgementRequired && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-green-500" />
          Client acknowledgement required
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onApprove(preview)}
        >
          Approve &amp; publish
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          Open editor
        </Button>
      </div>
    </div>
  );
}

function WelcomeDocDeliveryActions({
  preview,
  onDeliver,
  onOpen,
}: {
  preview: AiWelcomeDocPreview;
  onDeliver: (preview: AiWelcomeDocPreview, channel: "email" | "whatsapp") => void;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">Welcome document published</p>
        <p className="mt-1 text-muted-foreground">
          Ready to send to {preview.clientName ?? "the client"}. Choose a delivery channel.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onDeliver(preview, "email")}
          className="gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onDeliver(preview, "whatsapp")}
          className="gap-1.5"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onOpen}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
  const [lastInvoicePreview, setLastInvoicePreview] =
    React.useState<AiInvoicePreview | null>(null);
  const [pendingInvoiceRetry, setPendingInvoiceRetry] =
    React.useState<PendingInvoiceRetry | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [messages, setMessages] = React.useState<Message[]>(() => [
    {
      id: newId(),
      role: "assistant",
      content: (
        <>
          <span className="block font-semibold">Good to see you.</span>
          <span className="mt-1 block text-muted-foreground">
            Tell me what you want to do, or pick a workflow. I can create invoices,
            contracts, welcome docs, clients, projects, log time, and answer support
            questions.
          </span>
        </>
      ),
    },
  ]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const lastInvoicePreviewRef = React.useRef<AiInvoicePreview | null>(null);
  const pendingInvoiceRetryRef = React.useRef<PendingInvoiceRetry | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    lastInvoicePreviewRef.current = lastInvoicePreview;
  }, [lastInvoicePreview]);

  React.useEffect(() => {
    pendingInvoiceRetryRef.current = pendingInvoiceRetry;
  }, [pendingInvoiceRetry]);

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
    () => (clientId ? projects.filter((p) => p.clientId === clientId) : projects),
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

  // ----- Invoice handlers -----

  const handleInvoiceDelivery = React.useCallback(
    (preview: AiInvoicePreview, channel: "email" | "whatsapp" | "both") => {
      push({
        role: "user",
        content:
          channel === "both"
            ? "Send by email and WhatsApp"
            : channel === "email"
              ? "Send by email"
              : "Open WhatsApp",
      });
      startTransition(async () => {
        if (channel === "email" || channel === "both") {
          const email = await emailInvoiceFromAiAction({ invoiceId: preview.id });
          if (!email.ok) { push({ role: "assistant", content: email.error }); return; }
        }
        if (channel === "whatsapp" || channel === "both") {
          const wa = await invoiceWhatsappFromAiAction({ invoiceId: preview.id });
          if (!wa.ok) { push({ role: "assistant", content: wa.error }); return; }
          window.open(wa.data.url, "_blank", "noopener,noreferrer");
        }
        push({
          role: "assistant",
          content:
            channel === "both"
              ? "Done. Invoice emailed and WhatsApp opened with the link."
              : channel === "email"
                ? "Done. Invoice emailed to the client."
                : "WhatsApp is open with the invoice link ready to send.",
        });
        router.refresh();
      });
    },
    [push, router],
  );

  const handleInvoiceApprove = React.useCallback(
    (preview: AiInvoicePreview, emitUserMessage = true) => {
      if (emitUserMessage) {
        push({ role: "user", content: `Approve ${preview.invoiceNumber}` });
      }
      startTransition(async () => {
        const res = await approveInvoiceFromAiAction({ invoiceId: preview.id });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        push({
          role: "assistant",
          content: (
            <InvoiceDeliveryActions
              preview={{ ...preview, status: "sent" }}
              onDeliver={handleInvoiceDelivery}
              onOpen={() => router.push(`/dashboard/invoices/${preview.id}`)}
            />
          ),
        });
        setLastInvoicePreview({ ...preview, status: "sent" });
        router.refresh();
      });
    },
    [handleInvoiceDelivery, push, router],
  );

  const retryInvoiceDraftWithClient = React.useCallback(
    (selectedClientId: string) => {
      const retry = pendingInvoiceRetryRef.current;
      if (!retry?.prompt) return;
      setClientId(selectedClientId);
      setProjectId("");
      setPendingInvoiceRetry(null);
      startTransition(async () => {
        const res = await createInvoiceFromAiAction({
          prompt: retry.prompt,
          clientId: selectedClientId,
        });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        setLastInvoicePreview(res.data.preview);
        push({
          role: "assistant",
          content: (
            <InvoiceDraftPreview
              preview={res.data.preview}
              onApprove={handleInvoiceApprove}
              onOpen={() => router.push(`/dashboard/invoices/${res.data.preview.id}`)}
            />
          ),
        });
        router.refresh();
      });
    },
    [handleInvoiceApprove, push, router],
  );

  // ----- Welcome doc handlers -----

  const handleWelcomeDocDelivery = React.useCallback(
    (preview: AiWelcomeDocPreview, channel: "email" | "whatsapp") => {
      push({ role: "user", content: channel === "email" ? "Send by email" : "Open WhatsApp" });
      startTransition(async () => {
        if (channel === "email") {
          const res = await sendWelcomeDocFromAiAction({ welcomeDocId: preview.id });
          if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
          push({ role: "assistant", content: "Done. Welcome document emailed to the client." });
        } else {
          const res = await welcomeDocWhatsappFromAiAction({ welcomeDocId: preview.id });
          if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
          window.open(res.data.url, "_blank", "noopener,noreferrer");
          push({ role: "assistant", content: "WhatsApp is open with the welcome document link ready to send." });
        }
        router.refresh();
      });
    },
    [push, router],
  );

  const handleWelcomeDocApprove = React.useCallback(
    (preview: AiWelcomeDocPreview) => {
      push({ role: "user", content: `Approve and publish ${preview.title}` });
      startTransition(async () => {
        const res = await approveWelcomeDocFromAiAction({ welcomeDocId: preview.id });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        push({
          role: "assistant",
          content: (
            <WelcomeDocDeliveryActions
              preview={preview}
              onDeliver={handleWelcomeDocDelivery}
              onOpen={() => router.push(`/dashboard/welcome/${preview.id}`)}
            />
          ),
        });
        router.refresh();
      });
    },
    [handleWelcomeDocDelivery, push, router],
  );

  // ----- Contract handlers -----

  const handleContractApproveAndSend = React.useCallback(
    (preview: AiContractPreview) => {
      push({ role: "user", content: `Approve and email ${preview.title}` });
      startTransition(async () => {
        const res = await sendContractFromAiAction({ contractId: preview.id });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        push({
          role: "assistant",
          content: `${preview.kind === "proposal" ? "Proposal" : "Contract"} sent to ${preview.clientEmail ?? "the selected client"}.`,
        });
        router.refresh();
      });
    },
    [push, router],
  );

  const handleContractWhatsApp = React.useCallback(
    (preview: AiContractPreview) => {
      push({ role: "user", content: `Open WhatsApp for ${preview.title}` });
      startTransition(async () => {
        const res = await contractWhatsappFromAiAction({ contractId: preview.id });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        window.open(res.data.url, "_blank", "noopener,noreferrer");
        push({ role: "assistant", content: `WhatsApp is open with the ${preview.kind === "proposal" ? "proposal" : "contract"} link ready to send.` });
        router.refresh();
      });
    },
    [push, router],
  );

  // ----- Mode selection -----

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
          {steps ? (
            <span className="mt-2 block font-medium">{steps[0].question}</span>
          ) : null}
        </>
      ),
    });
  };

  // Smart intent detection from keyword patterns
  const detectMode = (text: string): AiMode => {
    const t = text.toLowerCase();
    if (/invoice|bill\s|receipt|charge/.test(t)) return "invoice";
    if (/contract|agreement|proposal|nda|retainer/.test(t)) return "contract";
    if (/welcome|onboard|kickoff/.test(t)) return "welcome_document";
    if (/\bproject\b/.test(t)) return "project";
    if (/\bclient\b|\bcustomer\b|\bcontact\b/.test(t)) return "client";
    if (/\btime\b|\bhours?\b|\bminutes?\b|\blog\b|\bbillable\b/.test(t)) return "time_entry";
    if (/support|bug|issue|help|how do|what is|privacy|terms/.test(t)) return "support";
    return mode;
  };

  // ----- Core workflow executor -----

  const executeWorkflow = React.useCallback(
    async (targetMode: AiMode, text: string) => {
      // ---- Invoice ----
      if (targetMode === "invoice") {
        const res = await createInvoiceFromAiAction({ prompt: text, clientId, projectId });
        if (!res.ok) {
          if (res.error.includes("Which client is this invoice for?")) {
            setPendingInvoiceRetry({ prompt: text });
            push({
              role: "assistant",
              content: (
                <InvoiceClientPicker
                  clients={clients}
                  onSelect={retryInvoiceDraftWithClient}
                />
              ),
            });
            return;
          }
          push({ role: "assistant", content: res.error });
          return;
        }
        setLastInvoicePreview(res.data.preview);
        push({
          role: "assistant",
          content: (
            <InvoiceDraftPreview
              preview={res.data.preview}
              onApprove={handleInvoiceApprove}
              onOpen={() => router.push(`/dashboard/invoices/${res.data.preview.id}`)}
            />
          ),
        });
        router.refresh();
        return;
      }

      // ---- Client ----
      if (targetMode === "client") {
        const res = await createClientFromAiAction({ prompt: text });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title="Client created"
              description={`Added ${("draft" in res.data && res.data.draft && "fullName" in res.data.draft) ? res.data.draft.fullName : "the client"} to your workspace.`}
              actionLabel="Open clients"
              onAction={() => router.push("/dashboard/clients")}
            />
          ),
        });
        router.refresh();
        return;
      }

      // ---- Project ----
      if (targetMode === "project") {
        const res = await createProjectFromAiAction({ prompt: text, clientId });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title="Project created"
              description={`${("draft" in res.data && res.data.draft && "name" in res.data.draft) ? res.data.draft.name : "The project"} is ready.`}
              actionLabel="Open projects"
              onAction={() => router.push("/dashboard/projects")}
            />
          ),
        });
        router.refresh();
        return;
      }

      // ---- Contract ----
      if (targetMode === "contract") {
        if (!clientId) {
          push({
            role: "assistant",
            content: "Choose a client first — select one above, then I can prepare the contract.",
          });
          return;
        }
        const res = await createContractFromAiAction({ prompt: text, clientId, projectId });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        push({
          role: "assistant",
          content: (
            <ContractDraftPreview
              preview={res.data}
              onApproveAndSend={handleContractApproveAndSend}
              onWhatsApp={handleContractWhatsApp}
              onOpen={() => router.push(`/dashboard/contracts/${res.data.id}`)}
            />
          ),
        });
        router.refresh();
        return;
      }

      // ---- Welcome document ----
      if (targetMode === "welcome_document") {
        const res = await createWelcomeDocFromAiAction({ prompt: text, clientId, projectId });
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        push({
          role: "assistant",
          content: (
            <WelcomeDocDraftPreview
              preview={res.data}
              onApprove={handleWelcomeDocApprove}
              onOpen={() => router.push(`/dashboard/welcome/${res.data.id}`)}
            />
          ),
        });
        router.refresh();
        return;
      }

      // ---- Time entry ----
      if (targetMode === "time_entry") {
        const fd = new FormData();
        fd.set("payload", JSON.stringify({
          workflow: "time_entry",
          prompt: text,
          clientId,
          projectId,
        }));
        const res = await generateOperationalDraftAction(fd);
        if (!res.ok) { push({ role: "assistant", content: res.error }); return; }
        const draft = res.data as {
          description?: string;
          hours?: number;
          minutes?: number;
          billable?: boolean;
          hourlyRate?: number;
          date?: string;
        };
        push({
          role: "assistant",
          content: (
            <ResultBlock
              title="Time entry drafted"
              description={`${draft.description ?? text} — ${draft.hours ?? 0}h ${draft.minutes ?? 0}m${draft.billable ? " · billable" : " · non-billable"}. Open the time tracker to review and save.`}
              actionLabel="Open time tracker"
              onAction={() => router.push("/dashboard/time")}
            />
          ),
        });
        return;
      }

      // ---- Support ----
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
            ? `${docs.data.answer}\n\nI also sent this to Stackivo support for follow-up.`
            : "Sent to Stackivo support — the team will follow up.",
        });
        return;
      }

      push({
        role: "assistant",
        content:
          "I can create invoices, contracts, welcome docs, clients, projects, log time, and answer support questions. Describe what you need or pick a workflow.",
      });
    },
    [
      clientId,
      projectId,
      clients,
      handleInvoiceApprove,
      handleContractApproveAndSend,
      handleContractWhatsApp,
      handleWelcomeDocApprove,
      push,
      retryInvoiceDraftWithClient,
      router,
    ],
  );

  // ----- Submit handler -----

  const handleSubmit = React.useCallback(() => {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    push({ role: "user", content: text });

    startTransition(async () => {
      // Multi-step workflow answer
      if (workflowStep !== null && activeSteps) {
        const currentStep = activeSteps[workflowStep];

        // Capture client/project selections from choice steps
        if (currentStep?.kind === "client") {
          const match = clients.find(
            (c) => c.name.toLowerCase().includes(text.toLowerCase()),
          );
          if (match) setClientId(match.id);
        }
        if (currentStep?.kind === "project") {
          const match = projectOptions.find(
            (p) => p.name.toLowerCase().includes(text.toLowerCase()),
          );
          if (match) setProjectId(match.id);
        }

        const nextAnswers = [...workflowAnswers, `${currentStep?.question}\n${text}`];
        const nextStep = workflowStep + 1;

        if (nextStep < activeSteps.length) {
          setWorkflowAnswers(nextAnswers);
          setWorkflowStep(nextStep);
          push({
            role: "assistant",
            content: activeSteps[nextStep].question,
          });
          return;
        }

        // All steps answered — execute
        setWorkflowAnswers([]);
        setWorkflowStep(null);
        const fullPrompt = nextAnswers.join("\n\n");
        await executeWorkflow(mode, fullPrompt);
        return;
      }

      // Free-form / general mode — detect intent and execute
      const detectedMode = detectMode(text);
      if (detectedMode !== mode && mode === "general") {
        setMode(detectedMode);
        await executeWorkflow(detectedMode, text);
        return;
      }

      await executeWorkflow(mode === "general" ? detectedMode : mode, text);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, pending, workflowStep, activeSteps, workflowAnswers, mode, executeWorkflow, clients, projectOptions, push]);

  // ----- Render -----

  if (!mounted) return null;

  const panel = (
    <>
      {/* Trigger button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
          aria-label="Ask AI"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-0 right-0 z-50 flex flex-col bg-background shadow-2xl ring-1 ring-border/60",
            "h-[calc(100dvh-4rem)] sm:bottom-6 sm:right-6 sm:h-[calc(100dvh-6rem)] sm:max-h-[720px] sm:rounded-2xl",
          )}
          style={{ width: "var(--stackivo-ai-width, 440px)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="flex-1 text-sm font-semibold">Ask AI</span>
            {mode !== "general" && (
              <button
                type="button"
                onClick={() => {
                  setMode("general");
                  setWorkflowStep(null);
                  setWorkflowAnswers([]);
                  setClientId("");
                  setProjectId("");
                }}
                className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Context selectors (client + project) */}
          {(mode === "invoice" || mode === "contract" || mode === "welcome_document" || mode === "project" || mode === "time_entry") && (
            <div className="flex gap-2 border-b px-4 py-2">
              <select
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs text-muted-foreground focus:text-foreground"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId("");
                }}
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs text-muted-foreground focus:text-foreground"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">No project</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted/60",
                )}
              >
                {msg.content}
              </div>
            ))}

            {/* Quick actions (general mode, no messages beyond greeting) */}
            {mode === "general" && messages.length <= 1 && (
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.mode}
                    type="button"
                    onClick={() => selectMode(action.mode)}
                    className="group flex flex-col gap-1.5 rounded-xl border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <action.icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs font-semibold">{action.title}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {action.description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Multi-step client picker */}
            {activeStep?.kind === "client" && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Choose a client
                </p>
                <select
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">No client selected</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {activeStep.optional && (
                  <button
                    type="button"
                    onClick={() => {
                      push({ role: "user", content: "Skip" });
                      const nextStep = (workflowStep ?? 0) + 1;
                      if (activeSteps && nextStep < activeSteps.length) {
                        setWorkflowAnswers((a) => [...a, `${activeStep.question}\nSkip`]);
                        setWorkflowStep(nextStep);
                        push({ role: "assistant", content: activeSteps[nextStep].question });
                      }
                    }}
                    className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Skip
                  </button>
                )}
              </div>
            )}

            {/* Multi-step project picker */}
            {activeStep?.kind === "project" && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Choose a project
                </p>
                <select
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">No project</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    push({ role: "user", content: "Skip" });
                    const nextStep = (workflowStep ?? 0) + 1;
                    if (activeSteps && nextStep < activeSteps.length) {
                      setWorkflowAnswers((a) => [...a, `${activeStep.question}\nSkip`]);
                      setWorkflowStep(nextStep);
                      push({ role: "assistant", content: activeSteps[nextStep].question });
                    }
                  }}
                  className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Skip
                </button>
              </div>
            )}

            {/* Choice picker */}
            {activeStep?.kind === "choice" && activeStep.options && (
              <div className="flex flex-wrap gap-2">
                {activeStep.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setInput(opt);
                    }}
                    className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {pending && (
              <div className="mr-auto flex gap-1 rounded-2xl bg-muted/60 px-3.5 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-3">
            <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2">
              <Textarea
                value={input}
                data-testid="ai-chat-input"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  activeStep?.placeholder ??
                  (mode === "general"
                    ? "Describe what you want to do…"
                    : activeStep?.question ?? "Type your answer…")
                }
                rows={1}
                className="min-h-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || pending}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
              Powered by Qwen · Stackivo AI
            </p>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(panel, document.body);
}
