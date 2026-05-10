"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHAINS } from "@/lib/constants";
import type { ChainId } from "@/types/chain";

type Datum = { chain: ChainId; centsPerPoint: number };

export function CrossChainChart({ data }: { data: Datum[] }) {
  const sorted = [...data].sort((a, b) => b.centsPerPoint - a.centsPerPoint);
  const chartData = sorted.map((d) => ({
    name: CHAINS[d.chain].shortName,
    value: Number(d.centsPerPoint.toFixed(2)),
    fill: CHAINS[d.chain].color,
  }));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold">Cross-chain comparison</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Best-redemption value, in cents per point — bigger bars mean your points are worth more.
        </p>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 0, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={12}
              tickFormatter={(v) => `${v}¢`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-tertiary)", opacity: 0.6 }}
              contentStyle={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text-primary)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}¢ / point`, "Value"]}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
