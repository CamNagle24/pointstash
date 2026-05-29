// Content script for *.chick-fil-a.com. Same three-strategy approach as the
// Starbucks scraper: tight API key matching, specific semantic selectors,
// label-proximity text search. Refuses to guess when uncertain.
//
// Chick-fil-A's rewards are called "points" (no special name like Stars).
// On chick-fil-a.com when logged in, the points balance shows in the header
// avatar area and on /one — usually as "<N> Points" or just a large number
// next to the word "Points".

(function () {
  const MAX_RUNTIME_MS = 45_000;
  const POLL_INTERVAL_MS = 1500;
  const FETCH_TIMEOUT_MS = 4_000;
  const startedAt = Date.now();

  let resolved = false;
  let observer = null;

  const ON_SIGNIN = /\/(signin|sign-in|login|callback)\b/i.test(location.pathname);

  // When the extension reloads (e.g. during dev iteration), content scripts
  // already injected in older tabs lose their connection — chrome.runtime
  // becomes undefined and any sendMessage throws. Guard everything so an
  // orphan script fails silently instead of polluting the page console.
  function ctxValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }
  function safeSend(msg) {
    if (!ctxValid()) return;
    try {
      chrome.runtime.sendMessage(msg);
    } catch {
      // Context was valid at the check but invalidated mid-call — ignore.
    }
  }

  function succeed(balance, source, extra) {
    if (resolved) return;
    resolved = true;
    if (observer) observer.disconnect();
    safeSend({
      type: "CHAIN_BALANCE_FROM_TAB",
      slug: "chickfila",
      balance,
      raw: { source, url: location.href, ...extra },
    });
  }

  function fail(error) {
    if (resolved) return;
    resolved = true;
    if (observer) observer.disconnect();
    safeSend({
      type: "CHAIN_BALANCE_FAILED_FROM_TAB",
      slug: "chickfila",
      error,
    });
  }

  function parseGroupedInt(s) {
    const n = parseInt(String(s).replace(/,/g, ""), 10);
    return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : null;
  }

  // ---------------------------------------------------------------- API probe
  const BALANCE_KEYS = new Set([
    "pointsBalance",
    "points_balance",
    "currentPoints",
    "rewardsBalance",
    "totalPoints",
    "availablePoints",
  ]);

  function findBalanceInJson(obj, depth = 0) {
    if (obj == null || depth > 6 || typeof obj !== "object") return null;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number" && BALANCE_KEYS.has(k)) return v;
      if (typeof v === "object") {
        const nested = findBalanceInJson(v, depth + 1);
        if (nested != null) return nested;
      }
    }
    return null;
  }

  const API_CANDIDATES = [
    "https://www.chick-fil-a.com/api/customers/me",
    "https://www.chick-fil-a.com/api/customers/me/rewards",
    "https://www.chick-fil-a.com/api/me/points",
  ];

  async function fetchWithTimeout(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, {
        credentials: "include",
        headers: { accept: "application/json" },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
  }

  async function tryApi() {
    for (const url of API_CANDIDATES) {
      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (!data) continue;
        const balance = findBalanceInJson(data);
        if (typeof balance === "number") return { balance, endpoint: url };
      } catch {
        // try next
      }
    }
    return null;
  }

  // -------------------------------------------------------- Structural scanner
  // CFA's /my-rewards renders the balance as a fixed pattern:
  //
  //   <div>
  //     <h5>Available points</h5>
  //     <h1>888</h1>
  //     <span>Points updated on …</span>
  //   </div>
  //
  // The class names are styled-components hashes (sc-*) that change every
  // deploy, so we target the structure instead: find any h5 whose text
  // contains "available points" and read the integer out of the sibling h1.
  // Most accurate path for CFA — runs before semantic selectors.
  function tryCfaStructural() {
    const h5s = document.querySelectorAll("h5");
    for (const h5 of h5s) {
      if (!/available\s*points/i.test(h5.textContent || "")) continue;
      const container = h5.parentElement;
      if (!container) continue;
      const h1 = container.querySelector("h1");
      if (!h1) continue;
      const text = (h1.textContent || "").trim();
      const m = text.match(/^(\d{1,3}(?:,\d{3})*|\d+)$/);
      if (!m) continue;
      const n = parseGroupedInt(m[1]);
      if (n != null) return { balance: n, source: "structural" };
    }
    return null;
  }

  // --------------------------------------------------------- Semantic selectors
  const SEMANTIC_SELECTORS = [
    '[data-testid="pointsBalance"]',
    '[data-testid="points-balance"]',
    '[data-e2e="pointsBalance"]',
    '[aria-label*="points balance" i]',
    '[aria-label*="your points" i]',
    '[class*="PointsBalance" i]',
    '[class*="points-balance" i]',
    '[class*="rewardsBalance" i]',
  ];

  function trySemantic() {
    for (const sel of SEMANTIC_SELECTORS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of nodes) {
        const text = (el.textContent || "").trim();
        const m = text.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\b/);
        if (!m) continue;
        const n = parseGroupedInt(m[1]);
        if (n != null) return { balance: n, selector: sel };
      }
    }
    return null;
  }

  // ----------------------------------------------------------- Label proximity
  const LABELS = [
    /\bpoints?\s*balance\b/i,
    /\byour\s*points\b/i,
    /\bmy\s*points\b/i,
    /\btotal\s*points\b/i,
    /\bavailable\s*points\b/i,
    /\bpoints\s*available\b/i,
  ];

  function tryLabelProximity() {
    const root = document.body || document.documentElement;
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.nodeValue || "";
      if (!LABELS.some((re) => re.test(text))) continue;
      let el = walker.currentNode.parentElement;
      for (let i = 0; el && i < 4; i++, el = el.parentElement) {
        const t = el.textContent || "";
        if (t.length > 400) break;
        const m = t.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\b/);
        if (m) {
          const n = parseGroupedInt(m[1]);
          if (n != null) return { balance: n, label: text.trim().slice(0, 60) };
        }
      }
    }
    return null;
  }

  // ------------------------------------------------------------- Orchestrator
  async function attempt() {
    if (resolved) return;
    const structHit = tryCfaStructural();
    if (structHit) {
      succeed(structHit.balance, "structural");
      return;
    }
    const apiHit = await tryApi();
    if (apiHit) {
      succeed(apiHit.balance, "api", { endpoint: apiHit.endpoint });
      return;
    }
    const semHit = trySemantic();
    if (semHit) {
      succeed(semHit.balance, "selector", { selector: semHit.selector });
      return;
    }
    const labelHit = tryLabelProximity();
    if (labelHit) {
      succeed(labelHit.balance, "label-proximity", { label: labelHit.label });
      return;
    }
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      fail(
        "Couldn't find your points. Make sure you're signed in and on order.chick-fil-a.com/my-rewards.",
      );
    }
  }

  // On-demand RESCAN handler for background to scrape an existing CFA tab.
  try {
    chrome?.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== "RESCAN" || msg.slug !== "chickfila") return;
      (async () => {
        if (ON_SIGNIN) {
          sendResponse({ ok: false, error: "On signin page" });
          return;
        }
        const structHit = tryCfaStructural();
        if (structHit) {
          sendResponse({ ok: true, balance: structHit.balance, source: "structural" });
          return;
        }
        const apiHit = await tryApi();
        if (apiHit) {
          sendResponse({ ok: true, balance: apiHit.balance, source: "api" });
          return;
        }
        const semHit = trySemantic();
        if (semHit) {
          sendResponse({ ok: true, balance: semHit.balance, source: "selector" });
          return;
        }
        const labelHit = tryLabelProximity();
        if (labelHit) {
          sendResponse({ ok: true, balance: labelHit.balance, source: "label-proximity" });
          return;
        }
        sendResponse({ ok: false, error: "No balance found on this page" });
      })();
      return true;
    });
  } catch {
    // Orphaned (extension was reloaded) — nothing to register against.
    return;
  }

  if (ON_SIGNIN) {
    safeSend({ type: "CHAIN_SIGNIN_DETECTED", slug: "chickfila" });
    return;
  }

  attempt();
  const pollId = setInterval(() => {
    if (resolved || !ctxValid()) {
      clearInterval(pollId);
      return;
    }
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      clearInterval(pollId);
      attempt();
      return;
    }
    attempt();
  }, POLL_INTERVAL_MS);

  observer = new MutationObserver(() => {
    if (resolved) return;
    const structHit = tryCfaStructural();
    if (structHit) {
      succeed(structHit.balance, "structural");
      return;
    }
    const semHit = trySemantic();
    if (semHit) {
      succeed(semHit.balance, "selector", { selector: semHit.selector });
      return;
    }
    const labelHit = tryLabelProximity();
    if (labelHit) {
      succeed(labelHit.balance, "label-proximity", { label: labelHit.label });
    }
  });
  try {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch {
    // best-effort
  }
})();
