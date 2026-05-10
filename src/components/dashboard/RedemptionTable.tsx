"use client";

import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ChainLogo } from "@/components/ui/ChainLogo";
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

export function RedemptionTable({
  rows,
  highlightBest = 1,
  highlightWorst = 1,
}: {
  rows: Row[];
  highlightBest?: number;
  highlightWorst?: number;
}) {
  const sorted = [...rows].sort((a, b) => b.centsPerPoint - a.centsPerPoint);
  const bestIds = new Set(sorted.slice(0, highlightBest).map((r) => r.id));
  const worstIds = new Set(sorted.slice(-highlightWorst).map((r) => r.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] gap-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        <span>Chain</span>
        <span>Item</span>
        <span className="text-right">Points</span>
        <span className="text-right">Retail</span>
        <span className="text-right">¢ / point</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {sorted.map((row) => {
          const isBest = bestIds.has(row.id);
          const isWorst = worstIds.has(row.id);
          const chain = CHAINS[row.chainSlug];
          return (
            <div
              key={row.id}
              className={cn(
                "grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] items-center gap-4 px-5 py-3.5 text-sm transition-colors",
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
