// MV3 service worker. Two responsibilities:
//
//   1. Periodic sync — chrome.alarms fires every 6h, we iterate the chain
//      registry and push fresh balances to PointStash.
//   2. Live connect orchestration — pointstash.com pages talk to us via
//      externally_connectable and ask us to (a) silently pair this browser
//      with the logged-in user, and (b) walk the user through connecting an
//      individual chain (open chain signin tab, watch for balance, close tab).
//
// The user never sees a pairing token or copy/paste step — the dashboard JS
// fetches a bearer token from /api/extension/pair (it's already authed via
// NextAuth cookie) and forwards it to us in the PAIR message.

import { CHAIN_REGISTRY } from "./chains/index.js";
import { getConfig, setPairing, setChainResult } from "./storage.js";
import { pushBalance } from "./api.js";

const ALARM_NAME = "pointstash-sync";
const SYNC_PERIOD_MINUTES = 360;

// connectChain creates a pending entry here keyed by slug (not tabId). The
// user might sign in via an email link that opens a *different* tab than the
// one we initially opened — when that tab's content script reports a balance,
// we still want to resolve. originalTabId is tracked so we can close the
// scratch tab we opened; user-owned tabs (email-link tab, pre-existing tab)
// are never touched.
const pendingConnects = new Map(); // slug -> { originalTabId, port, timeoutId }

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: SYNC_PERIOD_MINUTES,
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncAll();
});

// ---------- messages from pointstash.com (externally_connectable) ----------

chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name === "connect-chain") {
    port.onMessage.addListener((msg) => handleConnectChain(msg, port));
  } else if (port.name === "pair") {
    port.onMessage.addListener((msg) => handlePair(msg, port));
  }
});

// One-shot messages (PING, etc.) for cheap install-detection from the dashboard.
chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return; // sync response
  }
  if (msg?.type === "SYNC_NOW") {
    syncAll().then(() => sendResponse({ ok: true }));
    return true; // keep channel open
  }
  // Silent sync — checks existing tabs only, never opens a new tab. Used by
  // the dashboard's auto-refresh-on-mount and the per-card Sync Now button.
  // Returns { synced: [{slug, balance}], skipped: [slug] } so the dashboard
  // can show a relevant toast if everything was skipped.
  if (msg?.type === "SILENT_SYNC") {
    handleSilentSync(msg.slug).then(sendResponse);
    return true; // keep channel open
  }
});

async function handleSilentSync(onlySlug) {
  const config = await getConfig();
  if (!config?.token) return { synced: [], skipped: [], error: "Extension not paired" };

  const slugs = onlySlug ? [onlySlug] : Object.keys(CHAIN_REGISTRY);
  const synced = [];
  const skipped = [];

  await Promise.all(
    slugs.map(async (slug) => {
      const chain = CHAIN_REGISTRY[slug];
      if (!chain?.hostPattern) {
        skipped.push(slug);
        return;
      }
      const result = await tryRescanExistingTabs(chain, slug);
      if (!result) {
        skipped.push(slug);
        return;
      }
      try {
        await pushBalance({ chainSlug: slug, balance: result.balance, raw: result.raw });
        await setChainResult(slug, { state: "ok", balance: result.balance });
        synced.push({ slug, balance: result.balance });
      } catch (err) {
        console.error(`[pointstash] silent sync ${slug} push failed`, err);
        skipped.push(slug);
      }
    }),
  );

  return { synced, skipped };
}

async function handlePair(msg, port) {
  if (msg?.type !== "PAIR" || !msg.token || !msg.baseUrl) {
    port.postMessage({ type: "PAIR_FAILED", error: "Missing token or baseUrl" });
    return;
  }
  await setPairing({
    token: msg.token,
    baseUrl: msg.baseUrl,
    userId: msg.userId ?? null,
    email: msg.email ?? null,
  });
  port.postMessage({ type: "PAIRED" });
  // Kick off a first sync so the dashboard has data right away.
  syncAll();
}

async function handleConnectChain(msg, port) {
  if (msg?.type !== "CONNECT_CHAIN" || !msg.slug) {
    port.postMessage({ type: "CHAIN_FAILED", error: "Missing slug" });
    return;
  }
  const chain = CHAIN_REGISTRY[msg.slug];
  if (!chain) {
    port.postMessage({ type: "CHAIN_FAILED", error: `Unknown chain: ${msg.slug}` });
    return;
  }
  const config = await getConfig();
  if (!config?.token) {
    port.postMessage({ type: "CHAIN_FAILED", error: "Extension not paired yet" });
    return;
  }

  // Smart path: if the user already has the chain's site open in another tab
  // (presumably logged in), try to scrape that tab first. Saves the
  // open-tab → log-in dance entirely when the user is already authenticated
  // somewhere.
  if (chain.hostPattern) {
    const rescan = await tryRescanExistingTabs(chain, msg.slug);
    if (rescan) {
      try {
        await pushBalance({ chainSlug: msg.slug, balance: rescan.balance, raw: rescan.raw });
        await setChainResult(msg.slug, { state: "ok", balance: rescan.balance });
        port.postMessage({
          type: "CHAIN_CONNECTED",
          slug: msg.slug,
          balance: rescan.balance,
          source: "existing-tab",
        });
        return;
      } catch (err) {
        // Push failed — fall through to the open-new-tab path
        console.error("[pointstash] pushBalance from existing tab failed", err);
      }
    }
  }

  // If there's already a pending connect for this slug, cancel it before
  // starting a new one — keeps stale tabs/ports from piling up if the user
  // re-clicks Connect.
  const stale = pendingConnects.get(msg.slug);
  if (stale) {
    if (stale.timeoutId) clearTimeout(stale.timeoutId);
    try { stale.port.postMessage({ type: "CHAIN_FAILED", error: "Superseded by a new connect attempt." }); } catch {}
    if (stale.originalTabId) chrome.tabs.remove(stale.originalTabId).catch(() => {});
    pendingConnects.delete(msg.slug);
  }

  // Fallback: open the chain's page in a *background* tab so the user keeps
  // seeing the dashboard. If they're already signed in via their browser
  // session, the content script scrapes silently and we close the tab — the
  // user never notices it was there (Vendoo-style "just works" feel). If
  // sign-in is needed, we surface the tab below.
  const tab = await chrome.tabs.create({ url: chain.loginUrl, active: false });

  // Backstop in case the user signs in and stays — keep this generous so
  // magic-link round trips fit comfortably.
  const timeoutId = setTimeout(() => {
    const pending = pendingConnects.get(msg.slug);
    if (!pending) return;
    pending.port.postMessage({
      type: "CHAIN_FAILED",
      error: "No response from chain page after 4 minutes. Make sure you completed sign-in and reached your rewards page.",
    });
    if (pending.originalTabId) chrome.tabs.remove(pending.originalTabId).catch(() => {});
    if (pending.surfaced) refocusDashboard(pending);
    pendingConnects.delete(msg.slug);
  }, 240_000);

  // If the content script doesn't return a balance within 6 seconds AND
  // hasn't already surfaced the tab via a signin signal, surface it so the
  // user can see what's going on (e.g. an unexpected interstitial, cookie
  // banner blocking the SPA, etc.). Signed-in users almost always scrape
  // within 1-3s.
  const surfaceTimer = setTimeout(() => {
    const pending = pendingConnects.get(msg.slug);
    if (!pending || pending.surfaced) return;
    if (pending.originalTabId) {
      chrome.tabs.update(pending.originalTabId, { active: true }).catch(() => {});
      chrome.windows
        .update(pending.originalWindowId ?? tab.windowId, { focused: true })
        .catch(() => {});
      pending.surfaced = true;
    }
  }, 6_000);

  pendingConnects.set(msg.slug, {
    originalTabId: tab.id,
    originalWindowId: tab.windowId,
    surfaced: false,
    surfaceTimer,
    dashboardTabId: port.sender?.tab?.id ?? null,
    dashboardWindowId: port.sender?.tab?.windowId ?? null,
    port,
    timeoutId,
  });
  port.postMessage({ type: "CHAIN_LOGIN_OPENED", tabId: tab.id });
}

// Bring the PointStash tab back to the foreground after we close a chain tab.
// Best-effort — if the tab was closed or the window is gone, we silently skip.
function refocusDashboard(pending) {
  if (!pending) return;
  const tabId = pending.dashboardTabId;
  const windowId = pending.dashboardWindowId;
  if (typeof tabId === "number") {
    chrome.tabs.update(tabId, { active: true }).catch(() => {});
  }
  if (typeof windowId === "number") {
    chrome.windows.update(windowId, { focused: true }).catch(() => {});
  }
}

// While a connect is pending, watch for tabs on the chain's host pattern to
// finish loading — covers the case where the user signs in via an email link
// that opens a fresh tab (different tabId from the one we opened). The
// content script auto-runs on document_idle and will send CHAIN_BALANCE_FROM_TAB
// itself, but if it's racing the listener registration we also poke it with
// an explicit RESCAN once.
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== "complete" || !tab?.url) return;
  for (const [slug, pending] of pendingConnects.entries()) {
    const chain = CHAIN_REGISTRY[slug];
    if (!chain?.hostPattern) continue;
    if (!matchesHostPattern(tab.url, chain.hostPattern)) continue;
    // Give the content script a beat to install its message listener, then poke it.
    setTimeout(() => {
      try {
        chrome.tabs.sendMessage(tabId, { type: "RESCAN", slug }, () => {
          // Errors here are expected (signin pages, etc.); the content script's
          // own auto-run will eventually fire.
          void chrome.runtime.lastError;
        });
      } catch {}
    }, 1500);
    // Track this tab so a balance message arriving from here resolves the connect.
    void pending;
  }
});

function matchesHostPattern(url, pattern) {
  // Patterns look like "https://*.wendys.com/*". Convert to a regex.
  try {
    const re = new RegExp(
      "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
    );
    return re.test(url);
  } catch {
    return false;
  }
}

// Returns { balance, raw } if any existing tab matching the chain's host
// pattern can hand us a balance, else null. Tries each candidate tab in
// parallel and resolves on the first success.
async function tryRescanExistingTabs(chain, slug) {
  let tabs;
  try {
    tabs = await chrome.tabs.query({ url: chain.hostPattern });
  } catch {
    return null;
  }
  if (!tabs || tabs.length === 0) return null;

  const RESCAN_TIMEOUT_MS = 6_000;

  const attempts = tabs.map(
    (t) =>
      new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        }, RESCAN_TIMEOUT_MS);
        try {
          chrome.tabs.sendMessage(t.id, { type: "RESCAN", slug }, (resp) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            // chrome.runtime.lastError fires if the tab has no listener
            // (e.g., content script didn't load on a non-matching path).
            if (chrome.runtime.lastError || !resp?.ok) {
              resolve(null);
              return;
            }
            resolve({
              balance: resp.balance,
              raw: { source: resp.source, tabId: t.id, url: t.url },
            });
          });
        } catch {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(null);
          }
        }
      }),
  );

  for (const result of await Promise.all(attempts)) {
    if (result) return result;
  }
  return null;
}

// ---------- messages from content scripts inside chain tabs ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId || !msg?.slug) return;

  if (msg.type === "CHAIN_BALANCE_FROM_TAB") {
    (async () => {
      try {
        await pushBalance({
          chainSlug: msg.slug,
          balance: msg.balance,
          raw: msg.raw,
        });
        await setChainResult(msg.slug, { state: "ok", balance: msg.balance });

        // Match by slug — the sender tab may not be the one we opened
        // (e.g. user signed in via a magic-link tab).
        const pending = pendingConnects.get(msg.slug);
        if (pending) {
          if (pending.timeoutId) clearTimeout(pending.timeoutId);
          if (pending.surfaceTimer) clearTimeout(pending.surfaceTimer);
          pending.port.postMessage({
            type: "CHAIN_CONNECTED",
            slug: msg.slug,
            balance: msg.balance,
          });
          pendingConnects.delete(msg.slug);
          // Only remove the tab we opened ourselves. Never close a
          // pre-existing user tab or a tab the user opened via email link.
          if (pending.originalTabId && pending.originalTabId !== tabId) {
            chrome.tabs.remove(pending.originalTabId).catch(() => {});
          } else if (pending.originalTabId === tabId) {
            chrome.tabs.remove(tabId).catch(() => {});
          }
          // Only refocus if we surfaced the tab — otherwise the user
          // never left the dashboard and focus didn't move.
          if (pending.surfaced) refocusDashboard(pending);
        }
        sendResponse({ ok: true });
      } catch (err) {
        const pending = pendingConnects.get(msg.slug);
        if (pending) {
          if (pending.timeoutId) clearTimeout(pending.timeoutId);
          if (pending.surfaceTimer) clearTimeout(pending.surfaceTimer);
          pending.port.postMessage({ type: "CHAIN_FAILED", error: String(err?.message ?? err) });
          pendingConnects.delete(msg.slug);
          if (pending.originalTabId) chrome.tabs.remove(pending.originalTabId).catch(() => {});
        }
        sendResponse({ ok: false, error: String(err?.message ?? err) });
      }
    })();
    return true;
  }

  if (msg.type === "CHAIN_SIGNIN_DETECTED") {
    // Content script detected it loaded on a signin/login URL — surface the
    // background tab so the user can sign in. Cancel the surface timer so
    // we don't fight ourselves.
    const pending = pendingConnects.get(msg.slug);
    if (pending && !pending.surfaced && pending.originalTabId === tabId) {
      if (pending.surfaceTimer) {
        clearTimeout(pending.surfaceTimer);
        pending.surfaceTimer = null;
      }
      chrome.tabs.update(tabId, { active: true }).catch(() => {});
      chrome.windows
        .update(pending.originalWindowId ?? sender.tab?.windowId, { focused: true })
        .catch(() => {});
      pending.surfaced = true;
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "CHAIN_BALANCE_FAILED_FROM_TAB") {
    // A *specific tab* gave up — but the user may still be completing sign-in
    // in another tab. Only surface the failure if it came from the scratch
    // tab we opened and there's no other tab that could fulfill it. We err
    // on the side of letting the 4-minute backstop handle it.
    const pending = pendingConnects.get(msg.slug);
    if (pending && pending.originalTabId === tabId) {
      // If the tab was never surfaced (still hidden), bring it to the
      // foreground so the user can see what's blocking — a cookie banner,
      // CAPTCHA, age gate, etc. They might be able to finish manually.
      if (!pending.surfaced) {
        if (pending.surfaceTimer) {
          clearTimeout(pending.surfaceTimer);
          pending.surfaceTimer = null;
        }
        chrome.tabs.update(tabId, { active: true }).catch(() => {});
        chrome.windows
          .update(pending.originalWindowId ?? sender.tab?.windowId, { focused: true })
          .catch(() => {});
        pending.surfaced = true;
      } else {
        // Tab was already surfaced (user signed in there) and *still* failed.
        // Close it and let the 4-min backstop decide.
        chrome.tabs.remove(tabId).catch(() => {});
        pending.originalTabId = null;
      }
    }
    setChainResult(msg.slug, { state: "err", error: msg.error });
    sendResponse({ ok: true });
    return;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  // Don't fail a pending connect just because the scratch tab closed —
  // the user may have moved on to a magic-link tab. The 4-minute backstop
  // will catch genuine stalls. We just null out the originalTabId so we
  // don't try to remove a tab that's already gone.
  for (const pending of pendingConnects.values()) {
    if (pending.originalTabId === tabId) pending.originalTabId = null;
  }
});

// ---------- periodic background sync (alarm-driven) ----------

async function syncAll() {
  const config = await getConfig();
  if (!config?.token) return;

  for (const [slug, chain] of Object.entries(CHAIN_REGISTRY)) {
    try {
      const result = await chain.fetchBalance();
      if (result.state === "ok" && typeof result.balance === "number") {
        await pushBalance({ chainSlug: slug, balance: result.balance, raw: result.raw });
      }
      await setChainResult(slug, result);
    } catch (err) {
      console.error(`[pointstash] ${slug} sync failed`, err);
      await setChainResult(slug, { state: "err", error: String(err?.message ?? err) });
    }
  }
}
