"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Coins } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function ResetPasswordPage() {
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

        <React.Suspense fallback={null}>
          <ResetForm />
        </React.Suspense>
      </motion.div>
    </main>
  );
}

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(239,68,68,0.12)]">
          <AlertCircle className="h-7 w-7 text-[var(--danger)]" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Missing reset token</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This link looks incomplete. Request a new one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Request a new link
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(34,197,94,0.12)]">
          <CheckCircle2 className="h-7 w-7 text-[var(--success)]" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          You can now sign in with your new password.
        </p>
        <Button onClick={() => router.push("/login")} className="mt-6 w-full gap-2">
          Continue to sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't reset password. Request a new link.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Choose something you haven&apos;t used before.
      </p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm text-[var(--danger)]">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" className="w-full gap-2" loading={submitting}>
          {submitting ? "Saving..." : "Update password"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </>
  );
}
