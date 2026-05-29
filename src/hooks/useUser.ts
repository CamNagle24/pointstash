"use client";

import useSWR from "swr";

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  notifyExpiring: boolean;
  notifyDeals: boolean;
  notifyDigest: boolean;
  createdAt: string;
};

const fetcher = async (url: string): Promise<UserProfile> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
  return res.json();
};

export function useUser() {
  const { data, error, isLoading, mutate } = useSWR<UserProfile>(
    "/api/user/me",
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    user: data,
    error: error as Error | undefined,
    isLoading,
    mutate,
  };
}
