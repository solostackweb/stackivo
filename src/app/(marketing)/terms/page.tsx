import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketing/prose-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of service · Stackivo",
  description:
    "The terms governing use of Stackivo's freelancer business platform.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Stackivo terms of service",
    description: "The terms governing use of Stackivo.",
    url: `${siteConfig.url}/terms`,
  },
};

export const dynamic = "force-static";

const EFFECTIVE_DATE = "1 January 2026";

export default function TermsPage() {
  return (
    <ProsePage
      title="Terms of service"
      lead={
        <>
          Effective: {EFFECTIVE_DATE}. This is a plain-English summary intended
          to be readable. The defined terms are still binding.
        </>
      }
    >
      <p>
        These terms (the &ldquo;<strong>Terms</strong>&rdquo;) govern your use
        of Stackivo (the &ldquo;<strong>Service</strong>&rdquo;) operated by
        Stackivo. By creating an account or using the Service you agree to
        these Terms. If you don&rsquo;t agree, please don&rsquo;t use the
        Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        Stackivo is a software-as-a-service platform that helps freelancers and
        small businesses manage clients, invoices, contracts, projects, time
        tracking, and analytics. The Service is provided on an
        &ldquo;as-is&rdquo; basis and we improve it continuously.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>
          You must be at least 18 years old and capable of entering into a
          binding contract.
        </li>
        <li>
          You are responsible for keeping your login credentials secure.
        </li>
        <li>
          You agree to provide accurate registration information and to keep
          it up to date.
        </li>
        <li>
          You may not use the Service to violate the law, infringe rights, or
          send spam.
        </li>
      </ul>

      <h2>3. Plans, billing, and refunds</h2>
      <ul>
        <li>
          Free plans remain free, capped at the limits described on{" "}
          <Link href="/pricing">our pricing page</Link>.
        </li>
        <li>
          Paid plans renew automatically until cancelled. Cancellation takes
          effect at the end of the current billing period; you keep paid
          features until then.
        </li>
        <li>
          You can request a refund within 30 days of any payment by emailing
          us at <a href="mailto:support@stackivo.me">support@stackivo.me</a>.
          We process refunds in good faith.
        </li>
        <li>All prices are in INR. GST is applied where applicable.</li>
      </ul>

      <h2>4. Your data</h2>
      <ul>
        <li>
          You retain ownership of all the data you put into Stackivo (clients,
          invoices, contracts, files, etc.).
        </li>
        <li>
          We process your data only to provide and improve the Service. See
          the <Link href="/privacy">privacy policy</Link> for details.
        </li>
        <li>
          You can export everything as JSON from the dashboard at any time.
        </li>
        <li>
          On account deletion, we soft-delete your data immediately and
          permanently delete it after a 30-day recovery window.
        </li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You won&rsquo;t use the Service to:</p>
      <ul>
        <li>Send unsolicited bulk messages, scams, or phishing.</li>
        <li>Upload malware, illegal material, or content that infringes rights.</li>
        <li>Attempt to circumvent security, rate limits, or access controls.</li>
        <li>Resell the Service without our written permission.</li>
      </ul>
      <p>
        We may suspend or terminate accounts that breach these rules, with or
        without notice.
      </p>

      <h2>6. Service availability</h2>
      <p>
        We strive for high availability but don&rsquo;t guarantee
        uninterrupted access. We may perform maintenance, change features, or
        retire features with reasonable notice.
      </p>

      <h2>7. Liability</h2>
      <p>
        To the maximum extent permitted by law, Stackivo&rsquo;s total
        liability arising out of or related to the Service is limited to the
        amount you paid us in the 12 months preceding the event giving rise
        to the claim. We&rsquo;re not liable for indirect, consequential, or
        incidental damages.
      </p>

      <h2>8. Changes to these terms</h2>
      <p>
        We may update these Terms occasionally. Material changes will be
        announced via email or in-product notice at least 14 days before they
        take effect. Continued use after the effective date constitutes
        acceptance.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Any disputes will be
        resolved in the courts of Mumbai, Maharashtra, unless required
        otherwise by mandatory consumer-protection law.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:support@stackivo.me">support@stackivo.me</a> or via
        the <Link href="/contact">contact page</Link>.
      </p>
    </ProsePage>
  );
}
