"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPortalAction } from "../actions";
import { portalDashboardDetail } from "../routes";

/**
 * "New portal" button + create dialog. The dialog collects only the
 * minimum needed to create a portal — name + brand colour. Members,
 * files, contracts, and invoices are added on the detail page once the
 * portal exists.
 */
export function CreatePortalButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [brandColor, setBrandColor] = React.useState("#6366F1");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    const res = await createPortalAction({ name: name.trim(), brandColor });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setName("");
    router.push(portalDashboardDetail(res.data!.portalId));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New portal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a client portal</DialogTitle>
          <DialogDescription>
            One portal per client engagement. You can attach contracts,
            invoices, and files after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portal-name">Portal name</Label>
            <Input
              id="portal-name"
              autoFocus
              required
              maxLength={120}
              placeholder="e.g. Acme Co. — Brand redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portal-color">Brand colour</Label>
            <div className="flex items-center gap-3">
              <input
                id="portal-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border bg-background"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                maxLength={7}
                pattern="^#[0-9A-Fa-f]{6}$"
                className="w-32 font-mono"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> Creating
                </>
              ) : (
                "Create portal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
