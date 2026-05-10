"use client";

import * as React from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-amber shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]">
            <Coins className="h-4 w-4 text-[#0a0a0b]" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">PointStash</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--text-secondary)]">
          <a href="#features" className="hover:text-[var(--text-primary)] transition">
            Features
          </a>
          <a href="#chains" className="hover:text-[var(--text-primary)] transition">
            Chains
          </a>
          <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition">
            Dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
