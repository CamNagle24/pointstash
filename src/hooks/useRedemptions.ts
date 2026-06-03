"use client";

import useSWR from "swr";
import type { RedemptionOption } from "@/types/redemption";

const fetcher = async (url: string): Promise<{ redemptions: RedemptionOption[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load redemptions (${res.status})`);
  return res.json();
};

export function useRedemptions(chainSlug?: string) {
  // No chainSlug means the caller wants the full cross-chain rate table (the
  // redeem calculator and dashboard valuation both filter client-side). Ask
  // for every chain's options instead of the default top-20-by-value, which
  // would otherwise drop the lower-value chains entirely.
  const url = chainSlug
    ? `/api/redemptions?chain=${encodeURIComponent(chainSlug)}`
    : "/api/redemptions?limit=500";
  const { data, error, isLoading, mutate } = useSWR<{ redemptions: RedemptionOption[] }>(
    url,
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    redemptions: data?.redemptions ?? [],
    error: error as Error | undefined,
    isLoading,
    mutate,
  };
}
