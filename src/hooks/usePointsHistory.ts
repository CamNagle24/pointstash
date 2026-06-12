"use client";

import useSWR from "swr";
import type { PointsHistoryRecord } from "@/lib/points-history";

const fetcher = async (url: string): Promise<{ history: PointsHistoryRecord[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
  return res.json();
};

/**
 * Balance-change history for one account. Passing a falsy accountId disables
 * the request (SWR null key), so callers can gate fetching on a dialog being
 * open without conditionally calling the hook.
 */
export function usePointsHistory(accountId?: string) {
  const { data, error, isLoading } = useSWR<{ history: PointsHistoryRecord[] }>(
    accountId ? `/api/points/history?accountId=${encodeURIComponent(accountId)}&limit=100` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    history: data?.history ?? [],
    error: error as Error | undefined,
    isLoading: accountId ? isLoading : false,
  };
}
