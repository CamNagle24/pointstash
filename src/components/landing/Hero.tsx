"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { CHAIN_IDS } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.18),transparent_60%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pt-24 pb-20 text-center md:pt-32 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]"
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
          New — automatic deal scraping for 9 chains
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          All your fast food points.
          <br />
          <span className="text-gradient-amber">One dashboard.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-2xl text-lg text-[var(--text-secondary)] md:text-xl"
        >
          Track every Star, crown, and reward across McDonald&apos;s, Starbucks, Chick-fil-A
          and more. Find the highest-value redemption, every time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Start stacking free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              View demo dashboard
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 flex items-center gap-3 text-sm text-[var(--text-muted)]"
        >
          <div className="flex -space-x-2">
            {CHAIN_IDS.slice(0, 5).map((id) => (
              <ChainLogo
                key={id}
                slug={id}
                size="sm"
                className="ring-2 ring-[var(--bg-primary)]"
              />
            ))}
          </div>
          <span>Tracking 9 chains and 50+ redemption options</span>
        </motion.div>
      </div>
    </section>
  );
}
