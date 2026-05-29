"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Coins, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show the success state regardless of response — the API is
      // intentionally enumeration-safe and so is this UI.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.16),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 shadow-2xl"
      >
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-amber shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]">
            <Coins className="h-4 w-4 text-[#0a0a0b]" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">PointStash</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(34,197,94,0.12)]">
              <MailCheck className="h-7 w-7 text-[var(--success)]" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Check your inbox</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve
              sent a reset link. It expires in 1 hour.
            </p>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Don&apos;t see it? Check spam, or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                try a different email
              </button>
              .
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight">Forgot password?</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Enter your email and we&apos;ll send a reset link.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@stash.it"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" loading={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>

            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </main>
  );
}
