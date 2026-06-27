"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { Bell, Lock, Mail, Palette, Loader2, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";
import { useUser, type UserProfile } from "@/hooks/useUser";

type PrefKey = "notifyExpiring" | "notifyDeals" | "notifyDigest" | "notifyAffordable";

export default function SettingsPage() {
  const { user, isLoading, error, mutate } = useUser();
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    if (user) setName(user.name ?? "");
  }, [user]);

  const nameDirty = user ? name.trim() !== (user.name ?? "") : false;

  const saveProfile = async () => {
    if (!user || !nameDirty) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const updated = (await res.json()) as UserProfile;
      await mutate(updated, false);
      toast({ variant: "success", title: "Profile updated" });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't save profile",
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const togglePref = async (key: PrefKey, value: boolean) => {
    if (!user) return;
    const optimistic = { ...user, [key]: value };
    await mutate(optimistic, false);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const updated = (await res.json()) as UserProfile;
      await mutate(updated, false);
    } catch (err) {
      await mutate();
      toast({
        variant: "error",
        title: "Couldn't update preference",
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
        <p className="text-sm text-[var(--danger)]">
          {error?.message ?? "Couldn't load your profile."}
        </p>
      </div>
    );
  }

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
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="You"
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              readOnly
              disabled
              className="cursor-not-allowed opacity-70"
            />
            <p className="text-xs text-[var(--text-muted)]">
              Changing your email isn&apos;t supported yet.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={saveProfile}
            disabled={!nameDirty || savingProfile}
            loading={savingProfile}
            className="gap-1.5"
          >
            {savingProfile ? "Saving..." : "Save changes"}
            {!savingProfile && <Check className="h-4 w-4" />}
          </Button>
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
            title="Expiring deals"
            description="Email me a few days before deals for my chains expire."
            checked={user.notifyExpiring}
            onChange={(v) => togglePref("notifyExpiring", v)}
          />
          <SettingRow
            title="New deals"
            description="Push a notification when scrapers find a high-value deal."
            checked={user.notifyDeals}
            onChange={(v) => togglePref("notifyDeals", v)}
          />
          <SettingRow
            title="Weekly digest"
            description="A Sunday email recap of stash value and best deals."
            checked={user.notifyDigest}
            onChange={(v) => togglePref("notifyDigest", v)}
          />
          <SettingRow
            title="Affordable redemption alerts"
            description="Email me when my balance covers a redemption I couldn't afford before."
            checked={user.notifyAffordable}
            onChange={(v) => togglePref("notifyAffordable", v)}
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
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </div>
      </Card>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={user.email}
      />
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)] border border-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const [confirm, setConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!open) setConfirm("");
  }, [open]);

  const canDelete = confirm.trim().toLowerCase() === email.toLowerCase();

  const onDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/me", { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed (${res.status})`);
      }
      // Sign out clears the JWT cookie and redirects to the landing page.
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't delete account",
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently deletes your stash, every linked rewards account, your points
            history, and any browser-extension tokens. It can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Label htmlFor="confirm-email">
            Type <span className="font-mono text-[var(--text-primary)]">{email}</span> to confirm
          </Label>
          <Input
            id="confirm-email"
            type="email"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={email}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={!canDelete || deleting}
            loading={deleting}
          >
            {deleting ? "Deleting..." : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
