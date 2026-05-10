"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Tags, BarChart3, Coins, Zap, Camera, Bell } from "lucide-react";

const features = [
  {
    icon: Tags,
    title: "All your deals, one feed",
    body: "Daily-scraped offers from every chain you use, ranked by expiry.",
  },
  {
    icon: BarChart3,
    title: "Track point value",
    body: "See exactly what each Star, crown, and point is worth in real dollars.",
  },
  {
    icon: Coins,
    title: "Redeem smarter",
    body: "Auto-suggested redemptions ranked by cents-per-point. Stop wasting rewards.",
  },
  {
    icon: Camera,
    title: "Snap to update",
    body: "Upload a screenshot — OCR reads your balance and logs it automatically.",
  },
  {
    icon: Zap,
    title: "Cross-chain comparison",
    body: "See where a Free Sandwich is worth more — Wendy's or Chick-fil-A.",
  },
  {
    icon: Bell,
    title: "Expiry alerts",
    body: "Never lose another expiring point or about-to-vanish app deal.",
  },
];

export function FeatureGrid() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
          Why PointStash
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight md:text-5xl">
          Stop checking 9 different apps to figure out what your points are worth.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feat, i) => (
          <motion.div
            key={feat.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(245,158,11,0.1)] ring-1 ring-[rgba(245,158,11,0.2)]">
              <feat.icon className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <h3 className="font-display text-lg font-semibold">{feat.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{feat.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
