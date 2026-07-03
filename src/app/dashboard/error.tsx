"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-[var(--danger)]">Something went wrong</p>
      <button
        onClick={reset}
        className="text-sm font-medium text-[var(--accent)] hover:underline"
      >
        Try again
      </button>
    </div>
  );
}
