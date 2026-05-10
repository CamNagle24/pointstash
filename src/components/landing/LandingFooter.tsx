"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--border)] py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-amber">
            <Coins className="h-3.5 w-3.5 text-[#0a0a0b]" strokeWidth={2.5} />
          </div>
          <span className="font-display text-sm font-bold tracking-tight">PointStash</span>
          <span className="text-xs text-[var(--text-muted)]">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
          <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition">
            Dashboard
          </Link>
          <a href="#" className="hover:text-[var(--text-primary)] transition">
            Privacy
          </a>
          <a href="#" className="hover:text-[var(--text-primary)] transition">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
