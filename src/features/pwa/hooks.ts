"use client";

import * as React from "react";
import type { BeforeInstallPromptEvent } from "./types";

/**
 * Tracks the browser's online/offline status. SSR-safe (defaults to online).
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

/**
 * `true` when the page is being rendered as an installed PWA
 * (display-mode standalone, iOS standalone, or launched from the home screen).
 */
export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(display-mode: standalone)");
    const iosStandalone =
      "standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    const update = () => setStandalone(mq.matches || iosStandalone);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return standalone;
}

/**
 * `true` for iOS Safari, which does not fire `beforeinstallprompt` and
 * requires manual "Share → Add to Home Screen" instructions.
 */
export function useIsIos(): boolean {
  const [ios, setIos] = React.useState(false);
  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIos(isIos);
  }, []);
  return ios;
}

/**
 * Captures the deferred `beforeinstallprompt` event so the UI can offer a
 * branded install CTA at the right moment.
 */
export function useInstallPrompt() {
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Consume any event captured by the inline beforeInteractive script that
    // ran before React hydrated (window.__pwa_prompt is set there).
    const earlyCapture = (
      window as Window & { __pwa_prompt?: BeforeInstallPromptEvent | null }
    ).__pwa_prompt;
    if (earlyCapture) {
      setEvent(earlyCapture);
      (
        window as Window & { __pwa_prompt?: BeforeInstallPromptEvent | null }
      ).__pwa_prompt = null;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!event) return { outcome: "dismissed" as const };
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setEvent(null);
    }
    return choice;
  }, [event]);

  return {
    /** True when the browser has surfaced an install opportunity. */
    canInstall: Boolean(event),
    /** True after the app has been installed in this session. */
    installed,
    promptInstall,
  };
}

/**
 * Reads/writes a persisted dismissal flag for the install banner so we
 * don't re-prompt on every load. Keyed by `storageKey` to allow per-banner
 * scoping in the future.
 */
export function useDismissible(storageKey: string, ttlMs?: number) {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Number(raw);
      if (!Number.isFinite(ts)) {
        setDismissed(false);
        return;
      }
      if (ttlMs && Date.now() - ts > ttlMs) {
        window.localStorage.removeItem(storageKey);
        setDismissed(false);
        return;
      }
      setDismissed(true);
    } catch {
      setDismissed(false);
    }
  }, [storageKey, ttlMs]);

  const dismiss = React.useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      /* storage unavailable — silently degrade */
    }
  }, [storageKey]);

  return { dismissed, dismiss };
}
