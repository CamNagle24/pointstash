"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-[rgba(245,158,11,0.25)] bg-gradient-to-br from-[rgba(245,158,11,0.12)] via-[var(--bg-secondary)] to-[var(--bg-secondary)] p-10 md:p-16"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold leading-tight md:text-4xl">
              Your points are losing value every day.
              <br />
              <span className="text-gradient-amber">Stash them now.</span>
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Free to use. Connect your first chain in under 60 seconds.
            </p>
          </div>
          <Link href="/login">
            <Button size="lg" className="gap-2 whitespace-nowrap">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
