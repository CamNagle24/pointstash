import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm">
        <p className="font-display text-5xl font-bold text-[var(--accent)]">404</p>
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold">Page not found</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
