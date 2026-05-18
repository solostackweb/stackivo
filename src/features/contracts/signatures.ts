export type ContractSignatureType = "draw" | "type" | "upload";

export interface ContractSignatureReference {
  type: ContractSignatureType | null;
  imageUrl?: string | null;
  textValue?: string | null;
  fontFamily?: string | null;
}

export function hasSignatureReference(
  signature: ContractSignatureReference | null | undefined,
): signature is ContractSignatureReference & { type: ContractSignatureType } {
  if (!signature?.type) return false;
  if (signature.type === "type") return Boolean(signature.textValue?.trim());
  return Boolean(signature.imageUrl?.trim());
}

export function getSignatureFontFamily(fontFamily?: string | null): string {
  switch (fontFamily) {
    case "great-vibes":
      return '"Great Vibes", "Dancing Script", cursive';
    case "pacifico":
      return '"Pacifico", "Dancing Script", cursive';
    case "satisfy":
      return '"Satisfy", "Dancing Script", cursive';
    default:
      return '"Dancing Script", "Segoe Script", cursive';
  }
}
