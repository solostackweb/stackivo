import type { BusinessProfile } from "@/features/onboarding/types";

export function hasFreelancerSignature(profile: BusinessProfile | null | undefined): boolean {
  if (!profile?.signatureType) return false;
  if (profile.signatureType === "type") {
    return Boolean(profile.signatureTextValue?.trim());
  }
  return Boolean(profile.signatureImageUrl?.trim());
}

export function getFreelancerSignatureLabel(profile: BusinessProfile | null | undefined): string {
  if (!hasFreelancerSignature(profile)) return "Awaiting signature";
  if (profile?.signatureType === "type" && profile.signatureTextValue) {
    return profile.signatureTextValue;
  }
  return profile?.legalName || profile?.fullName || "Signed";
}
