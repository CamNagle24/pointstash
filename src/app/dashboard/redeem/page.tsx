"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Calculator, Lightbulb, TrendingUp, Loader2 } from "lucide-react";
import { CHAIN_IDS, CHAINS } from "@/lib/constants";
import type { ChainId } from "@/types/chain";
import { useAccounts } from "@/hooks/useAccounts";
import { useRedemptions } from "@/hooks/useRedemptions";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Card } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { RedemptionTable } from "@/components/dashboard/RedemptionTable";
import { CrossChainChart } from "@/components/dashboard/CrossChainChart";
import { cn } from "@/lib/utils";

export default function RedeemPage() {
  const [selectedChain, setSelectedChain] = React.useState<ChainId>("chickfila");
  const { accounts } = useAccounts();
  const { redemptions, isLoading } = useRedemptions();

  const chain = CHAINS[selectedChain];
  const account = accounts.find((a) => a.chain.slug === selectedChain);
  const balance = account?.currentPoints ?? 0;

  const tableRows = React.useMemo(
    () =>
      redemptions
        .filter((r) => r.chain?.slug === selectedChain)
        .map((r) => ({
          id: r.id,
          chainSlug: selectedChain,
          itemName: r.itemName,
          pointsCost: r.pointsCost,
          retailPriceCents: r.retailPriceCents,
          centsPerPoint: r.centsPerPoint,
        })),
    [redemptions, selectedChain],
  );

  const crossChainData = React.useMemo(() => {
    return CHAIN_IDS.map((id) => {
      const best = redemptions
        .filter((r) => r.chain?.slug === id)
        .reduce((max, r) => (r.centsPerPoint > max ? r.centsPerPoint : max), 0);
      return { chain: id, centsPerPoint: best };
    });
  }, [redemptions]);

  const bestRow = tableRows.reduce(
    (best, r) => (!best || r.centsPerPoint > best.centsPerPoint ? r : best),
    null as null | (typeof tableRows)[number],
  );
  const balanceDollars = bestRow ? (balance * bestRow.centsPerPoint) / 100 : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 pb-24 md:p-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Get the most value
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Redeem smarter
        </h1>
      </header>

      <Card className="p-6 md:p-8">
        <div className="mb-5 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-[var(--accent)]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Point value calculator
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CHAIN_IDS.map((id) => {
            const c = CHAINS[id];
            const active = id === selectedChain;
            return (
              <button
                key={id}
                onClick={() => setSelectedChain(id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
                  active
                    ? "border-transparent text-[#0a0a0b] shadow-md"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                )}
                style={active ? { background: c.color } : undefined}
              >
                <ChainLogo slug={id} size="xs" />
                {c.shortName}
              </button>
            );
          })}
        </div>

        <motion.div
          key={selectedChain}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Your balance
            </p>
            <p className="mt-2 font-mono-tabular font-display text-3xl font-bold">
              <AnimatedNumber value={balance} />
              <span className="ml-1 text-sm text-[var(--text-muted)] font-sans font-normal">
                {chain.pointsSymbol}
              </span>
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {account ? chain.pointsName : `Not linked yet · go to Accounts`}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Estimated value
            </p>
            <p className="mt-2 font-mono-tabular font-display text-3xl font-bold text-[var(--accent)]">
              <AnimatedNumber value={balanceDollars} prefix="$" decimals={2} />
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">at best ¢/point</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[rgba(34,197,94,0.06)] p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[var(--success)]" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Best redemption
              </p>
            </div>
            <p className="mt-2 font-display text-lg font-semibold leading-tight">
              {bestRow?.itemName ?? "—"}
            </p>
            <p className="mt-1 font-mono-tabular text-sm text-[var(--success)]">
              {bestRow ? `${bestRow.centsPerPoint.toFixed(2)}¢ per point` : ""}
            </p>
          </div>
        </motion.div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">All {chain.name} redemptions</h2>
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] py-10 text-sm text-[var(--text-secondary)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading redemptions…
          </div>
        ) : tableRows.length > 0 ? (
          <RedemptionTable rows={tableRows} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] py-10 text-center text-sm text-[var(--text-secondary)]">
            No redemption data for this chain yet.
          </p>
        )}
      </section>

      <CrossChainChart data={crossChainData} />

      <Card className="p-6 md:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--accent)]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Pro tips
          </p>
        </div>
        <ul className="space-y-3 text-sm">
          <ProTip>
            <strong>Always redeem entrées at Chick-fil-A.</strong> 1,000 pts for a $5.99 sandwich
            puts each point at ~0.6¢ — easily the strongest fast-food currency.
          </ProTip>
          <ProTip>
            <strong>Never redeem a Big Mac at McDonald&apos;s.</strong> 6,000 pts for a $5.99 item
            is just 0.1¢/pt. Use those points on free coffee or fries instead.
          </ProTip>
          <ProTip>
            <strong>Stack Starbucks.</strong> 200 stars for a handcrafted drink is a 2.7¢/star
            return — wait until you can afford the drink tier instead of cashing out cheaper food.
          </ProTip>
        </ul>
      </Card>
    </div>
  );
}

function ProTip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
      <span className="text-[var(--text-secondary)]">{children}</span>
    </li>
  );
}
