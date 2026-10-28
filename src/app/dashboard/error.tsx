"use client";

import { AlertCircle } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertCircle className="h-8 w-8 text-[var(--danger)]" />
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
