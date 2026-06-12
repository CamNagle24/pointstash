"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { BalancePoint } from "@/lib/points-history";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Compact balance-over-time sparkline. Axes are hidden to keep it at home in a
 * dialog; the tooltip carries the date and value. Themed to the app accent.
 */
export function PointsChart({
  data = [],
  pointsSymbol = "pts",
  height = 140,
}: {
  data?: BalancePoint[];
  pointsSymbol?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
          <defs>
            <linearGradient id="points-balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            contentStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              padding: "6px 10px",
            }}
            labelStyle={{ color: "var(--text-muted)", marginBottom: 2 }}
            itemStyle={{ color: "var(--text-primary)" }}
            labelFormatter={(label) => shortDate(String(label))}
            formatter={(value: number) => [`${value.toLocaleString()} ${pointsSymbol}`, "Balance"]}
          />
          <Area
            type="monotone"
            dataKey="points"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#points-balance-fill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
