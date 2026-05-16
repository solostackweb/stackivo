"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/features/pwa/service-worker-register";
import { OfflineIndicator } from "@/features/pwa/offline-indicator";
import { InstallPrompt } from "@/features/pwa/install-prompt";
import { UpdatePrompt } from "@/features/pwa/update-prompt";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import { ClarityProvider } from "@/lib/analytics/clarity-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PostHogProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
          <OfflineIndicator />
          <InstallPrompt />
          <UpdatePrompt />
          <ServiceWorkerRegister />
          {/* Microsoft Clarity heatmaps + replay. No-ops when the env var
              isn't set, so safe to leave mounted globally. */}
          <ClarityProvider />
        </TooltipProvider>
      </PostHogProvider>
    </ThemeProvider>
  );
}
