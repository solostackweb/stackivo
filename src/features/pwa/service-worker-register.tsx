"use client";

import * as React from "react";

/**
 * Custom window event fired when a newly-installed service worker is sitting
 * in the `waiting` state — i.e. there's a fresh version of the app shell
 * ready to take over on next reload. `UpdatePrompt` listens for this and
 * surfaces a premium "Update available" banner.
 */
export const SW_UPDATE_READY_EVENT = "stackivo:sw-update-ready";

/**
 * Posts SKIP_WAITING to the currently-waiting service worker. After it
 * activates, the `controllerchange` listener in `ServiceWorkerRegister`
 * reloads the page so the new shell is fully in control.
 */
export function applyServiceWorkerUpdate() {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg?.waiting) {
      reg.waiting.postMessage("SKIP_WAITING");
    }
  });
}

/**
 * Registers the service worker once on the client. No-ops in dev (HMR + SW
 * is a recipe for stale builds), and SSR-safe.
 *
 * Also wires up the update-available flow:
 *   1. On every registration we look for a `waiting` worker; if one exists,
 *      we immediately broadcast `SW_UPDATE_READY_EVENT`.
 *   2. We listen for `updatefound` on the registration to catch newly
 *      installing workers and broadcast once they reach `installed` while a
 *      controller already exists (= a true update, not first install).
 *   3. We listen for `controllerchange` so that once SKIP_WAITING is sent
 *      (via `applyServiceWorkerUpdate`), the page reloads exactly once.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const announceWaiting = () => {
      window.dispatchEvent(new Event(SW_UPDATE_READY_EVENT));
    };

    const wireUpdates = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        announceWaiting();
      }
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            announceWaiting();
          }
        });
      });
    };

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(wireUpdates)
        .catch(() => {
          /* registration failures are non-fatal — app still works without SW */
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    return () => {
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
