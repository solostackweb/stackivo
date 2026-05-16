import * as React from "react";
import {
  getSignatureFontFamily,
  hasSignatureReference,
  type ContractSignatureReference,
} from "@/features/contracts/signatures";
import { cn } from "@/lib/utils";

interface SignatureMarkProps {
  signature: ContractSignatureReference | null | undefined;
  fallbackName: string;
  alt: string;
  className?: string;
}

export function SignatureMark({
  signature,
  fallbackName,
  alt,
  className,
}: SignatureMarkProps) {
  if (signature?.type === "type" && signature.textValue?.trim()) {
    return (
      <span
        className={cn("block truncate text-3xl italic leading-none", className)}
        style={{ fontFamily: getSignatureFontFamily(signature.fontFamily) }}
      >
        {signature.textValue}
      </span>
    );
  }

  if (
    (signature?.type === "draw" || signature?.type === "upload") &&
    signature.imageUrl?.trim()
  ) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={signature.imageUrl}
        alt={alt}
        className={cn("max-h-16 max-w-full object-contain", className)}
      />
    );
  }

  if (hasSignatureReference(signature)) return null;

  return (
    <span className={cn("text-sm italic text-muted-foreground", className)}>
      {fallbackName}
    </span>
  );
}
