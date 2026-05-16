"use client";

import * as React from "react";
import { Monitor, Smartphone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  SettingsSection,
  SettingsField,
  SettingsPageHeader,
  SettingsToggleRow,
  useStubSaveHandler,
} from "@/features/settings/components/settings-section";

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  icon: "monitor" | "phone";
  current: boolean;
}

const SESSIONS: Session[] = [
  {
    id: "sess_1",
    device: "MacBook Pro",
    browser: "Chrome 121",
    location: "Bengaluru, IN",
    lastActive: "Active now",
    icon: "monitor",
    current: true,
  },
  {
    id: "sess_2",
    device: "iPhone 15",
    browser: "Safari",
    location: "Bengaluru, IN",
    lastActive: "2 hours ago",
    icon: "phone",
    current: false,
  },
  {
    id: "sess_3",
    device: "Windows PC",
    browser: "Firefox 122",
    location: "Mumbai, IN",
    lastActive: "3 days ago",
    icon: "monitor",
    current: false,
  },
];

export default function SecuritySettingsPage() {
  const onSavePassword = useStubSaveHandler("Password");
  const on2faToggle = useStubSaveHandler("Two-factor authentication");

  return (
    <>
      <SettingsPageHeader
        title="Security"
        description="Protect your account and monitor active sessions."
      />

      <SettingsSection
        title="Change password"
        description="Use a unique password you don't use anywhere else."
        onSave={onSavePassword}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField label="Current password">
            <Input type="password" placeholder="••••••••" />
          </SettingsField>
          <div className="hidden sm:block" />
          <SettingsField label="New password">
            <Input type="password" placeholder="At least 12 characters" />
          </SettingsField>
          <SettingsField label="Confirm new password">
            <Input type="password" />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Two-factor authentication"
        description="Require a second factor when signing in from a new device."
      >
        <SettingsToggleRow
          label="Authenticator app"
          description="Use Authy, 1Password, or Google Authenticator to generate codes."
        >
          <Switch defaultChecked onCheckedChange={on2faToggle} />
        </SettingsToggleRow>
        <SettingsToggleRow
          label="SMS backup codes"
          description="We'll text a code to +91 ••• •• 43210 as a fallback."
        >
          <Switch />
        </SettingsToggleRow>
        <SettingsToggleRow
          label="Require 2FA on new devices"
          description="Prompt for a code every time a device signs in for the first time."
        >
          <Switch defaultChecked />
        </SettingsToggleRow>
      </SettingsSection>

      <SettingsSection
        title="Active sessions"
        description="Devices currently signed into your account."
        headerAction={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Signed out of all other sessions")}
          >
            Sign out everywhere
          </Button>
        }
      >
        <div className="-my-2 divide-y">
          {SESSIONS.map((s) => {
            const Icon = s.icon === "phone" ? Smartphone : Monitor;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {s.device} · {s.browser}
                      </p>
                      {s.current && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          This device
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.location}
                      </span>
                      <span>·</span>
                      <span>{s.lastActive}</span>
                    </div>
                  </div>
                </div>
                {!s.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => toast.success(`Signed out ${s.device}`)}
                  >
                    Sign out
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </>
  );
}
