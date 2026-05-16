"use client";

/**
 * Destructive-tier broadcast composer.
 *
 * Sends one notification row per matched user. Gated with a typed
 * "SEND" confirmation + 10s cooldown — this is the only Phase-2
 * action that touches every user, so the friction is intentional.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

import { adminBroadcastNotificationAction } from "@/features/admin/actions";
import { TypedConfirmButton } from "./typed-confirm-button";

const TYPES = [
  { value: "announcement", label: "Announcement" },
  { value: "incident", label: "Incident" },
  { value: "maintenance", label: "Maintenance" },
] as const;

const TARGETS = [
  { value: "all", label: "Everyone" },
  { value: "free", label: "Free plan" },
  { value: "pro", label: "Pro plan" },
  { value: "business", label: "Business plan" },
] as const;

export function BroadcastForm() {
  const router = useRouter();
  const [type, setType] = React.useState<"announcement" | "incident" | "maintenance">(
    "announcement",
  );
  const [target, setTarget] = React.useState<"all" | "free" | "pro" | "business">(
    "all",
  );
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");

  return (
    <form
      action={async () => {
        const res = await adminBroadcastNotificationAction({
          type,
          targetPlan: target,
          title: title.trim(),
          message: message.trim() || undefined,
        });
        if (res.ok) {
          toast.success(res.message ?? "Broadcast sent");
          setTitle("");
          setMessage("");
          router.refresh();
        } else {
          toast.error(res.error);
        }
      }}
      className="space-y-3 rounded-md border bg-card p-3 text-xs"
    >
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" />
        New broadcast
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Type
          </span>
          <select
            value={type}
            onChange={(e) =>
              setType(
                e.target.value as "announcement" | "incident" | "maintenance",
              )
            }
            className="h-7 rounded border bg-background px-2"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Audience
          </span>
          <select
            value={target}
            onChange={(e) =>
              setTarget(e.target.value as "all" | "free" | "pro" | "business")
            }
            className="h-7 rounded border bg-background px-2"
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Title <span className="text-muted-foreground/60">(3–140 chars)</span>
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          className="h-8 rounded border bg-background px-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Message{" "}
          <span className="text-muted-foreground/60">(optional · 2000 max)</span>
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          className="rounded border bg-background px-2 py-1.5 leading-relaxed"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground">
          One in-app notification row per matched user. There is no undo.
        </span>
        <TypedConfirmButton
          label="Send broadcast"
          confirmText="SEND"
          tier="destructive"
          variant="destructive"
          disabled={title.trim().length < 3}
          helper={
            <span>
              Type{" "}
              <code className="rounded bg-background/80 px-1 py-0.5 font-mono">
                SEND
              </code>{" "}
              to confirm. A 10-second cooldown will apply.
            </span>
          }
        />
      </div>
    </form>
  );
}
