// Client-side helper that lets the PointStash dashboard drive the browser
// extension without the user ever seeing a token. Three responsibilities:
//
//   1. detectExtension()   — is PointStash Sync installed on this browser?
//   2. ensurePaired()      — silently mint + forward a bearer token. Idempotent.
//   3. connectChain(slug)  — open chain signin tab, wait for balance, resolve.
//
// All of these talk to the extension's background.js via chrome.runtime APIs.
// They only work if the extension declares this origin in its
// externally_connectable.matches (see extension/manifest.json).

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          callback?: (response: unknown) => void,
        ) => void;
        connect: (extensionId: string, options?: { name?: string }) => RuntimePort;
        lastError?: { message: string };
      };
    };
  }
}

type RuntimePort = {
  postMessage: (msg: unknown) => void;
  onMessage: { addListener: (cb: (msg: unknown) => void) => void };
  onDisconnect: { addListener: (cb: () => void) => void };
  disconnect: () => void;
};

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID ?? "";
const INSTALL_URL = process.env.NEXT_PUBLIC_EXTENSION_INSTALL_URL ?? "";

// Chains the extension can sync today. Mirrors CHAIN_REGISTRY in
// extension/src/chains/index.js — keep these in sync as you add chains.
export const EXTENSION_SUPPORTED_CHAINS = new Set([
  "starbucks",
  "chickfila",
  "wendys",
  "burgerking",
  "popeyes",
  "dunkin",
  "chipotle",
  "pancheros",
  "dairyqueen",
  "culvers",
  "jimmyjohns",
  "buffalowildwings",
  "kfc",
  "pandaexpress",
]);

export function chainHasExtensionSupport(slug: string): boolean {
  return EXTENSION_SUPPORTED_CHAINS.has(slug);
}

export type ConnectResult =
  | { status: "connected"; slug: string; balance: number }
  | { status: "failed"; error: string };

export class ExtensionNotInstalledError extends Error {
  installUrl: string;
  constructor() {
    super("PointStash Sync extension is not installed.");
    this.name = "ExtensionNotInstalledError";
    this.installUrl = INSTALL_URL;
  }
}

export function isExtensionConfigured(): boolean {
  return Boolean(EXTENSION_ID);
}

export async function detectExtension(timeoutMs = 800): Promise<boolean> {
  if (!EXTENSION_ID || typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
    return false;
  }
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);
    try {
      window.chrome!.runtime!.sendMessage(EXTENSION_ID, { type: "PING" }, (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        const ok = Boolean(response && typeof response === "object" && "ok" in response);
        resolve(ok);
      });
    } catch {
      settled = true;
      clearTimeout(t);
      resolve(false);
    }
  });
}

async function mintPairToken(): Promise<{ token: string; baseUrl: string }> {
  const res = await fetch("/api/extension/pair", { method: "POST" });
  if (!res.ok) throw new Error(`Pair failed (${res.status})`);
  const { token } = (await res.json()) as { token: string };
  // baseUrl is whatever the user is currently on — extension uses this as the
  // PointStash origin for subsequent API calls.
  return { token, baseUrl: window.location.origin };
}

export async function ensurePaired(): Promise<void> {
  if (!EXTENSION_ID) throw new ExtensionNotInstalledError();
  const present = await detectExtension();
  if (!present) throw new ExtensionNotInstalledError();

  const { token, baseUrl } = await mintPairToken();

  return new Promise<void>((resolve, reject) => {
    const port = window.chrome!.runtime!.connect(EXTENSION_ID, { name: "pair" });
    let settled = false;
    port.onMessage.addListener((msg) => {
      const m = msg as { type?: string; error?: string };
      if (m?.type === "PAIRED") {
        settled = true;
        port.disconnect();
        resolve();
      } else if (m?.type === "PAIR_FAILED") {
        settled = true;
        port.disconnect();
        reject(new Error(m.error ?? "Pairing failed"));
      }
    });
    port.onDisconnect.addListener(() => {
      if (!settled) reject(new Error("Extension disconnected before pairing finished."));
    });
    port.postMessage({ type: "PAIR", token, baseUrl });
  });
}

export type SilentSyncResult = {
  synced: Array<{ slug: string; balance: number }>;
  skipped: string[];
  error?: string;
};

/**
 * Asks the extension to rescan any open chain tabs and push fresh balances.
 * Never opens a new tab. Safe to call on dashboard mount — degrades quietly
 * if the extension isn't installed, not paired, or no matching tab exists.
 *
 * Pass a slug to sync just one chain (used by per-card Sync Now buttons);
 * omit it to sync everything we have a content script for.
 */
export async function silentSync(slug?: string): Promise<SilentSyncResult> {
  const empty: SilentSyncResult = { synced: [], skipped: [] };
  if (!EXTENSION_ID || typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
    return empty;
  }
  return new Promise<SilentSyncResult>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(empty);
      }
    }, 10_000);
    try {
      window.chrome!.runtime!.sendMessage(
        EXTENSION_ID,
        { type: "SILENT_SYNC", slug },
        (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const r = response as SilentSyncResult | undefined;
          resolve(r ?? empty);
        },
      );
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(empty);
      }
    }
  });
}

export type SyncOffersResult = {
  synced: Array<{ slug: string; count: number }>;
  skipped: string[];
  error?: string;
};

/**
 * Asks the extension to harvest the user's redeemable offers from any open
 * chain tabs and push them to PointStash (where the LLM structures them into
 * personal deals). Never opens a tab; degrades quietly with no extension /
 * no matching tab open. Pass a slug to limit to one chain.
 */
export async function syncOffers(slug?: string): Promise<SyncOffersResult> {
  const empty: SyncOffersResult = { synced: [], skipped: [] };
  if (!EXTENSION_ID || typeof window === "undefined" || !window.chrome?.runtime?.sendMessage) {
    return empty;
  }
  return new Promise<SyncOffersResult>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(empty);
      }
    }, 15_000);
    try {
      window.chrome!.runtime!.sendMessage(
        EXTENSION_ID,
        { type: "SYNC_OFFERS", slug },
        (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve((response as SyncOffersResult | undefined) ?? empty);
        },
      );
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(empty);
      }
    }
  });
}

export async function connectChain(slug: string): Promise<ConnectResult> {
  await ensurePaired();

  return new Promise<ConnectResult>((resolve) => {
    const port = window.chrome!.runtime!.connect(EXTENSION_ID, { name: "connect-chain" });
    port.onMessage.addListener((msg) => {
      const m = msg as {
        type?: string;
        slug?: string;
        balance?: number;
        error?: string;
      };
      if (m?.type === "CHAIN_CONNECTED" && typeof m.balance === "number") {
        port.disconnect();
        resolve({ status: "connected", slug: m.slug ?? slug, balance: m.balance });
      } else if (m?.type === "CHAIN_FAILED") {
        port.disconnect();
        resolve({ status: "failed", error: m.error ?? "Unknown error" });
      }
      // CHAIN_LOGIN_OPENED is informational — keep waiting.
    });
    port.onDisconnect.addListener(() => {
      resolve({ status: "failed", error: "Extension closed the connection." });
    });
    port.postMessage({ type: "CONNECT_CHAIN", slug });
  });
}
