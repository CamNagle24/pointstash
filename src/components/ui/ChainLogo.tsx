"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CHAINS } from "@/lib/constants";
import type { ChainId } from "@/types/chain";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, { box: string; text: string }> = {
  xs: { box: "h-6 w-6 rounded-md", text: "text-[10px]" },
  sm: { box: "h-8 w-8 rounded-lg", text: "text-xs" },
  md: { box: "h-10 w-10 rounded-xl", text: "text-sm" },
  lg: { box: "h-14 w-14 rounded-2xl", text: "text-base" },
  xl: { box: "h-20 w-20 rounded-2xl", text: "text-xl" },
};

const initials: Record<ChainId, string> = {
  mcdonalds: "M",
  chickfila: "CF",
  wendys: "W",
  burgerking: "BK",
  tacobell: "TB",
  popeyes: "P",
  subway: "S",
  dunkin: "DD",
  starbucks: "★",
};

export function ChainLogo({
  slug,
  size = "md",
  className,
}: {
  slug: ChainId | string;
  size?: Size;
  className?: string;
}) {
  const chain = CHAINS[slug as ChainId];
  const color = chain?.color ?? "#52525b";
  const initial = initials[slug as ChainId] ?? slug.slice(0, 2).toUpperCase();
  const { box, text } = sizeMap[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center font-display font-bold",
        box,
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -20)} 100%)`,
        color: pickReadableColor(color),
        boxShadow: `0 4px 14px -4px ${color}66, inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
      aria-label={chain?.name ?? slug}
    >
      <span className={cn("relative z-10 leading-none", text)}>{initial}</span>
    </div>
  );
}

function shade(hex: string, percent: number): string {
  const f = parseInt(hex.replace("#", ""), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const r = Math.round((t - R) * p + R);
  const g = Math.round((t - G) * p + G);
  const b = Math.round((t - B) * p + B);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function pickReadableColor(hex: string): string {
  const f = parseInt(hex.replace("#", ""), 16);
  const r = f >> 16;
  const g = (f >> 8) & 0xff;
  const b = f & 0xff;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#0a0a0b" : "#ffffff";
}
