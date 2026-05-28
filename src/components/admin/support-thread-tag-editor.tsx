"use client";

/**
 * ThreadTagEditor — inline tag management for a support thread.
 * Shows existing tags as chips; add new via input, remove via ×.
 */

import * as React from "react";
import { toast } from "sonner";
import { X, Plus, Loader2 } from "lucide-react";
import { addThreadTagAction, removeThreadTagAction } from "@/features/support/actions";

interface Props {
  threadId: string;
  initialTags: string[];
}

export function ThreadTagEditor({ threadId, initialTags }: Props) {
  const [tags, setTags] = React.useState<string[]>(initialTags);
  const [input, setInput] = React.useState("");
  const [pendingRemove, setPendingRemove] = React.useState<string | null>(null);
  const [addPending, setAddPending] = React.useState(false);

  async function handleAdd() {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || addPending || tags.includes(trimmed)) return;
    setAddPending(true);
    const res = await addThreadTagAction(threadId, trimmed);
    setAddPending(false);
    if (res.ok) {
      setTags((prev) => [...prev, trimmed]);
      setInput("");
    } else {
      toast.error(res.error ?? "Could not add tag");
    }
  }

  async function handleRemove(tag: string) {
    setPendingRemove(tag);
    const res = await removeThreadTagAction(threadId, tag);
    setPendingRemove(null);
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t !== tag));
    } else {
      toast.error(res.error ?? "Could not remove tag");
    }
  }

  return (
    <div className="space-y-2">
      {/* Existing tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <span className="text-[11px] text-muted-foreground">No tags yet</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px]"
          >
            {tag}
            <button
              type="button"
              disabled={pendingRemove === tag}
              onClick={() => void handleRemove(tag)}
              className="ml-0.5 text-muted-foreground/60 hover:text-foreground disabled:opacity-40"
            >
              {pendingRemove === tag ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <X className="h-2.5 w-2.5" />
              )}
            </button>
          </span>
        ))}
      </div>

      {/* Add tag input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void handleAdd(); }
          }}
          placeholder="add-tag"
          maxLength={50}
          className="h-6 flex-1 rounded border border-border/60 bg-background px-2 text-[11px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          disabled={addPending || !input.trim()}
          onClick={() => void handleAdd()}
          className="inline-flex h-6 items-center gap-1 rounded border border-border/60 px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          {addPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
