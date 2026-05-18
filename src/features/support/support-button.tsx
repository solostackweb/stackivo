"use client";

/**
 * Floating in-app support entry point.
 *
 * Pinned bottom-right of every authenticated page (mounted from the
 * dashboard shell). Clicking it opens a small popover with three
 * affordances:
 *
 *   1. Chat with us  → opens Crisp (or a tooltip explaining chat is
 *                       offline if Crisp isn't configured).
 *   2. Browse help    → opens `NEXT_PUBLIC_ZOHO_DESK_HELP_URL` in a
 *                       new tab. Hidden when unset.
 *   3. Email support  → mailto:support@stackivo.me.
 *
 * Also includes a "Report a bug" link to /help for structured intake.
 * The button is keyboard-accessible (`?` opens it like Linear/Stripe).
 */

import * as React from "react";
import Link from "next/link";
import { LifeBuoy, MessageCircle, BookOpen, Mail, Bug, X } from "lucide-react";
import { env } from "@/config/env";
import { crisp } from "./crisp-provider";

export function SupportButton() {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut: `?` opens the popover. Skipped while typing
  // into an input/textarea/contenteditable.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click-outside closes.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        popoverRef.current?.contains(t) ||
        buttonRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const chatAvailable = env.crispWebsiteId !== "";
  const helpUrl = env.zohoDeskHelpUrl;

  // Layout strategy: both bubbles live in the bottom-right corner. When
  // Crisp is loaded we STACK vertically — the SupportButton sits ABOVE
  // the Crisp bubble — so they never overlap on narrow mobile viewports.
  // Crisp's bubble is ~56px tall; offset our button up by 72px (56+16)
  // when Crisp is present. Both honour the mobile bottom-nav height and
  // the device safe-area. z-[60] keeps our popover above Crisp's z-40.
  const baseBottom =
    "calc(env(safe-area-inset-bottom, 0px) + var(--mobile-bottom-nav-h, 16px) + 16px)";
  const stackedBottom = chatAvailable
    ? `calc(${baseBottom} + 72px)`
    : baseBottom;
  const popoverBottom = chatAvailable
    ? `calc(${baseBottom} + 72px + 56px)`
    : `calc(${baseBottom} + 56px)`;

  return (
    <>
      {/* Hidden on phones — on mobile the canonical entry point is the
          "Help & support" item in the MobileNav drawer, which avoids
          stacking yet-another floating widget on top of the Crisp bubble
          and the bottom-nav. The `?` keyboard shortcut still works for
          power users on any breakpoint. */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open support"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 z-[60] hidden h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground shadow-lg transition hover:scale-105 hover:shadow-xl active:scale-95 md:flex"
        style={{ bottom: stackedBottom }}
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <LifeBuoy className="h-5 w-5" aria-hidden />
        )}
      </button>

      {open ? (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Support menu"
          className="fixed right-4 z-[60] w-72 overflow-hidden rounded-lg border bg-card shadow-xl"
          style={{ bottom: popoverBottom }}
        >
          <div className="border-b bg-muted/30 px-3 py-2.5">
            <div className="text-sm font-semibold">How can we help?</div>
            <div className="text-[11px] text-muted-foreground">
              Reach the founder · usually replies within a few hours
            </div>
          </div>

          <ul className="text-sm">
            {chatAvailable ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    crisp.open();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/40"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span className="flex-1">Chat with us</span>
                  <span className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    online
                  </span>
                </button>
              </li>
            ) : null}

            {helpUrl ? (
              <li>
                <a
                  href={helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 transition hover:bg-muted/40"
                >
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="flex-1">Browse help articles</span>
                  <span className="text-[10px] text-muted-foreground">↗</span>
                </a>
              </li>
            ) : null}

            <li>
              <Link
                href="/help"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-3 py-2.5 transition hover:bg-muted/40"
              >
                <Bug className="h-4 w-4 text-orange-600" />
                <span className="flex-1">Report a bug or request a feature</span>
              </Link>
            </li>

            <li className="border-t">
              <a
                href="mailto:support@stackivo.me"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-muted-foreground transition hover:bg-muted/40"
              >
                <Mail className="h-4 w-4" />
                <span className="flex-1">Email support@stackivo.me</span>
              </a>
            </li>
          </ul>

          <div className="border-t bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
            Press <kbd className="rounded border bg-background px-1 font-mono">?</kbd>{" "}
            to open this menu anywhere.
          </div>
        </div>
      ) : null}
    </>
  );
}
