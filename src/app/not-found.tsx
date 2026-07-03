import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-6xl font-bold text-[var(--text-secondary)]">404</p>
      <p className="text-lg font-semibold text-[var(--text)]">Page not found</p>
      <p className="text-sm text-[var(--text-secondary)]">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
