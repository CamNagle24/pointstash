"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePoints() {
  const { data, error, isLoading, mutate } = useSWR<{ totals: Array<{ chain: string; points: number }> }>(
    "/api/points",
    fetcher,
  );
  return { totals: data?.totals ?? [], error, isLoading, mutate };
}
