"use client";

import useSWR from "swr";
import type { ChainAccount } from "@/types/account";

const fetcher = async (url: string): Promise<{ accounts: ChainAccount[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load accounts (${res.status})`);
  return res.json();
};

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<{ accounts: ChainAccount[] }>(
    "/api/accounts",
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    accounts: data?.accounts ?? [],
    error: error as Error | undefined,
    isLoading,
    mutate,
  };
}
