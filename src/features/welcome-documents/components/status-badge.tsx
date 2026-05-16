import { Badge } from "@/components/ui/badge";

const TONE: Record<
  "draft" | "published" | "archived",
  { label: string; cls: string }
> = {
  draft: { label: "Draft", cls: "bg-muted text-foreground/80" },
  published: {
    label: "Published",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  archived: {
    label: "Archived",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  },
};

export function WelcomeStatusBadge({
  status,
}: {
  status: "draft" | "published" | "archived";
}) {
  const t = TONE[status];
  return (
    <Badge variant="secondary" className={`${t.cls} text-[10px] font-medium`}>
      {t.label}
    </Badge>
  );
}
