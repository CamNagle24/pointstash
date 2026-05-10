"use client";

import useSWR from "swr";
import type { RedemptionOption } from "@/types/redemption";

const fetcher = async (url: string): Promise<{ redemptions: RedemptionOption[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load redemptions (${res.status})`);
  return res.json();
};

export function useRedemptions(chainSlug?: string) {
  const url = chainSlug
    ? `/api/redemptions?chain=${encodeURIComponent(chainSlug)}`
    : "/api/redemptions";
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
