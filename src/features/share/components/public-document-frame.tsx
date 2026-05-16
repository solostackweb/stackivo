import * as React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Pre-formatted heading (e.g. "Invoice INV-0042"). */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Sender / freelancer attribution, rendered top-right. */
  senderName: string;
  /** Status pill content, rendered next to the eyebrow. */
  statusBadge?: React.ReactNode;
  /** PDF download URL. */
  pdfUrl: string;
  pdfFileName: string;
  children: React.ReactNode;
  /** Optional extra CTA in the toolbar (e.g. "Sign now"). */
  primaryAction?: React.ReactNode;
}

/**
 * Visual chrome for shared invoices, contracts, and proposals. Matches
 * the in-app document preview but without any auth-gated controls.
 */
export function PublicDocumentFrame({
  eyebrow,
  title,
  subtitle,
  senderName,
  statusBadge,
  pdfUrl,
  pdfFileName,
  children,
  primaryAction,
}: Props) {
  return (
    <div className="min-h-svh bg-muted/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-8 lg:py-10">
      <header className="sticky top-0 z-20 -mx-3 mb-4 border-b bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:mb-6 sm:rounded-lg sm:border sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
            {statusBadge}
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={pdfUrl} download={pdfFileName} rel="noopener">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </Button>
          {primaryAction}
        </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">{children}</div>

      <footer className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Sent by <span className="text-foreground">{senderName}</span>
        </p>
        <p>
          Powered by{" "}
          <Link
            href="/"
            className={cn(
              "font-medium text-foreground hover:underline",
              "underline-offset-2",
            )}
          >
            Stackivo
          </Link>
        </p>
      </footer>
      </div>
    </div>
  );
}
