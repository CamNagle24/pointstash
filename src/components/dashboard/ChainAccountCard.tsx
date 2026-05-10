"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Sparkles, X, ArrowUpRight, ArrowDown } from "lucide-react";
import type { ChainId } from "@/types/chain";
import { CHAINS } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { formatCurrencyDollars, timeAgo } from "@/lib/utils";

type Props = {
  accountId?: string;
  chainSlug: ChainId;
  points: number;
  lastSyncedAt: Date;
  bestRedemptionLabel: string;
  index?: number;
  /** Called after a successful POST /api/points/update so the parent can refetch. */
  onPointsChange?: () => void;
};

export function ChainAccountCard({
  accountId,
  chainSlug,
  points,
  lastSyncedAt,
  bestRedemptionLabel,
  index = 0,
  onPointsChange,
}: Props) {
  const chain = CHAINS[chainSlug];
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(points.toString());
  const [saving, setSaving] = React.useState(false);
  const [diff, setDiff] = React.useState<number | null>(null);
  const [syncedAt, setSyncedAt] = React.useState(lastSyncedAt);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Both Enter and the resulting blur fire commit() — guard so we only run once.
  const skipBlurRef = React.useRef(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (editing) {
      setDraft(points.toString());
      // Defer focus to next tick so the motion layout settles first.
      setTimeout(() => inputRef.current?.focus(), 0);
      inputRef.current?.select();
    }
  }, [editing, points]);

  React.useEffect(() => {
    if (diff === null) return;
    const t = setTimeout(() => setDiff(null), 2400);
    return () => clearTimeout(t);
  }, [diff]);

  const dollars = points * chain.valuePerPoint;

  const commit = async () => {
    const next = Number(draft.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(next) || next < 0) {
      setEditing(false);
      return;
    }
    if (next === points) {
      setEditing(false);
      return;
    }

    const delta = next - points;
    setSaving(true);
    try {
      if (!accountId) throw new Error("Account ID missing");
      const res = await fetch("/api/points/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId,
          newPoints: next,
          reason: "MANUAL_UPDATE",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Update failed (${res.status})`);
      }
      onPointsChange?.();
      setSyncedAt(new Date());
      setDiff(delta);
      setEditing(false);
      toast({
        variant: "success",
        title: "Points updated",
        description: `${chain.name} now ${next.toLocaleString()} ${chain.pointsSymbol}`,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't update points",
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    skipBlurRef.current = true;
    setDraft(points.toString());
    setEditing(false);
  };

  const handleBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    void commit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
    >
      <Card
        className="group relative overflow-hidden p-6 transition-shadow hover:shadow-2xl"
        accentColor={chain.color}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: chain.color }}
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-15 blur-3xl transition-opacity group-hover:opacity-30"
          style={{ background: chain.color }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ChainLogo slug={chainSlug} size="md" />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold truncate">{chain.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{chain.pointsName}</p>
            </div>
          </div>
          <Badge variant="muted" className="shrink-0 normal-case tracking-normal">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            Synced
          </Badge>
        </div>

        <div className="relative mt-6">
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    skipBlurRef.current = true;
                    void commit();
                  }
                  if (e.key === "Escape") cancel();
                }}
                disabled={saving}
                className="font-mono-tabular font-display text-4xl font-bold tracking-tight bg-transparent w-32 border-b-2 border-[var(--accent)] outline-none"
              />
            ) : (
              <AnimatedNumber
                key={points}
                value={points}
                className="font-mono-tabular font-display text-4xl font-bold tracking-tight"
              />
            )}
            <span className="text-sm text-[var(--text-muted)]">{chain.pointsSymbol}</span>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit points"
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] focus:opacity-100 group-hover:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {editing && (
              <div className="ml-1 flex gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={commit}
                  disabled={saving}
                  aria-label="Save"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--success)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cancel}
                  disabled={saving}
                  aria-label="Cancel"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="mt-1 font-mono-tabular text-sm text-[var(--text-secondary)]">
            ≈ <span className="text-[var(--accent)]">{formatCurrencyDollars(dollars)}</span> value
          </p>

          <AnimatePresence>
            {diff !== null && diff !== 0 && (
              <motion.div
                key={diff}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className={`absolute -top-6 left-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono-tabular font-semibold ${
                  diff > 0
                    ? "bg-[rgba(34,197,94,0.12)] text-[var(--success)]"
                    : "bg-[rgba(239,68,68,0.12)] text-[var(--danger)]"
                }`}
              >
                {diff > 0 ? "+" : ""}
                {diff.toLocaleString()} {chain.pointsSymbol}
                {diff < 0 ? <ArrowDown className="h-3 w-3" /> : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/60 p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <Sparkles className="h-3 w-3 text-[var(--accent)]" />
            Best redemption
          </div>
          <p className="mt-1 text-sm text-[var(--text-primary)]">{bestRedemptionLabel}</p>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">Synced {timeAgo(syncedAt)}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              disabled={editing}
              className="gap-1.5"
              aria-label="Update points"
            >
              <Pencil className="h-3.5 w-3.5" />
              Update
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5" aria-label="Open">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
