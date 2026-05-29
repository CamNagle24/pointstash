import Link from "next/link";
import { WifiOff } from "lucide-react";

// Static page served by the service worker when a navigation fails offline
// and we don't have a cached version of the requested route. Kept tiny on
// purpose — anything you put here is shown to a user whose connection just
// dropped.
export const metadata = {
  title: "Offline — PointStash",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)]">
        <WifiOff className="h-6 w-6 text-[var(--text-secondary)]" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-semibold">You&apos;re offline</h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
          PointStash needs a connection for fresh balances and deals. Your last-synced numbers are
          still cached — head back to the dashboard.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0a0a0b] hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
