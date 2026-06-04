import { CHAINS } from "@/lib/constants";
import type { ChainId } from "@/types/chain";

// Dunkin serves both domains; every other chain uses its single CHAINS domain.
export const EXTRA_HOSTS: Record<string, string[]> = { dunkin: ["dunkin.com"] };

/**
 * True if `pageUrl` is an http(s) URL whose host belongs to the given chain
 * (exact host or a sub-domain of the chain's domain).
 *
 * This is a security guard: the host of a page the extension scraped becomes a
 * stored `redeemUrl` that we later `window.open`. Validating it here stops a
 * compromised/spoofed tab from planting an arbitrary or non-http link. The
 * suffix check is anchored on "." so `wendys.com.evil.com` and
 * `evilwendys.com` are both rejected, and userinfo tricks like
 * `https://wendys.com@evil.com` resolve to host `evil.com` (rejected).
 */
export function hostBelongsToChain(pageUrl: string, slug: string): boolean {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  const host = url.hostname.toLowerCase();
  const domains = [CHAINS[slug as ChainId]?.domain, ...(EXTRA_HOSTS[slug] ?? [])]
    .filter(Boolean)
    .map((d) => (d as string).toLowerCase());

  return domains.some((d) => host === d || host.endsWith("." + d));
}
