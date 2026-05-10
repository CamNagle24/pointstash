"use client";

import * as React from "react";
import { CHAINS } from "@/lib/constants";
import { ChainLogo } from "@/components/ui/ChainLogo";

export function ChainLogoBanner() {
  const chains = Object.values(CHAINS);
  const doubled = [...chains, ...chains];

  return (
    <section className="relative border-y border-[var(--border)] bg-[var(--bg-secondary)]/40 py-14 overflow-hidden">
      <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
        Supports every major chain
      </p>
      <div className="mt-8 mask-fade-x">
        <div className="flex w-max items-center gap-12 animate-marquee will-change-transform">
          {doubled.map((c, i) => (
            <div
              key={`${c.id}-${i}`}
              className="flex items-center gap-3 whitespace-nowrap"
            >
              <ChainLogo slug={c.id} size="md" />
              <span
                className="font-display text-xl font-semibold"
                style={{ color: c.color }}
              >
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .mask-fade-x {
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
        }
      `}</style>
    </section>
  );
}
