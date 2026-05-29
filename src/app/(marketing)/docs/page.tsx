import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Documentation · Stackivo",
  description:
    "Everything you need to know about using Stackivo — invoices, contracts, client portal, GST, time tracking, and more.",
};

export const dynamic = "force-static";

/* ─────────────────────────────────────────────
   Sidebar nav structure
───────────────────────────────────────────── */
const NAV = [
  { id: "getting-started", label: "Getting Started" },
  { id: "clients", label: "Clients" },
  { id: "invoices", label: "Invoices" },
  { id: "contracts", label: "Contracts" },
  { id: "projects", label: "Projects" },
  { id: "time-tracking", label: "Time Tracking" },
  { id: "client-portal", label: "Client Portal" },
  { id: "welcome-documents", label: "Welcome Documents" },
  { id: "pulse", label: "Pulse Analytics" },
  { id: "settings", label: "Settings" },
  { id: "plans-billing", label: "Plans & Billing" },
  { id: "gst-guide", label: "GST Guide" },
  { id: "payments", label: "Payments" },
  { id: "faq", label: "FAQ & Troubleshooting" },
];

/* ─────────────────────────────────────────────
   Small reusable primitives
───────────────────────────────────────────── */
function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border pb-14 pt-12 first:pt-0">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-5 text-[15px] leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-8 mb-2 text-sm font-semibold uppercase tracking-wider text-foreground/60">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 text-muted-foreground">{children}</ul>
  );
}

function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="ml-5 list-decimal space-y-1.5 text-muted-foreground">{children}</ol>
  );
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "tip" | "warning";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200",
    tip: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200",
    warning:
      "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200",
  };
  const icons = { info: "ℹ️", tip: "✅", warning: "⚠️" };
  return (
    <div
      className={`flex gap-3 rounded-lg border px-4 py-3 text-sm leading-6 ${styles[type]}`}
    >
      <span className="mt-0.5 shrink-0">{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function DocsPage() {
  return (
    <Section size="default" className="pb-24 pt-24 sm:pt-32">
      {/* Page header */}
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
          Documentation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Stackivo Help Center
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          Everything you need to run your freelance business — invoices, contracts,
          projects, payments, GST compliance, and more. If you&apos;re stuck, this is the
          place to start.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-12 lg:gap-16">

        {/* ── Sticky sidebar ── */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              On this page
            </p>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 flex-1">

          {/* ══════════════════════════════════════
              1. GETTING STARTED
          ══════════════════════════════════════ */}
          <DocSection id="getting-started" title="Getting Started">
            <P>
              Welcome to Stackivo — your all-in-one business operating system built
              specifically for Indian freelancers. This guide walks you through
              everything from your first login to sending your first invoice.
            </P>

            <H3>Creating your account</H3>
            <OL>
              <li>Go to <strong>stackivo.me</strong> and click <strong>Get started free</strong>.</li>
              <li>Sign up with your Google account or email address.</li>
              <li>You&apos;ll land on the onboarding screen — it takes under two minutes.</li>
            </OL>

            <H3>Two-step onboarding</H3>
            <P>
              Stackivo&apos;s onboarding is designed to feel like a premium welcome, not a
              form. There are only two steps:
            </P>
            <OL>
              <li>
                <strong>Business setup</strong> — Enter your business name, profession,
                and currency. This populates your invoices and client-facing documents
                automatically.
              </li>
              <li>
                <strong>GST setup</strong> — If you are GST-registered, toggle the switch
                and enter your GSTIN. If you&apos;re not registered, leave it off — you&apos;ll
                still get clean, professional invoices without any GST lines.
              </li>
            </OL>
            <Callout type="tip">
              You can update everything you enter here later under{" "}
              <strong>Settings → Business Profile</strong>. Nothing is locked.
            </Callout>

            <H3>Your dashboard at a glance</H3>
            <P>After onboarding you land on your dashboard. The main sidebar gives you access to:</P>
            <UL>
              <li><strong>Clients</strong> — your full client directory</li>
              <li><strong>Projects</strong> — active and archived project workspaces</li>
              <li><strong>Invoices</strong> — create, send, and track payments</li>
              <li><strong>Contracts</strong> — professional agreements with e-signature</li>
              <li><strong>Time</strong> — start/stop timer, log hours by project</li>
              <li><strong>Portal</strong> — per-client collaboration spaces</li>
              <li><strong>Pulse</strong> — your business analytics overview</li>
            </UL>

            <H3>Choosing a plan</H3>
            <P>
              Stackivo has three plans. The <strong>Free plan</strong> lets you add up to
              5 clients and explore the core product before committing. When you need more,
              upgrading to <strong>Pro</strong> (₹499/month or ₹399/month billed annually)
              unlocks unlimited clients, contracts, the client portal, GST reports, and
              e-signatures. The <strong>Business plan</strong> (₹1,499/month) adds team
              collaborators, API access, and priority support. See{" "}
              <a href="/pricing" className="font-medium text-foreground underline underline-offset-4 hover:opacity-70">
                pricing
              </a>{" "}
              for a full feature comparison.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              2. CLIENTS
          ══════════════════════════════════════ */}
          <DocSection id="clients" title="Clients">
            <P>
              Clients are the foundation of Stackivo. Every invoice, project, contract,
              and portal is linked to a client, so adding them first makes everything else
              faster.
            </P>

            <H3>Adding a client</H3>
            <OL>
              <li>Click <strong>Clients</strong> in the sidebar, then <strong>Add client</strong>.</li>
              <li>Enter the client&apos;s name, email, phone, and address.</li>
              <li>
                If the client is GST-registered, toggle <strong>GST client</strong> and
                enter their GSTIN. Stackivo validates the format automatically.
              </li>
              <li>Save. The client is now available across invoices, projects, and contracts.</li>
            </OL>

            <H3>Client details page</H3>
            <P>
              Click any client to open their detail view. You&apos;ll see a summary of their
              total billed amount, outstanding balance, all linked invoices, active
              projects, and contracts — all in one place.
            </P>

            <H3>Free plan limit</H3>
            <Callout type="info">
              The Free plan supports up to <strong>5 clients</strong>. Upgrade to Pro for
              unlimited clients.
            </Callout>

            <H3>Editing and archiving</H3>
            <P>
              Open any client and click the three-dot menu to edit their details or archive
              them. Archived clients are hidden from the default list but all their
              historical data — invoices, payments, contracts — is preserved.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              3. INVOICES
          ══════════════════════════════════════ */}
          <DocSection id="invoices" title="Invoices">
            <P>
              Stackivo&apos;s invoice builder is built for Indian freelancers — it handles
              GST, Razorpay payment links, due dates, and professional PDF generation out
              of the box.
            </P>

            <H3>Creating an invoice</H3>
            <OL>
              <li>Go to <strong>Invoices → New invoice</strong>.</li>
              <li>Select a client. Their billing address and GSTIN populate automatically.</li>
              <li>Add line items — description, quantity, rate. Stackivo calculates line totals in real time.</li>
              <li>
                Set a due date. You can also add notes (visible to your client) and
                internal notes (visible only to you).
              </li>
              <li>Click <strong>Save &amp; Preview</strong> to review the PDF before sending.</li>
            </OL>

            <H3>Invoice numbering</H3>
            <P>
              Stackivo auto-generates invoice numbers in sequence (e.g. INV-001, INV-002).
              You can change the prefix and starting number under{" "}
              <strong>Settings → Invoice preferences</strong>.
            </P>

            <H3>Sending an invoice</H3>
            <P>
              Click <strong>Send invoice</strong>. Stackivo emails your client a
              professional HTML email with a <strong>View invoice</strong> button that
              opens a hosted, mobile-friendly invoice page. You can also copy the link and
              send it via WhatsApp.
            </P>

            <H3>Payment links</H3>
            <P>
              If you&apos;ve connected Razorpay (see{" "}
              <a href="#payments" className="font-medium text-foreground underline underline-offset-4 hover:opacity-70">
                Payments
              </a>
              ), a <strong>Pay now</strong> button appears on every hosted invoice. Your
              client can pay via UPI, debit/credit card, net banking, or wallets — directly
              from the invoice page.
            </P>

            <H3>Invoice statuses</H3>
            <UL>
              <li><strong>Draft</strong> — saved but not sent</li>
              <li><strong>Sent</strong> — emailed to client, awaiting payment</li>
              <li><strong>Viewed</strong> — client has opened the invoice</li>
              <li><strong>Paid</strong> — payment recorded (manual or via Razorpay)</li>
              <li><strong>Overdue</strong> — past due date, not yet paid</li>
              <li><strong>Cancelled</strong> — voided</li>
            </UL>

            <H3>Recording a manual payment</H3>
            <P>
              If a client pays via bank transfer or cash, open the invoice and click{" "}
              <strong>Mark as paid</strong>. Enter the payment date and amount. Stackivo
              updates the status and adjusts your Pulse revenue figures.
            </P>

            <H3>Downloading as PDF</H3>
            <P>
              Open any invoice and click the download icon. Stackivo generates a
              pixel-perfect PDF with your business logo, address, GST breakdown (if
              applicable), and payment details.
            </P>

            <Callout type="tip">
              Add your business logo under <strong>Settings → Business profile</strong> —
              it appears on every invoice and client-facing document automatically.
            </Callout>
          </DocSection>

          {/* ══════════════════════════════════════
              4. CONTRACTS
          ══════════════════════════════════════ */}
          <DocSection id="contracts" title="Contracts">
            <P>
              Contracts protect you and set professional expectations with clients before
              work begins. Stackivo includes contract templates, an e-signature flow, and
              signed PDF storage — all on the Pro plan.
            </P>
            <Callout type="info">
              Contracts require the <Badge>Pro</Badge> plan or above.
            </Callout>

            <H3>Creating a contract</H3>
            <OL>
              <li>Go to <strong>Contracts → New contract</strong>.</li>
              <li>Select a client and choose a template (Freelance Service Agreement, NDA, Fixed-Price Project, Retainer).</li>
              <li>Fill in the project scope, payment terms, deliverables, and revision policy.</li>
              <li>Preview the contract as your client would see it.</li>
              <li>Click <strong>Send for signature</strong>.</li>
            </OL>

            <H3>E-signature flow</H3>
            <P>
              Your client receives an email with a link to review and sign the contract.
              They can sign on desktop or mobile using a drawn or typed signature. Once
              signed:
            </P>
            <UL>
              <li>Both parties receive a signed PDF by email.</li>
              <li>The contract status updates to <strong>Signed</strong> in your dashboard.</li>
              <li>The signed PDF is stored securely in Stackivo&apos;s cloud storage.</li>
            </UL>

            <H3>Contract statuses</H3>
            <UL>
              <li><strong>Draft</strong> — not yet sent</li>
              <li><strong>Sent</strong> — awaiting client signature</li>
              <li><strong>Signed</strong> — fully executed</li>
              <li><strong>Declined</strong> — client declined to sign</li>
              <li><strong>Expired</strong> — signature deadline passed</li>
            </UL>

            <H3>Downloading signed contracts</H3>
            <P>
              Open any signed contract and click <strong>Download PDF</strong>. The PDF
              includes both signatures, timestamps, and IP addresses for legal record-keeping.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              5. PROJECTS
          ══════════════════════════════════════ */}
          <DocSection id="projects" title="Projects">
            <P>
              Projects give every piece of work its own workspace — linking time entries,
              invoices, and client communications in one place so nothing falls through the
              cracks.
            </P>

            <H3>Creating a project</H3>
            <OL>
              <li>Go to <strong>Projects → New project</strong>.</li>
              <li>Name the project and select the client it belongs to.</li>
              <li>Set a budget (fixed price or hourly) and an optional deadline.</li>
              <li>Choose the project status: <em>Active</em>, <em>On hold</em>, or <em>Completed</em>.</li>
            </OL>

            <H3>Project workspace</H3>
            <P>Inside each project you can:</P>
            <UL>
              <li>Track time directly — your time entries automatically link to the project.</li>
              <li>See all invoices billed against this project.</li>
              <li>View the contract attached to the project.</li>
              <li>Monitor budget utilisation — hours logged vs. budget.</li>
            </UL>

            <H3>Archiving a project</H3>
            <P>
              When a project is complete, mark it <strong>Completed</strong> or
              archive it. Archived projects are removed from the active list but all
              associated data remains intact for your records.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              6. TIME TRACKING
          ══════════════════════════════════════ */}
          <DocSection id="time-tracking" title="Time Tracking">
            <P>
              Know exactly where your hours go. Stackivo&apos;s time tracker is built for
              freelancers who need simple, accurate logging without the overhead of complex
              project management tools.
            </P>

            <H3>Starting the timer</H3>
            <OL>
              <li>Go to <strong>Time</strong> in the sidebar.</li>
              <li>Select a project and optionally add a description of what you&apos;re working on.</li>
              <li>Click <strong>Start timer</strong>. The timer runs in real time.</li>
              <li>Click <strong>Stop</strong> when you&apos;re done. The entry is saved automatically.</li>
            </OL>

            <Callout type="tip">
              The running timer persists even if you navigate away or close the tab —
              your session is saved in Stackivo&apos;s servers, not just your browser.
            </Callout>

            <H3>Logging time manually</H3>
            <P>
              Click <strong>Add time entry</strong> and enter the date, project, duration,
              and description. This is useful for logging billable hours after the fact.
            </P>

            <H3>Billable vs. non-billable</H3>
            <P>
              Every time entry can be marked as billable or non-billable. Billable hours
              feed into your project budget tracking and can be converted to invoice line
              items in one click.
            </P>

            <H3>Converting hours to an invoice</H3>
            <OL>
              <li>Open a project and go to the <strong>Time</strong> tab.</li>
              <li>Select the billable entries you want to invoice.</li>
              <li>Click <strong>Create invoice from time</strong>.</li>
              <li>Stackivo pre-fills the invoice with itemised time entries at your hourly rate.</li>
            </OL>

            <H3>Time reports</H3>
            <P>
              In the <strong>Pulse</strong> section, you can see time logged by project,
              client, and date range — helping you understand which clients take the most
              time relative to what they pay.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              7. CLIENT PORTAL
          ══════════════════════════════════════ */}
          <DocSection id="client-portal" title="Client Portal">
            <P>
              The client portal gives every client their own private workspace where they
              can view invoices, sign contracts, access files, follow project updates, and
              chat with you — all without needing a Stackivo account.
            </P>
            <Callout type="info">
              The client portal requires the <Badge>Pro</Badge> plan or above.
            </Callout>

            <H3>Enabling the portal for a client</H3>
            <OL>
              <li>Open the client&apos;s details page.</li>
              <li>Toggle <strong>Enable client portal</strong>.</li>
              <li>Click <strong>Send portal invite</strong>. Your client receives an email with a secure link — no password needed.</li>
            </OL>

            <H3>What your client sees</H3>
            <P>The portal has six tabs:</P>
            <UL>
              <li><strong>Home</strong> — a welcome message and overview of active projects</li>
              <li><strong>Chat</strong> — a direct messaging thread between you and the client</li>
              <li><strong>Files</strong> — shared files and deliverables you&apos;ve uploaded</li>
              <li><strong>Invoices</strong> — all invoices with payment status and Pay Now button</li>
              <li><strong>Updates</strong> — project updates and milestones you&apos;ve shared</li>
              <li><strong>Meetings</strong> — scheduled calls and meeting notes</li>
            </UL>

            <H3>Sharing files through the portal</H3>
            <P>
              From inside a project, click <strong>Share with client</strong> on any file.
              It immediately appears in the client&apos;s <strong>Files</strong> tab. You can
              also upload files directly from the portal&apos;s file manager.
            </P>

            <H3>Portal security</H3>
            <P>
              Each portal link is unique per client and uses a signed token that expires
              after 30 days of inactivity. You can revoke access at any time by disabling
              the portal for that client.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              8. WELCOME DOCUMENTS
          ══════════════════════════════════════ */}
          <DocSection id="welcome-documents" title="Welcome Documents">
            <P>
              A Welcome Document is the first thing a new client receives when they start
              working with you. It sets expectations, communicates your process, and
              positions you as a professional — before you&apos;ve even sent an invoice.
            </P>

            <H3>What&apos;s included in a welcome document</H3>
            <UL>
              <li>A personalised greeting with the client&apos;s name and project</li>
              <li>Your working hours and preferred communication channels</li>
              <li>Revision policy and project scope boundaries</li>
              <li>Payment schedule and late payment terms</li>
              <li>Emergency contact and support SLA</li>
              <li>A link to the client portal</li>
            </UL>

            <H3>Sending a welcome document</H3>
            <OL>
              <li>Open a client and click <strong>Send welcome document</strong>.</li>
              <li>Customise the template — add your working hours, process notes, and anything specific to this project.</li>
              <li>Preview it as your client will see it.</li>
              <li>Click <strong>Send</strong>. The client receives it by email and it appears in their portal.</li>
            </OL>

            <Callout type="tip">
              Send the welcome document before or alongside the contract — it&apos;s a
              great way to warm up the relationship and reduce &quot;what happens next?&quot;
              emails.
            </Callout>
          </DocSection>

          {/* ══════════════════════════════════════
              9. PULSE ANALYTICS
          ══════════════════════════════════════ */}
          <DocSection id="pulse" title="Pulse Analytics">
            <P>
              Pulse is your real-time business health dashboard. It aggregates data from
              invoices, payments, time entries, and clients to give you a clear picture of
              how your freelance business is performing.
            </P>

            <H3>Key metrics</H3>
            <UL>
              <li><strong>Revenue this month</strong> — total payments received in the current calendar month</li>
              <li><strong>Outstanding</strong> — the sum of all unpaid, non-overdue invoices</li>
              <li><strong>Overdue</strong> — unpaid invoices past their due date, highlighted for action</li>
              <li><strong>Billed this year</strong> — year-to-date total billed across all clients</li>
              <li><strong>Active clients</strong> — clients with at least one open project or unpaid invoice</li>
              <li><strong>Hours logged</strong> — total time tracked, segmented by project</li>
            </UL>

            <H3>Revenue chart</H3>
            <P>
              The revenue chart shows your monthly income over the past 12 months. Hover
              over any bar to see the exact figure. You can compare billed vs. collected
              to understand how much of what you invoice actually gets paid — and when.
            </P>

            <H3>Top clients by revenue</H3>
            <P>
              Pulse ranks your clients by total revenue so you can see at a glance which
              relationships drive the most income. Use this to prioritise retention efforts
              and decide where to focus.
            </P>

            <H3>Invoice aging</H3>
            <P>
              The aging section breaks down your outstanding invoices by how long they&apos;ve
              been unpaid: 0–30 days, 31–60 days, 61–90 days, and 90+ days. This helps
              you prioritise follow-ups before invoices become bad debt.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              10. SETTINGS
          ══════════════════════════════════════ */}
          <DocSection id="settings" title="Settings">
            <P>
              Settings is where you configure Stackivo to match your business. Everything
              here flows through to your invoices, contracts, and client-facing pages.
            </P>

            <H3>Business profile</H3>
            <P>Update your:</P>
            <UL>
              <li>Business name and legal entity type</li>
              <li>Logo (appears on all invoices and documents)</li>
              <li>Address (used for GST compliance and invoice headers)</li>
              <li>Phone, email, and website</li>
              <li>Default currency</li>
            </UL>

            <H3>Invoice preferences</H3>
            <UL>
              <li><strong>Invoice prefix</strong> — e.g. INV-, STCK-, or your initials</li>
              <li><strong>Starting number</strong> — set if migrating from another tool</li>
              <li><strong>Default due date</strong> — e.g. 15 days after issue date</li>
              <li><strong>Default payment terms</strong> — shown in invoice footer</li>
              <li><strong>Default notes</strong> — boilerplate text added to every invoice</li>
            </UL>

            <H3>GST settings</H3>
            <P>
              If you&apos;re GST-registered, enter your GSTIN, business legal name as per
              GST registration, and SAC/HSN codes for your services. See{" "}
              <a href="#gst-guide" className="font-medium text-foreground underline underline-offset-4 hover:opacity-70">
                GST Guide
              </a>{" "}
              for a full walkthrough.
            </P>

            <H3>Email notifications</H3>
            <P>Control which events trigger email notifications:</P>
            <UL>
              <li>Invoice viewed by client</li>
              <li>Invoice paid</li>
              <li>Contract signed</li>
              <li>New client portal message</li>
              <li>Invoice overdue reminder</li>
            </UL>

            <H3>Integrations</H3>
            <P>
              Under <strong>Settings → Integrations</strong> you can connect Razorpay for
              online payments. Business plan users also get API key management for custom
              integrations.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              11. PLANS & BILLING
          ══════════════════════════════════════ */}
          <DocSection id="plans-billing" title="Plans & Billing">
            <H3>Plan comparison</H3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left font-semibold text-foreground">Feature</th>
                    <th className="py-2 text-center font-semibold text-foreground">Free</th>
                    <th className="py-2 text-center font-semibold text-primary">Pro</th>
                    <th className="py-2 text-center font-semibold text-foreground">Business</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Clients", "5 lifetime", "Unlimited", "Unlimited"],
                    ["Invoices", "Unlimited", "Unlimited", "Unlimited"],
                    ["Storage", "100 MB", "Unlimited", "Unlimited"],
                    ["Contracts + e-signature", "—", "✓", "✓"],
                    ["Client portal", "—", "✓", "✓"],
                    ["GST reports", "—", "✓", "✓"],
                    ["Time tracking", "✓", "✓", "✓"],
                    ["Pulse analytics", "✓", "✓", "✓"],
                    ["Team collaborators", "—", "—", "✓"],
                    ["API access", "—", "—", "✓"],
                    ["Priority support", "—", "—", "✓"],
                    ["Price", "Free", "₹499/mo", "₹1,499/mo"],
                    ["Annual price", "—", "₹399/mo (₹4,788/yr)", "₹1,199/mo (₹14,388/yr)"],
                  ].map(([feature, free, pro, business]) => (
                    <tr key={feature}>
                      <td className="py-2 text-muted-foreground">{feature}</td>
                      <td className="py-2 text-center text-muted-foreground">{free}</td>
                      <td className="py-2 text-center font-medium text-primary">{pro}</td>
                      <td className="py-2 text-center text-muted-foreground">{business}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <H3>Upgrading your plan</H3>
            <OL>
              <li>Go to <strong>Settings → Billing</strong> or click <strong>Upgrade</strong> in the sidebar.</li>
              <li>Choose Pro or Business and select monthly or annual billing.</li>
              <li>Complete payment via Razorpay (UPI, card, net banking).</li>
              <li>Your plan upgrades instantly — no restart needed.</li>
            </OL>

            <H3>Annual billing discount</H3>
            <P>
              Annual billing saves you 20% on both Pro and Business plans. You&apos;re billed
              once for the year upfront. The annual amount is non-refundable after the
              30-day window.
            </P>

            <H3>Cancelling your subscription</H3>
            <P>
              Go to <strong>Settings → Billing → Cancel subscription</strong>. Your Pro
              or Business features remain active until the end of your billing period.
              After that, you&apos;ll revert to the Free plan. Your data is never deleted.
            </P>

            <Callout type="info">
              Stackivo never deletes your data when you downgrade. Invoices, contracts,
              clients, and files are all preserved — you just won&apos;t be able to create
              new contracts or portal entries on the Free plan.
            </Callout>
          </DocSection>

          {/* ══════════════════════════════════════
              12. GST GUIDE
          ══════════════════════════════════════ */}
          <DocSection id="gst-guide" title="GST Guide">
            <P>
              Stackivo is built for GST compliance from the ground up. Whether you&apos;re
              registered or not, Stackivo generates the right invoice format for your
              situation automatically.
            </P>

            <H3>Am I required to register for GST?</H3>
            <P>
              As a freelancer, you&apos;re required to register for GST if your annual turnover
              exceeds ₹20 lakhs (₹10 lakhs in special category states). You must also
              register if you provide services to clients outside India (export of services),
              regardless of turnover. This is a general guideline — consult a CA for advice
              specific to your situation.
            </P>

            <H3>Setting up GST in Stackivo</H3>
            <OL>
              <li>Go to <strong>Settings → GST settings</strong>.</li>
              <li>Toggle <strong>GST registered</strong> on.</li>
              <li>Enter your 15-digit GSTIN. Stackivo validates the format.</li>
              <li>Enter your legal business name as it appears on your GST certificate.</li>
              <li>Add your SAC code for the services you provide (e.g. 998314 for IT design services).</li>
            </OL>

            <H3>How Stackivo calculates GST</H3>
            <P>
              Stackivo automatically determines the correct GST type based on your state
              and your client&apos;s state:
            </P>
            <UL>
              <li>
                <strong>CGST + SGST</strong> — when you and your client are in the same
                state (intra-state supply). Each is 9% for 18% GST rate.
              </li>
              <li>
                <strong>IGST</strong> — when you and your client are in different states,
                or when exporting services. Applied as a single 18% line.
              </li>
            </UL>
            <Callout type="info">
              Stackivo reads your state from your business address and your client&apos;s
              state from their GSTIN or billing address. Keep both up to date for accurate
              tax calculations.
            </Callout>

            <H3>Non-GST invoices</H3>
            <P>
              If you&apos;re not GST-registered, Stackivo generates clean invoices with no
              GST lines — just your service charges and totals. No configuration needed.
            </P>

            <H3>GST reports</H3>
            <P>
              Pro and Business users can download GST summary reports from{" "}
              <strong>Pulse → GST report</strong>. The report shows:
            </P>
            <UL>
              <li>Total taxable value by period</li>
              <li>CGST, SGST, and IGST collected</li>
              <li>Invoice-wise breakup (suitable for GSTR-1 filing)</li>
            </UL>
            <Callout type="tip">
              Export the GST report as a CSV and share it with your CA at the end of each
              quarter. It maps directly to the GSTR-1 return format.
            </Callout>
          </DocSection>

          {/* ══════════════════════════════════════
              13. PAYMENTS
          ══════════════════════════════════════ */}
          <DocSection id="payments" title="Payments">
            <P>
              Stackivo integrates with Razorpay so your clients can pay invoices online
              in seconds — via UPI, IMPS, NEFT, debit/credit cards, or net banking — all
              without leaving the invoice page.
            </P>

            <H3>Connecting Razorpay</H3>
            <OL>
              <li>
                Go to <strong>Settings → Integrations → Razorpay</strong>.
              </li>
              <li>
                Click <strong>Connect Razorpay</strong>. You&apos;ll be redirected to Razorpay
                to authorise the connection. If you don&apos;t have a Razorpay account, you can
                create one for free at{" "}
                <a
                  href="https://razorpay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
                >
                  razorpay.com
                </a>
                .
              </li>
              <li>Once authorised, return to Stackivo. The connection is active immediately.</li>
            </OL>

            <H3>How payment links work</H3>
            <P>
              When you send an invoice, Stackivo generates a Razorpay payment link and
              embeds a <strong>Pay now</strong> button on the hosted invoice page. When
              your client pays:
            </P>
            <UL>
              <li>Razorpay processes the payment and notifies Stackivo via webhook.</li>
              <li>The invoice status updates to <strong>Paid</strong> automatically.</li>
              <li>You receive an email confirmation.</li>
              <li>Your Pulse revenue figures update in real time.</li>
            </UL>

            <H3>Razorpay fees</H3>
            <P>
              Razorpay charges a transaction fee (typically 2% + GST for domestic cards;
              UPI transactions have their own rate structure). Stackivo does not add any
              markup — you pay only Razorpay&apos;s fees, which are deducted before settlement.
              Check{" "}
              <a
                href="https://razorpay.com/pricing/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
              >
                Razorpay&apos;s pricing page
              </a>{" "}
              for current rates.
            </P>

            <H3>Settlement timeline</H3>
            <P>
              Razorpay typically settles funds to your bank account within T+2 business
              days (T = transaction date). You can configure faster settlement in your
              Razorpay dashboard if eligible.
            </P>

            <H3>Recording offline payments</H3>
            <P>
              For bank transfers, cheques, or cash payments, open the invoice and click{" "}
              <strong>Mark as paid</strong>. Select the payment method, enter the date
              and amount, and save. The invoice status updates and the amount flows into
              your Pulse dashboard.
            </P>
          </DocSection>

          {/* ══════════════════════════════════════
              14. FAQ & TROUBLESHOOTING
          ══════════════════════════════════════ */}
          <DocSection id="faq" title="FAQ & Troubleshooting">

            <H3>Account & login</H3>

            <p className="font-medium text-foreground">Can I change the email address on my account?</p>
            <P>
              Yes. Go to <strong>Settings → Profile</strong> and update your email. You&apos;ll
              receive a verification link at the new address before the change takes effect.
            </P>

            <p className="mt-4 font-medium text-foreground">I&apos;m not receiving verification emails.</p>
            <P>
              Check your spam folder first. If the email isn&apos;t there, wait 2–3 minutes and
              request a new link. If the problem persists, contact support via the chat
              bubble in the bottom-right corner.
            </P>

            <H3>Invoices</H3>

            <p className="font-medium text-foreground">My client says they didn&apos;t receive the invoice email.</p>
            <P>
              Open the invoice and click <strong>Resend</strong>. Also share the hosted
              invoice link directly via WhatsApp or chat — your client can pay from there
              without needing the email.
            </P>

            <p className="mt-4 font-medium text-foreground">Can I edit a sent invoice?</p>
            <P>
              Yes, but with caution — editing a sent invoice resets its status to Draft.
              You&apos;ll need to resend it. If the invoice has already been paid, you cannot
              edit it. Create a credit note instead.
            </P>

            <p className="mt-4 font-medium text-foreground">How do I delete an invoice?</p>
            <P>
              Open the invoice, click the three-dot menu, and select <strong>Cancel invoice</strong>.
              Stackivo does not permanently delete invoices to preserve your financial audit
              trail — cancelled invoices are marked void but remain in your records.
            </P>

            <H3>Payments</H3>

            <p className="font-medium text-foreground">My client paid but the invoice still shows as unpaid.</p>
            <P>
              If the payment was made via Razorpay, webhook delivery can take 1–2 minutes.
              Refresh the page. If it still hasn&apos;t updated after 10 minutes, go to your
              Razorpay dashboard to confirm the payment was captured, then manually mark
              the invoice as paid in Stackivo.
            </P>

            <p className="mt-4 font-medium text-foreground">Can I issue a refund through Stackivo?</p>
            <P>
              Refunds must be processed directly in your{" "}
              <a
                href="https://dashboard.razorpay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
              >
                Razorpay dashboard
              </a>
              . After issuing the refund there, update the invoice in Stackivo by marking
              it cancelled or adjusting the payment record.
            </P>

            <H3>GST</H3>

            <p className="font-medium text-foreground">My GSTIN is valid but Stackivo won&apos;t accept it.</p>
            <P>
              Ensure you&apos;re entering all 15 characters with no spaces. The format is:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                2-digit state code + 10-digit PAN + 1-digit entity number + Z + 1 checksum digit
              </code>
              . If the format is correct and it still fails, contact support.
            </P>

            <p className="mt-4 font-medium text-foreground">
              I have clients in the same state and different states. Does Stackivo handle
              both?
            </p>
            <P>
              Yes — automatically. Stackivo compares your state (from your business address)
              to your client&apos;s state (from their GSTIN or billing address) and applies
              CGST+SGST for intra-state or IGST for inter-state. No manual selection needed.
            </P>

            <H3>Plans & billing</H3>

            <p className="font-medium text-foreground">Can I switch from monthly to annual billing?</p>
            <P>
              Yes. Go to <strong>Settings → Billing</strong> and click{" "}
              <strong>Switch to annual</strong>. You&apos;ll be charged the annual rate, and any
              unused days from your current monthly cycle will be prorated as a credit.
            </P>

            <p className="mt-4 font-medium text-foreground">What happens to my data if I cancel?</p>
            <P>
              Your data is never deleted. If you cancel, you&apos;ll revert to the Free plan at
              the end of your billing period. All your invoices, clients, contracts, and
              files remain accessible.
            </P>

            <H3>Need more help?</H3>
            <P>
              Use the <strong>chat bubble</strong> in the bottom-right of any Stackivo page
              to talk to support. You can also email us at{" "}
              <a
                href="mailto:support@stackivo.me"
                className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
              >
                support@stackivo.me
              </a>
              . Pro and Business users receive priority responses within 4 business hours.
            </P>
          </DocSection>

        </div>
      </div>
    </Section>
  );
}
