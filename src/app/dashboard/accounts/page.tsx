"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import type { ChainId } from "@/types/chain";
import { CHAINS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { AddAccountModal } from "@/components/dashboard/AddAccountModal";
import { useAccounts } from "@/hooks/useAccounts";
import { useRedemptions } from "@/hooks/useRedemptions";
import { bestRedemptionFor } from "@/lib/dashboard";
import { formatCurrencyDollars, timeAgo } from "@/lib/utils";

export default function AccountsPage() {
  const { accounts, error, isLoading, mutate } = useAccounts();
  const { redemptions } = useRedemptions();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const remove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Unlink failed (${res.status})`);
      }
      await mutate();
      toast({ variant: "success", title: "Account unlinked" });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't unlink account",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <AlertCircle className="h-6 w-6 text-[var(--danger)]" />
        <p className="text-sm text-[var(--danger)]">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 pb-24 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Manage
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Accounts
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {accounts.length === 0
              ? "Link your first chain to start stacking."
              : `${accounts.length} chain${accounts.length === 1 ? "" : "s"} connected — sync, edit, or unlink anytime.`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Link new account
        </Button>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] md:grid">
          <span>Chain</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Value</span>
          <span>Last synced</span>
          <span className="w-20" />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {accounts.map((acc, i) => {
            const chain = CHAINS[acc.chain.slug as ChainId];
            const best = bestRedemptionFor(acc.chainId, redemptions);
            const dollars = best ? (acc.currentPoints * best.centsPerPoint) / 100 : 0;
            return (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ChainLogo slug={acc.chain.slug as ChainId} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{acc.chain.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {acc.chain.pointsName}
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline justify-between gap-2 md:justify-end">
                  <span className="text-xs text-[var(--text-muted)] md:hidden">Balance</span>
                  <span className="font-mono-tabular font-semibold">
                    {acc.currentPoints.toLocaleString()}{" "}
                    <span className="text-xs text-[var(--text-muted)]">{chain.pointsSymbol}</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 md:justify-end">
                  <span className="text-xs text-[var(--text-muted)] md:hidden">Value</span>
                  <span className="font-mono-tabular text-[var(--accent)] font-medium">
                    {formatCurrencyDollars(dollars)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Badge variant="muted" className="normal-case tracking-normal">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    {acc.lastSynced ? timeAgo(acc.lastSynced) : "never"}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit account"
                    className="h-9 w-9"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Unlink account"
                    onClick={() => remove(acc.id)}
                    disabled={removingId === acc.id}
                    className="h-9 w-9 hover:text-[var(--danger)]"
                  >
                    {removingId === acc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
          {accounts.length === 0 && (
            <div className="p-12 text-center">
              <p className="font-display text-lg font-semibold">No accounts yet</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Link your first chain to start stacking.
              </p>
              <Button className="mt-5 gap-2" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Link account
              </Button>
            </div>
          )}
        </div>
      </Card>

      <AddAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onLinked={() => mutate()}
      />
    </div>
  );
}
