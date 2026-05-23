"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sendInvoiceAction } from "../delivery";

interface SendInvoiceButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  /** Rendered as compact icon-only on xs screens when true */
  compact?: boolean;
}

export function SendInvoiceButton({
  invoiceId,
  invoiceNumber,
  compact,
}: SendInvoiceButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleSend() {
    setPending(true);
    try {
      const result = await sendInvoiceAction({ invoiceId });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to send invoice");
      } else {
        toast.success(`Invoice ${invoiceNumber} sent to client`);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleSend}
      disabled={pending}
      className={compact ? "flex-1 sm:flex-none" : undefined}
    >
      <Send className="h-4 w-4" />
      {compact ? (
        <>
          <span className="sm:hidden">Send</span>
          <span className="hidden sm:inline">Send invoice</span>
        </>
      ) : (
        "Send invoice"
      )}
    </Button>
  );
}
