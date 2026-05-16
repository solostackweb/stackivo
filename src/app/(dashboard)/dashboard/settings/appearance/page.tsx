"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SettingsSection,
  SettingsField,
  SettingsPageHeader,
  SettingsToggleRow,
  useStubSaveHandler,
} from "@/features/settings/components/settings-section";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = React.useState<"compact" | "comfortable">(
    "comfortable",
  );
  const onSaveWorkspace = useStubSaveHandler("Workspace preferences");

  return (
    <>
      <SettingsPageHeader
        title="Appearance"
        description="Customize how Stackivo looks and feels on your devices."
      />

      <SettingsSection
        title="Theme"
        description="Sync with your device or pick a specific mode."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = (theme ?? "system") === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                aria-pressed={active}
                className={cn(
                  "group flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <ThemePreview variant={t.value} />
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Density"
        description="Tighten up spacing across tables and lists."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "comfortable",
                label: "Comfortable",
                hint: "Default spacing, easier to scan",
              },
              {
                value: "compact",
                label: "Compact",
                hint: "More rows on screen, denser tables",
              },
            ] as const
          ).map((opt) => {
            const active = density === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDensity(opt.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{opt.label}</p>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {opt.hint}
                </p>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Workspace preferences"
        description="Smaller toggles that change how Stackivo behaves day-to-day."
        onSave={onSaveWorkspace}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField label="Interface language">
            <Select defaultValue="en">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Sidebar behaviour">
            <Select defaultValue="auto">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-collapse on small screens</SelectItem>
                <SelectItem value="expanded">Always expanded</SelectItem>
                <SelectItem value="collapsed">Always collapsed</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>
        </div>

        <SettingsToggleRow
          label="Show tooltips on hover"
          description="Helpful hints for keyboard shortcuts and icon-only buttons."
        >
          <Switch defaultChecked />
        </SettingsToggleRow>
        <SettingsToggleRow
          label="Enable reduced motion"
          description="Respect your OS setting and minimize animations."
        >
          <Switch />
        </SettingsToggleRow>
      </SettingsSection>
    </>
  );
}

/** Tiny theme "swatch" used on the theme picker tiles. */
function ThemePreview({ variant }: { variant: "light" | "dark" | "system" }) {
  const styles =
    variant === "light"
      ? { bg: "bg-white", fg: "bg-slate-200", accent: "bg-slate-900" }
      : variant === "dark"
        ? { bg: "bg-slate-900", fg: "bg-slate-700", accent: "bg-white" }
        : { bg: "bg-gradient-to-br from-white to-slate-900", fg: "bg-slate-300", accent: "bg-primary" };

  return (
    <div
      className={cn(
        "flex h-16 w-full items-end gap-1.5 rounded-md border p-2",
        styles.bg,
      )}
    >
      <div className={cn("h-full w-1/3 rounded", styles.fg)} />
      <div className="flex flex-1 flex-col gap-1">
        <div className={cn("h-2 w-3/4 rounded", styles.fg)} />
        <div className={cn("h-2 w-1/2 rounded", styles.fg)} />
        <div className={cn("mt-auto h-3 w-14 rounded", styles.accent)} />
      </div>
    </div>
  );
}
