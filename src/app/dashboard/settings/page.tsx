"use client";

import * as React from "react";
import { Bell, Lock, Mail, Palette } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 pb-24 md:p-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Preferences
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Settings</h1>
      </header>

      <Card className="p-6 md:p-8">
        <div className="mb-5 flex items-center gap-2 text-[var(--accent)]">
          <Mail className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Profile
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" placeholder="You" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@stash.it" />
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="mb-5 flex items-center gap-2 text-[var(--accent)]">
          <Bell className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Notifications
          </p>
        </div>
        <div className="space-y-3">
          <SettingRow
            title="Expiring points"
            description="Alert me when points are within 7 days of expiring."
          />
          <SettingRow
            title="New deals"
            description="Push a notification when scrapers find a high-value deal."
          />
          <SettingRow
            title="Weekly digest"
            description="A Sunday email recap of stash value and best deals."
          />
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="mb-5 flex items-center gap-2 text-[var(--accent)]">
          <Palette className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Appearance
          </p>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Use the toggle in the sidebar to switch between dark and light mode.
        </p>
      </Card>

      <Card className="p-6 md:p-8 border-[rgba(239,68,68,0.25)]">
        <div className="mb-5 flex items-center gap-2 text-[var(--danger)]">
          <Lock className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Danger zone</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Delete account</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Permanently remove your stash and all linked accounts.
            </p>
          </div>
          <Button variant="danger">Delete account</Button>
        </div>
      </Card>
    </div>
  );
}

function SettingRow({ title, description }: { title: string; description: string }) {
  const [on, setOn] = React.useState(true);
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)] border border-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
