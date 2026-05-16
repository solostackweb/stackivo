"use client";

import * as React from "react";
import { CheckCircle2, Download, Trash2, X } from "lucide-react";

interface InvoicesBulkActionsProps {
  selectedCount: number;
  onMarkPaid: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/**
 * Floating bulk action bar — Linear-inspired pill that slides in from the bottom
 * whenever at least one row is selected.
 */
export function InvoicesBulkActions({
  selectedCount,
  onMarkPaid,
  onExport,
  onDelete,
  onClear,
}: InvoicesBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-slate-100 shadow-2xl shadow-black/20 dark:border-slate-700 dark:bg-slate-950 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2 pr-3">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
            {selectedCount}
          </span>
          <span className="text-sm font-medium">
            selected
          </span>
        </div>

        <span className="h-4 w-px bg-slate-700" />

        <BulkButton onClick={onMarkPaid} icon={CheckCircle2} label="Mark as paid" />
        <BulkButton onClick={onExport} icon={Download} label="Export" />
        <BulkButton
          onClick={onDelete}
          icon={Trash2}
          label="Delete"
          tone="danger"
        />

        <span className="h-4 w-px bg-slate-700" />

        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BulkButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-slate-800 " +
        (tone === "danger"
          ? "text-slate-200 hover:text-red-400"
          : "text-slate-200 hover:text-white")
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
