"use client";

import * as React from "react";
import { Loader2, RefreshCw, Smartphone, Trash2, Zap, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { useToast } from "@/components/ui/Toaster";
import { CHAINS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import {
  chainHasExtensionSupport,
  connectChain,
  detectExtension,
  ExtensionNotInstalledError,
  isExtensionConfigured,
} from "@/lib/extension-bridge";
import type { ChainAccount } from "@/types/account";
import type { ChainId } from "@/types/chain";

type Props = {
  account: ChainAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange?: () => void;
};

type Status = {
  label: string;
  tone: "success" | "warn" | "danger" | "muted";
};

function deriveStatus(account: ChainAccount): Status {
  if (!account.isActive) return { label: "Disconnected", tone: "danger" };
  if (!account.lastSynced) return { label: "Never synced", tone: "muted" };
  const ageMs = Date.now() - new Date(account.lastSynced).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ageMs < 7 * day) return { label: "Active", tone: "success" };
  if (ageMs < 30 * day) return { label: "Stale", tone: "warn" };
  return { label: "Out of date", tone: "danger" };
}

function syncMethodLabel(m: ChainAccount["syncMethod"]): string {
  switch (m) {
    case "API":
      return "API";
    case "SCRAPE":
      return "Browser extension";
    case "SCREENSHOT":
      return "Screenshot";
    case "MANUAL":
    default:
      return "Manual";
  }
}

const TONE_CLASSES: Record<Status["tone"], string> = {
  success: "bg-[var(--success)]",
  warn: "bg-[var(--accent)]",
  danger: "bg-[var(--danger)]",
  muted: "bg-[var(--text-muted)]",
};

export function AccountDetailsDialog({ account, open, onOpenChange, onChange }: Props) {
  const [reconnecting, setReconnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const { toast } = useToast();

  if (!account) return null;

  const slug = account.chain.slug as ChainId;
  const chain = CHAINS[slug];
  const status = deriveStatus(account);
  const extSupported = chainHasExtensionSupport(slug);
  const appOnly = chain.appOnly === true;

  const reconnect = async () => {
    setReconnecting(true);
    try {
      if (!extSupported) {
        toast({
          variant: "error",
          title: "Auto-reconnect not available",
          description: `${chain.name} doesn't support extension sync yet. Update points manually from the accounts list.`,
        });
        return;
      }
      const installed = isExtensionConfigured() && (await detectExtension());
      if (!installed) {
        const url = process.env.NEXT_PUBLIC_EXTENSION_INSTALL_URL;
        toast({
          variant: "error",
          title: "Install PointStash Sync to reconnect",
          description: url
            ? "We opened the Chrome Web Store in a new tab — add the extension, then click Reconnect."
            : "Add the PointStash Sync extension to Chrome, then click Reconnect.",
        });
        if (url) window.open(url, "_blank", "noopener");
        return;
      }
      const result = await connectChain(slug);
      if (result.status === "failed") {
        toast({ variant: "error", title: "Couldn't reconnect", description: result.error });
        return;
      }
      toast({
        variant: "success",
        title: `${chain.name} resynced`,
        description: `${result.balance.toLocaleString()} ${chain.pointsSymbol}`,
      });
      onChange?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ExtensionNotInstalledError) {
        toast({
          variant: "error",
          title: "PointStash Sync not installed",
          description: "Install it from the Chrome Web Store, then try again.",
        });
      } else {
        toast({
          variant: "error",
          title: "Reconnect failed",
          description: err instanceof Error ? err.message : "Try again in a moment.",
        });
      }
    } finally {
      setReconnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(`Unlink your ${chain.name} account? You can always relink later.`)) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Unlink failed (${res.status})`);
      }
      toast({ variant: "success", title: `${chain.name} unlinked` });
      onChange?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't unlink",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ChainLogo slug={slug} size="md" />
            <div>
              <DialogTitle>{chain.name} connection</DialogTitle>
              <DialogDescription>
                Manage how PointStash keeps your {chain.pointsName} fresh.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4 text-sm">
            <Row label="Status">
              <Badge variant="muted" className="normal-case tracking-normal">
                <span className={`h-1.5 w-1.5 rounded-full ${TONE_CLASSES[status.tone]}`} />
                {status.label}
              </Badge>
            </Row>
            <Row label="Sync method">
              <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                {account.syncMethod === "SCRAPE" || account.syncMethod === "API" ? (
                  <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
                ) : null}
                {syncMethodLabel(account.syncMethod)}
              </span>
            </Row>
            <Row label="Last synced">
              <span className="text-[var(--text-primary)]">
                {account.lastSynced ? timeAgo(new Date(account.lastSynced)) : "Never"}
              </span>
            </Row>
            <Row label="Current balance">
              <span className="font-mono-tabular text-[var(--text-primary)]">
                {account.currentPoints.toLocaleString()}{" "}
                <span className="text-xs text-[var(--text-muted)]">{chain.pointsSymbol}</span>
              </span>
            </Row>
            {account.loyaltyId ? (
              <Row label="Member ID">
                <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                  {account.loyaltyId}
                </span>
              </Row>
            ) : null}
            <Row label="Linked">
              <span className="text-[var(--text-secondary)]">
                {timeAgo(new Date(account.createdAt))}
              </span>
            </Row>
          </div>

          {appOnly ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/30 p-3 text-xs text-[var(--text-secondary)]">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              {chain.name} only shows points in their mobile app, so auto-sync isn&apos;t possible.
              Update the balance manually from the dashboard card.
            </p>
          ) : !extSupported ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/30 p-3 text-xs text-[var(--text-secondary)]">
              <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              Auto-reconnect isn&apos;t live for {chain.name} yet. Update the balance manually from
              the dashboard card.
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={disconnect}
            disabled={disconnecting || reconnecting}
            className="gap-1.5 hover:text-[var(--danger)]"
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Disconnect
          </Button>
          <Button
            onClick={reconnect}
            disabled={reconnecting || disconnecting || !extSupported}
            loading={reconnecting}
            className="gap-1.5"
          >
            {reconnecting ? "Reconnecting…" : "Reconnect"}
            {!reconnecting ? <RefreshCw className="h-4 w-4" /> : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
