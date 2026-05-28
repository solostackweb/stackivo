"use client";

/**
 * ThreadReplyBox — textarea + send button at the bottom of a thread.
 * Posts via sendThreadReplyAction (Crisp API).
 */

import * as React from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { sendThreadReplyAction } from "@/features/support/actions";

interface Props {
  threadId: string;
}

export function ThreadReplyBox({ threadId }: Props) {
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setPending(true);
    const res = await sendThreadReplyAction(threadId, trimmed);
    setPending(false);
    if (res.ok) {
      toast.success("Reply sent");
      setMessage("");
      textareaRef.current?.focus();
    } else {
      toast.error(res.error ?? "Send failed");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card">
      <div className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Reply
      </div>
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a reply… (⌘↵ to send)"
          rows={4}
          disabled={pending}
          className="w-full resize-none rounded border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className={message.length > 4500 ? "text-[11px] text-red-500" : "text-[11px] text-muted-foreground"}>
            {message.length} / 5000
          </span>
          <button
            type="button"
            disabled={pending || !message.trim() || message.length > 5000}
            onClick={handleSend}
            className="inline-flex h-8 items-center gap-1.5 rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send reply
          </button>
        </div>
      </div>
    </div>
  );
}
