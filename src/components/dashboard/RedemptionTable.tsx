"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, CheckCircle2 } from "lucide-react";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Button } from "@/components/ui/Button";
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
import { CHAINS } from "@/lib/constants";
import type { ChainId } from "@/types/chain";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  chainSlug: ChainId;
  itemName: string;
  pointsCost: number;
  retailPriceCents: number;
  centsPerPoint: number;
};

const GRID_COLS = "grid-cols-[1.5fr_2fr_1fr_1fr_1fr_auto]";

export function RedemptionTable({
  rows,
  highlightBest = 1,
  highlightWorst = 1,
  accountId,
  currentPoints,
  onRedeemed,
}: {
  rows: Row[];
  highlightBest?: number;
  highlightWorst?: number;
  accountId?: string;
  currentPoints?: number;
  onRedeemed?: () => void;
}) {
  const { toast } = useToast();
  const [confirming, setConfirming] = React.useState<Row | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const sorted = [...rows].sort((a, b) => b.centsPerPoint - a.centsPerPoint);
  const bestIds = new Set(sorted.slice(0, highlightBest).map((r) => r.id));
  const worstIds = new Set(sorted.slice(-highlightWorst).map((r) => r.id));

  const confirmRedeem = async () => {
    if (!confirming || !accountId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/redeem`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ redemptionOptionId: confirming.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Redemption failed (${res.status})`);
      }
      toast({
        variant: "success",
        title: "Marked as redeemed",
        description: `${confirming.itemName} — ${confirming.pointsCost.toLocaleString()} pts deducted.`,
      });
      onRedeemed?.();
      setConfirming(null);
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't mark as redeemed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div
        className={cn(
          "grid items-center gap-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]",
          GRID_COLS,
        )}
      >
        <span>Chain</span>
        <span>Item</span>
        <span className="text-right">Points</span>
        <span className="text-right">Retail</span>
        <span className="text-right">¢ / point</span>
        <span className="text-right">Action</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {sorted.map((row) => {
          const isBest = bestIds.has(row.id);
          const isWorst = worstIds.has(row.id);
          const chain = CHAINS[row.chainSlug];
          const affordable = accountId != null && (currentPoints ?? 0) >= row.pointsCost;
          return (
            <div
              key={row.id}
              className={cn(
                "grid items-center gap-4 px-5 py-3.5 text-sm transition-colors",
                GRID_COLS,
                isBest && "bg-[rgba(34,197,94,0.06)]",
                isWorst && "bg-[rgba(239,68,68,0.06)]",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChainLogo slug={row.chainSlug} size="xs" />
                <span className="truncate text-[var(--text-secondary)]">{chain.name}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text-primary)]">{row.itemName}</p>
              </div>
              <p className="text-right font-mono-tabular text-[var(--text-secondary)]">
                {row.pointsCost.toLocaleString()}
              </p>
              <p className="text-right font-mono-tabular text-[var(--text-secondary)]">
                ${(row.retailPriceCents / 100).toFixed(2)}
              </p>
              <div className="flex items-center justify-end gap-1.5">
                <span
                  className={cn(
                    "font-mono-tabular font-semibold",
                    isBest && "text-[var(--success)]",
                    isWorst && "text-[var(--danger)]",
                    !isBest && !isWorst && "text-[var(--text-primary)]",
                  )}
                >
                  {row.centsPerPoint.toFixed(2)}¢
                </span>
                {isBest && <ArrowUp className="h-3.5 w-3.5 text-[var(--success)]" />}
                {isWorst && <ArrowDown className="h-3.5 w-3.5 text-[var(--danger)]" />}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={!accountId || !affordable}
                  title={
                    !accountId
                      ? "Link an account for this chain first"
                      : !affordable
                        ? "Not enough points yet"
                        : undefined
                  }
                  onClick={() => setConfirming(row)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark redeemed
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={confirming != null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as redeemed?</DialogTitle>
            <DialogDescription>
              This deducts the points from your balance and logs it in your history.
            </DialogDescription>
          </DialogHeader>
          {confirming ? (
            <DialogBody>
              <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4 text-sm">
                <Row label="Item">
                  <span className="text-[var(--text-primary)]">{confirming.itemName}</span>
                </Row>
                <Row label="Points cost">
                  <span className="font-mono-tabular text-[var(--text-primary)]">
                    {confirming.pointsCost.toLocaleString()}
                  </span>
                </Row>
                <Row label="Resulting balance">
                  <span className="font-mono-tabular text-[var(--text-primary)]">
                    {((currentPoints ?? 0) - confirming.pointsCost).toLocaleString()}
                  </span>
                </Row>
              </div>
            </DialogBody>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={confirmRedeem} loading={submitting} className="gap-1.5">
              Confirm redemption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
