"use client";

/**
 * Invoice share action buttons — "Copy link" + "Share on WhatsApp".
 *
 * Rendered as a client component inside the (server) invoice detail page.
 * If the invoice already has a public_token it's passed in as `publicToken`
 * and no server round-trip is needed on first click. Otherwise we mint one
 * lazily via `ensureInvoicePublicTokenAction`.
 */

import * as React from "react";
import { Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/features/profile/context";
import { ensureInvoicePublicTokenAction } from "@/features/share/actions";
import { shareOnWhatsApp } from "@/lib/whatsapp";

interface InvoiceShareButtonsProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  clientName?: string | null;
  clientPhone?: string | null;
  /** Pre-populated if the token already exists — avoids an extra round-trip. */
  publicToken?: string | null;
}

export function InvoiceShareButtons({
  invoiceId,
  invoiceNumber,
  totalAmount,
  clientName,
  clientPhone,
  publicToken: initialToken,
}: InvoiceShareButtonsProps) {
  const { profile } = useProfile();
  const [pending, setPending] = React.useState<"copy" | "whatsapp" | null>(null);
  // Cache the minted token so subsequent clicks are instant.
  const tokenRef = React.useRef<string | null>(initialToken ?? null);

  const senderName =
    profile?.businessName ?? profile?.legalName ?? profile?.fullName ?? null;

  async function getOrMintToken(): Promise<string | null> {
    if (tokenRef.current) return tokenRef.current;
    const res = await ensureInvoicePublicTokenAction({ invoiceId });
    if (!res.ok) {
      toast.error(res.error ?? "Could not create share link.");
      return null;
    }
    const token = res.data?.token ?? null;
    tokenRef.current = token;
    return token;
  }

  const handleCopy = async () => {
    setPending("copy");
    const token = await getOrMintToken();
    setPending(null);
    if (!token) return;
    const url = `${window.location.origin}/i/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard.");
    } catch {
      window.open(url, "_blank");
      toast.success("Share link opened in a new tab.");
    }
  };

  const handleWhatsApp = async () => {
    setPending("whatsapp");
    const token = await getOrMintToken();
    setPending(null);
    if (!token) return;
    shareOnWhatsApp({
      phone: clientPhone,
      clientName,
      documentType: "invoice",
      documentNumber: invoiceNumber,
      amount: totalAmount,
      senderName,
      shareUrl: `${window.location.origin}/i/${token}`,
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 sm:flex-none"
        onClick={handleCopy}
        disabled={pending !== null}
        aria-label="Copy share link"
      >
        {pending === "copy" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Copy link</span>
        <span className="sm:hidden">Link</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="flex-1 gap-1.5 border-[#25D366]/40 bg-[#25D366]/5 text-[#128C7E] hover:bg-[#25D366]/15 hover:text-[#128C7E] dark:border-[#25D366]/30 dark:bg-[#25D366]/10 dark:text-[#25D366] sm:flex-none"
        onClick={handleWhatsApp}
        disabled={pending !== null}
        aria-label="Share on WhatsApp"
      >
        {pending === "whatsapp" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
        )}
        <span className="hidden sm:inline">WhatsApp</span>
        <span className="sm:hidden">WA</span>
      </Button>
    </>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp brand icon (inline SVG — no extra dependency)
// ---------------------------------------------------------------------------

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
