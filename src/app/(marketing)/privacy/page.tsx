import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketing/prose-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy policy · Stackivo",
  description:
    "How Stackivo collects, uses, and protects your personal data — written in plain English and compliant with India's DPDP Act.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Stackivo privacy policy",
    description: "How we collect, use, and protect your personal data.",
    url: `${siteConfig.url}/privacy`,
  },
};

export const dynamic = "force-static";

const EFFECTIVE_DATE = "1 January 2026";

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy policy"
      lead={
        <>
          Effective: {EFFECTIVE_DATE}. We treat your data the way we&rsquo;d
          want ours treated. This policy explains what we collect, why, and
          how to control it.
        </>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        Stackivo (the &ldquo;<strong>Service</strong>&rdquo;) is operated by
        Stackivo. We act as the data fiduciary (under India&rsquo;s Digital
        Personal Data Protection Act, 2023) for personal data you provide
        through the Service.
      </p>

      <h2>2. What we collect</h2>

      <h3>Account data</h3>
      <ul>
        <li>Name, email, password (hashed), profile photo if you upload one.</li>
        <li>Business information you choose to add: business name, GSTIN, address.</li>
      </ul>

      <h3>Operational data</h3>
      <ul>
        <li>The clients, invoices, contracts, projects, and time entries you create.</li>
        <li>Files you upload (logos, signatures, contract attachments).</li>
        <li>Payment records, including Razorpay payment / subscription IDs.</li>
      </ul>

      <h3>Telemetry &amp; logs</h3>
      <ul>
        <li>IP address, user agent, and access timestamps for security purposes.</li>
        <li>
          Aggregated, opt-respecting product analytics (e.g. which features are
          used). We strip personal identifiers from these events.
        </li>
        <li>Error reports (Sentry) — scrubbed of credentials before being sent.</li>
      </ul>

      <h3>Cookies</h3>
      <ul>
        <li>Strictly necessary cookies for authentication and session management.</li>
        <li>Optional analytics cookies (PostHog) — respects your browser&rsquo;s Do Not Track signal.</li>
        <li>No third-party advertising trackers.</li>
      </ul>

      <h2>3. How we use your data</h2>
      <ul>
        <li>To operate the Service: authenticate you, run your workflows, send invoices.</li>
        <li>To process payments and subscriptions through Razorpay (our PCI-compliant payment processor).</li>
        <li>To send essential transactional email (receipts, invoice notifications, password resets, security alerts).</li>
        <li>To improve the product through aggregated analytics.</li>
        <li>To prevent fraud, abuse, and security incidents.</li>
        <li>To meet legal obligations (e.g. GST records retention).</li>
      </ul>
      <p>We don&rsquo;t sell your data. We don&rsquo;t use it to train AI models.</p>

      <h2>4. Where your data lives</h2>
      <ul>
        <li>Database + file storage: Supabase (Frankfurt, Germany).</li>
        <li>Email delivery: Brevo (EU).</li>
        <li>Error tracking: Sentry (EU).</li>
        <li>Analytics: PostHog (EU).</li>
        <li>Payments: Razorpay (India), per their terms.</li>
        <li>Customer support: Crisp + Zoho Desk, when you choose to contact us.</li>
      </ul>
      <p>
        All data in transit is encrypted with TLS 1.2 or higher. Data at rest
        is encrypted on the database and storage layer.
      </p>

      <h2>5. Sharing</h2>
      <p>We share data only with:</p>
      <ul>
        <li>Service providers listed above (data processors), under strict contracts.</li>
        <li>Authorities, when legally compelled (we&rsquo;ll narrow disclosure to what&rsquo;s required).</li>
        <li>Successors in case of acquisition or merger — with notice and a chance to delete first.</li>
      </ul>

      <h2>6. Retention</h2>
      <ul>
        <li>Account &amp; operational data: retained while your account is active.</li>
        <li>On account deletion: soft-deleted immediately, permanently deleted after a 30-day recovery window.</li>
        <li>Tax-related records (e.g. GST invoices): retained for 8 years per Indian law, even after account deletion, in anonymised form.</li>
        <li>Server logs: 90 days.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>
        Under the DPDP Act, you have the right to access, correct, erase, and
        port your data. You can:
      </p>
      <ul>
        <li>
          Export your data as JSON from{" "}
          <strong>Settings → Data &amp; export</strong> in the dashboard.
        </li>
        <li>Delete your account from <strong>Settings → Account</strong>.</li>
        <li>
          Email <a href="mailto:privacy@stackivo.me">privacy@stackivo.me</a>{" "}
          for any other request — we respond within 30 days.
        </li>
      </ul>
      <p>
        You can also lodge a complaint with the Indian Data Protection Board
        if you&rsquo;re unhappy with how we handle your data.
      </p>

      <h2>8. Children</h2>
      <p>
        Stackivo is not intended for users under 18. We don&rsquo;t knowingly
        collect personal data from children.
      </p>

      <h2>9. Security</h2>
      <ul>
        <li>Workspace data is isolated through Supabase row-level security.</li>
        <li>Passwords are hashed with bcrypt; sessions use secure HTTP-only cookies.</li>
        <li>Optional MFA (TOTP) is available in account settings.</li>
        <li>We monitor security events and respond to suspicious activity.</li>
        <li>
          If we ever experience a breach, we&rsquo;ll notify affected users
          within 72 hours.
        </li>
      </ul>

      <h2>10. Changes</h2>
      <p>
        Material changes to this policy will be announced via email or
        in-product notice at least 14 days before they take effect.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions or requests? Email{" "}
        <a href="mailto:privacy@stackivo.me">privacy@stackivo.me</a> or use
        the <Link href="/contact">contact page</Link>.
      </p>
    </ProsePage>
  );
}
