import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(value: number): string {
  return value.toLocaleString();
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatCurrencyDollars(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

export function pointsToCents(points: number, valuePerPoint: number): number {
  return points * valuePerPoint * 100;
}

export function pointsToDollars(points: number, valuePerPoint: number): number {
  return points * valuePerPoint;
}

/**
 * Verbose, user-facing expiration label.
 *   3 days remaining  → "Expires in 3 days"
 *   1 day             → "Expires in 1 day"
 *   <24h, same calendar day or later → "Expires today!"
 *   past              → "Expired"
 */
export function getExpirationLabel(date: Date | string, now: Date = new Date()): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = target.getTime() - now.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (ms < 0) return "Expired";
  if (days <= 0) return "Expires today!";
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

export function timeUntil(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${Math.max(mins, 1)}m`;
}

export function timeAgo(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = Date.now() - target.getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return target.toLocaleDateString();
}
