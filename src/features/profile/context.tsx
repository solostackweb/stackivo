"use client";

import * as React from "react";
import type { BusinessProfile } from "@/features/onboarding/types";
import type { CurrentSubscription } from "@/features/subscription/types";

interface ProfileContextValue {
  profile: BusinessProfile | null;
  subscription: CurrentSubscription | null;
  setProfile: (profile: BusinessProfile | null) => void;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = React.createContext<ProfileContextValue | undefined>(
  undefined,
);

export function ProfileProvider({
  initialProfile,
  initialSubscription,
  children,
}: {
  initialProfile: BusinessProfile | null;
  initialSubscription: CurrentSubscription | null;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = React.useState<BusinessProfile | null>(
    initialProfile,
  );
  const [subscription, setSubscription] =
    React.useState<CurrentSubscription | null>(initialSubscription);

  /**
   * Sync local state to fresh server props ONLY when the underlying record
   * actually changes (different id / plan / updatedAt), not when RSC merely
   * re-runs and hands us new object references for the same data.
   *
   * Without this guard, every dashboard navigation re-runs `requireOnboarded`
   * + `getCurrentSubscription`, returns fresh object refs, and the previous
   * `[initialProfile, initialSubscription]` dep array fires this effect →
   * re-render storm across every `useProfile()` consumer (sidebar, top nav,
   * user menu, etc.) on every link click.
   */
  const profileSig = initialProfile?.userId ?? "";
  const subscriptionSig = initialSubscription
    ? `${initialSubscription.userId}:${initialSubscription.plan}:${initialSubscription.status}:${initialSubscription.currentPeriodEnd ?? ""}`
    : "";

  React.useEffect(() => {
    setProfile(initialProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileSig]);

  React.useEffect(() => {
    setSubscription(initialSubscription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionSig]);

  const refreshProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { profile: BusinessProfile | null };
      setProfile(data.profile ?? null);
    } catch {
      // Ignore refresh failures; UI can retry.
    }
  }, []);

  const value = React.useMemo(
    () => ({ profile, subscription, setProfile, refreshProfile }),
    [profile, subscription, refreshProfile],
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = React.useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
}
