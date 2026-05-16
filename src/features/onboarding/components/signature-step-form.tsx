"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { BusinessProfile } from "../types";
import { FreelancerSignatureCard } from "@/features/profile/components/freelancer-signature-card";
import { saveSignatureStepData } from "../actions";

export function SignatureStepForm({ profile }: { profile: BusinessProfile }) {
  const router = useRouter();

  const handleSave = React.useCallback(
    async (signature: {
      type: "draw" | "type" | "upload";
      imageUrl?: string;
      textValue?: string;
      fontFamily?: string;
      legalName: string;
    }) => {
      const res = await saveSignatureStepData({
        signatureType: signature.type,
        signatureImageUrl: signature.imageUrl,
        signatureTextValue: signature.textValue,
        signatureFontFamily: signature.fontFamily,
      });
      if (!res.ok) {
        toast.error(res.error);
        throw new Error(res.error);
      }
      router.push("/onboarding/first-client");
      router.refresh();
    },
    [router],
  );

  return (
    <FreelancerSignatureCard
      profile={profile}
      title="Configure your signature"
      description="This signature will appear on your contracts and invoices."
      buttonLabel="Add signature"
      onSave={handleSave}
      showPreview
    />
  );
}
