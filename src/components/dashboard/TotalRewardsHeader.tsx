"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Tags } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

type Stat = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  totalDollars: number;
  accountCount: number;
  activeDeals: number;
};

export function TotalRewardsHeader({ totalDollars, accountCount, activeDeals }: Props) {
  const stats: Stat[] = [
    { label: "Connected accounts", value: accountCount, icon: Wallet },
    { label: "Active deals", value: activeDeals, icon: Tags },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 md:p-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-30" />

      <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            <TrendingUp className="h-3 w-3" />
            Total estimated rewards
          </div>
          <div className="flex items-baseline gap-3">
            <AnimatedNumber
              value={totalDollars}
              prefix="$"
              decimals={2}
              className="font-display font-mono-tabular text-6xl font-bold tracking-tight md:text-7xl text-gradient-amber"
            />
          </div>
          <p className="mt-3 max-w-md text-sm text-[var(--text-secondary)]">
            What every point in your stash is currently worth across all linked accounts.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4 min-w-[140px]"
            >
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <s.icon className="h-3.5 w-3.5" />
                <p className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
              <p className="mt-1 font-display font-mono-tabular text-3xl font-bold">
                <AnimatedNumber value={s.value} />
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
