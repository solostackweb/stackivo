"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, LockKeyhole, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SignatureCaptureModal } from "@/features/share/components/signature-capture-modal";
import type { BusinessProfile } from "@/features/onboarding/types";

export type FreelancerSignatureData = {
  type: "draw" | "type" | "upload";
  imageUrl?: string;
  textValue?: string;
  fontFamily?: string;
  legalName: string;
};

interface FreelancerSignatureCardProps {
  profile: BusinessProfile | null;
  title: string;
  description: string;
  buttonLabel: string;
  onSave: (signature: FreelancerSignatureData) => Promise<void>;
  onSaved?: () => void;
  showPreview?: boolean;
  compact?: boolean;
}

export function FreelancerSignatureCard({
  profile,
  title,
  description,
  buttonLabel,
  onSave,
  onSaved,
  showPreview = true,
  compact = false,
}: FreelancerSignatureCardProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const legalName = profile?.legalName ?? profile?.fullName ?? "";
  const hasSignature = Boolean(
    profile?.signatureUpdatedAt ||
      (profile?.signatureType &&
        (profile.signatureType !== "type"
          ? profile.signatureImageUrl
          : profile.signatureTextValue)),
  );

  const previewContent =
    profile?.signatureType === "type" && profile.signatureTextValue ? (
      <span
        className="text-3xl italic text-foreground"
        style={{
          fontFamily:
            profile.signatureFontFamily === "great-vibes"
              ? '"Great Vibes", cursive'
              : profile.signatureFontFamily === "pacifico"
                ? '"Pacifico", cursive'
                : profile.signatureFontFamily === "satisfy"
                  ? '"Satisfy", cursive'
                  : '"Dancing Script", cursive',
        }}
      >
        {profile.signatureTextValue}
      </span>
    ) : profile?.signatureImageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.signatureImageUrl}
        alt="Freelancer signature"
        className="max-h-20 max-w-full object-contain"
      />
    ) : (
      <span className="text-sm text-muted-foreground">
        Signature not added yet
      </span>
    );

  const handleSave = async (signature: FreelancerSignatureData) => {
    if (hasSignature) {
      toast.error("Your saved signature is locked.");
      return;
    }

    setPending(true);
    try {
      await onSave(signature);
      toast.success("Signature saved");
      setOpen(false);
      onSaved?.();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save signature",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Card className={compact ? "border-dashed" : undefined}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {hasSignature ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Locked
              </div>
            ) : null}
          </div>

          {showPreview ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Preview
              </p>
              <div className="flex min-h-20 items-end border-b border-dashed border-border pb-2">
                {previewContent}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {legalName || "Your legal name"}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            {hasSignature ? (
              <p className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <LockKeyhole className="h-4 w-4" />
                Signature registered permanently
              </p>
            ) : (
              <Button
                type="button"
                onClick={() => setOpen(true)}
                disabled={pending}
              >
                <PenLine className="h-4 w-4" />
                {pending ? "Saving..." : buttonLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <SignatureCaptureModal
        open={open}
        onClose={() => setOpen(false)}
        onSignatureCapture={handleSave}
        title="Freelancer Signature"
        description="Choose how Stackivo should represent your signature on contracts and invoices."
        submitLabel="Save signature"
        showConsent={false}
        defaultLegalName={legalName}
      />
    </>
  );
}
