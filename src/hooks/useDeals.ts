"use client";

import useSWR from "swr";
import type { Deal } from "@/types/deal";

const fetcher = async (url: string): Promise<{ deals: Deal[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load deals (${res.status})`);
  return res.json();
};

export function useDeals(chainSlug?: string) {
  // Default to soonest-expiring so "This week's deals" leads with what's ending.
  // limit=100 (the API max) so the client-side chain/type filters see every deal.
  const params = new URLSearchParams({ sort: "expiring", limit: "100" });
  if (chainSlug) params.set("chain", chainSlug);
  const url = `/api/deals?${params.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<{ deals: Deal[] }>(url, fetcher, {
    revalidateOnFocus: false,
  });
  return {
    deals: data?.deals ?? [],
    error: error as Error | undefined,
    isLoading,
    mutate,
  };
}
