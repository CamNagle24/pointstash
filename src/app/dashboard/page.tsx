"use client";

import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { ChainAccountCard } from "@/components/dashboard/ChainAccountCard";
import { AddAccountCard } from "@/components/dashboard/AddAccountCard";
import { AddAccountModal } from "@/components/dashboard/AddAccountModal";
import { AccountDetailsDialog } from "@/components/dashboard/AccountDetailsDialog";
import { TotalRewardsHeader } from "@/components/dashboard/TotalRewardsHeader";
import { useAccounts } from "@/hooks/useAccounts";
import { useRedemptions } from "@/hooks/useRedemptions";
import { useDeals } from "@/hooks/useDeals";
import {
  affordableDealCount,
  bestRedemptionFor,
  bestRedemptionLabel,
  totalEstimatedDollars,
} from "@/lib/dashboard";
import { silentSync } from "@/lib/extension-bridge";
import { CHAINS } from "@/lib/constants";
import type { ChainAccount } from "@/types/account";
import type { ChainId } from "@/types/chain";

export default function DashboardPage() {
  const { accounts, error: accountsError, isLoading: accountsLoading, mutate: refetchAccounts } =
    useAccounts();
  const { redemptions, isLoading: redemptionsLoading } = useRedemptions();
  const { deals } = useDeals();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailsAccount, setDetailsAccount] = React.useState<ChainAccount | null>(null);

  // Ask the extension to rescan any chain tabs the user already has open and
  // push fresh balances. Fire-and-forget on mount — silent on failure, just
  // refetch SWR if anything came back.
  React.useEffect(() => {
    let cancelled = false;
    silentSync().then((result) => {
      if (cancelled) return;
      if (result.synced.length > 0) refetchAccounts();
    });
    return () => {
      cancelled = true;
    };
  }, [refetchAccounts]);

  const total = React.useMemo(
    () => totalEstimatedDollars(accounts, redemptions),
    [accounts, redemptions],
  );
  const affordable = React.useMemo(
    () => affordableDealCount(deals, accounts),
    [deals, accounts],
  );

  if (accountsLoading) return <PageState message="Loading your stash…" loading />;
  if (accountsError) return <PageState message={accountsError.message} error />;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 pb-24 md:p-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Welcome back
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Your stash
        </h1>
      </header>

      <TotalRewardsHeader
        totalDollars={total}
        accountCount={accounts.length}
        activeDeals={deals.length}
        affordableDeals={accounts.length > 0 ? affordable : undefined}
      />

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Linked accounts</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {accounts.length === 0
                ? "Link your first chain to start stacking."
                : `${accounts.length} chain${accounts.length === 1 ? "" : "s"} connected — click any balance to update.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.filter((acc) => CHAINS[acc.chain.slug as ChainId]).map((acc, i) => {
            const best = bestRedemptionFor(acc.chainId, redemptions);
            return (
              <ChainAccountCard
                key={acc.id}
                accountId={acc.id}
                chainSlug={acc.chain.slug as ChainId}
                points={acc.currentPoints}
                lastSyncedAt={acc.lastSynced ? new Date(acc.lastSynced) : new Date(acc.updatedAt)}
                bestRedemptionLabel={
                  redemptionsLoading && !best ? "Loading…" : bestRedemptionLabel(best)
                }
                index={i}
                onPointsChange={() => refetchAccounts()}
                onOpenDetails={() => setDetailsAccount(acc)}
              />
            );
          })}
          <AddAccountCard index={accounts.length} onClick={() => setModalOpen(true)} />
        </div>
      </section>

      <AddAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onLinked={() => refetchAccounts()}
      />

      <AccountDetailsDialog
        open={detailsAccount !== null}
        onOpenChange={(o) => {
          if (!o) setDetailsAccount(null);
        }}
        account={detailsAccount}
        onChange={() => refetchAccounts()}
      />
    </div>
  );
}

function PageState({
  message,
  loading,
  error,
}: {
  message: string;
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      ) : error ? (
        <AlertCircle className="h-6 w-6 text-[var(--danger)]" />
      ) : null}
      <p className={error ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--text-secondary)]"}>
        {message}
      </p>
    </div>
  );
}
