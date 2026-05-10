"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type Props = { onClick?: () => void; index?: number };

export function AddAccountCard({ onClick, index = 0 }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="group relative flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-transparent p-6 text-center transition-colors hover:border-[var(--accent)] hover:bg-[rgba(245,158,11,0.04)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] text-[var(--text-muted)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
        <Plus className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display font-semibold text-[var(--text-primary)]">Link a new account</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Add a chain to start tracking points
        </p>
      </div>
    </motion.button>
  );
}
