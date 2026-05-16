/**
 * Public types for the PWA layer.
 */

/**
 * Chrome's `beforeinstallprompt` event. Not in the standard lib.dom.d.ts
 * yet, so we declare a minimal local shape.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}
