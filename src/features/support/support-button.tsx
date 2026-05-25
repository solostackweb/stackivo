"use client";

import * as React from "react";
import Link from "next/link";
import { LifeBuoy, MessageCircle, BookOpen, Mail, Bug, X } from "lucide-react";
import { env } from "@/config/env";
import { crisp } from "./crisp-provider";

export function SupportButton() {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  // `?` keyboard shortcut — skipped while typing in inputs.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
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
      if (popoverRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const chatAvailable = env.crispWebsiteId !== "";
  const helpUrl = env.zohoDeskHelpUrl;

  // Simple, stable positioning: 24px from the right/bottom edge on desktop.
  // When Crisp's bubble is present (~56px tall + 16px gap) we shift our
  // button up by 72px so they never overlap.
  const btnBottom = chatAvailable ? 96 : 24;
  const popoverBottom = btnBottom + 56;

  return (
    <>
      {/* Desktop only — on mobile the bottom nav "Help & support" item is the entry point */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open support"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed right-5 z-[60] hidden h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground shadow-md transition hover:scale-105 hover:shadow-lg active:scale-95 md:flex"
        style={{ bottom: `${btnBottom}px` }}
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <LifeBuoy className="h-4 w-4" aria-hidden />}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Support menu"
          className="fixed right-5 z-[60] w-72 overflow-hidden rounded-xl border bg-card shadow-xl"
          style={{ bottom: `${popoverBottom}px` }}
        >
          <div className="border-b bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">How can we help?</p>
            <p className="text-[11px] text-muted-foreground">
              Reach the founder · usually replies within a few hours
            </p>
          </div>

          <ul className="text-sm">
            {chatAvailable && (
              <li>
                <button
                  type="button"
                  onClick={() => { crisp.open(); setOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted/40"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span className="flex-1">Chat with us</span>
                  <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">online</span>
                </button>
              </li>
            )}

            {helpUrl && (
              <li>
                <a
                  href={helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40"
                >
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="flex-1">Browse help articles</span>
                  <span className="text-[10px] text-muted-foreground">↗</span>
                </a>
              </li>
            )}

            <li>
              <Link
                href="/help"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40"
              >
                <Bug className="h-4 w-4 text-orange-500" />
                <span className="flex-1">Report a bug or request a feature</span>
              </Link>
            </li>

            <li className="border-t">
              <a
                href="mailto:support@stackivo.me"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-muted-foreground transition hover:bg-muted/40"
              >
                <Mail className="h-4 w-4" />
                <span className="flex-1">Email support@stackivo.me</span>
              </a>
            </li>
          </ul>

          <div className="border-t bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
            Press <kbd className="rounded border bg-background px-1 font-mono">?</kbd> to open anywhere.
          </div>
        </div>
      )}
    </>
  );
}
