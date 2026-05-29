// PointStash backend client. The extension authenticates with a bearer token
// minted by /api/extension/pair — same model Vendoo-style extensions use:
// one-time pairing on a logged-in browser, long-lived API token afterward.

import { getConfig } from "./storage.js";

async function authedFetch(path, { method = "GET", body, baseUrl, token } = {}) {
  const cfg = baseUrl && token ? { baseUrl, token } : await getConfig();
  if (!cfg?.token) throw new Error("Extension is not paired.");

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PointStash ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function pairExtension(baseUrl, token) {
  // Verifies the pairing token by hitting a whoami-style endpoint. The token
  // was issued by /api/extension/pair on a NextAuth-authenticated session, so
  // it already implicitly carries the userId; this call just confirms it.
  return authedFetch("/api/extension/whoami", { baseUrl, token });
}

export async function pushBalance({ chainSlug, balance, raw }) {
  return authedFetch("/api/extension/sync", {
    method: "POST",
    body: { chainSlug, balance, raw },
  });
}
