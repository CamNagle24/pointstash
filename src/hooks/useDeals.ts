"use client";

import useSWR from "swr";
import type { Deal } from "@/types/deal";

const fetcher = async (url: string): Promise<{ deals: Deal[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load deals (${res.status})`);
  return res.json();
};

export function useDeals(chainSlug?: string) {
  const url = chainSlug ? `/api/deals?chain=${encodeURIComponent(chainSlug)}` : "/api/deals";
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
