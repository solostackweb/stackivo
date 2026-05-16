"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { acknowledgeWelcomeDocumentAction } from "../actions";

interface Props {
  token: string;
  brandColor: string;
  defaultEmail: string | null;
}

/**
 * "I've read and understood" acknowledgement form for the public
 * viewer. After submission the panel swaps to a confirmation state —
 * we never reload the page, so any partial form state stays put if
 * the action returns a validation error.
 */
export function WelcomePublicAck({ token, brandColor, defaultEmail }: Props) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState(defaultEmail ?? "");
  const [done, setDone] = React.useState<{ at: string } | null>(null);
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please add your name.");
      return;
    }
    startTransition(async () => {
      const res = await acknowledgeWelcomeDocumentAction({
        token,
        viewerName: name.trim(),
        viewerEmail: email.trim() ? email.trim() : null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDone({
        at: res.data?.acknowledgedAt ?? new Date().toISOString(),
      });
    });
  };

  if (done) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border-2 bg-white p-8 text-center"
        style={{ borderColor: brandColor }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: `${brandColor}1A`, color: brandColor }}
        >
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold">Thanks — we&apos;re all set.</h3>
        <p className="max-w-sm text-sm text-slate-600">
          You acknowledged this guide on{" "}
          {new Date(done.at).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          . You can close this page or come back to it any time.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border-2 border-dashed bg-white p-6"
      style={{ borderColor: `${brandColor}55` }}
    >
      <h3 className="text-base font-semibold">Ready to kick things off?</h3>
      <p className="mt-1 text-sm text-slate-600">
        A quick acknowledgement so we both know we&apos;re aligned on how
        we&apos;ll work together.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ack-name" className="text-xs">
            Your name
          </Label>
          <Input
            id="ack-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="ack-email" className="text-xs">
            Email <span className="text-slate-400">(optional)</span>
          </Label>
          <Input
            id="ack-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            className="mt-1.5"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="mt-4 w-full sm:w-auto"
        style={{ background: brandColor, color: "#fff" }}
      >
        {pending ? "Saving…" : "I’ve read and understood"}
      </Button>
    </form>
  );
}
