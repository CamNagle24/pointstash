// Content script for *.starbucks.com.
//
// Strategy (each more reliable than the last):
//
//   1. API probe — try a couple of known endpoints. Only trust the value when
//      the JSON contains a field whose key is *specifically* a star-balance
//      name. (We refuse to match generic keys like "stars" because that hits
//      "starsEarnedThisMonth", promotional metadata, etc.)
//   2. Semantic selectors — elements whose class/data/aria attributes name the
//      balance specifically. Tight, no guessing.
//   3. Label proximity — find text like "Star balance" / "Your Stars" in the
//      DOM and pull the number out of its nearest container.
//
// We DELIBERATELY do not fall back to "largest <N> Stars on the page" — on a
// signed-in Starbucks page that's promotional copy ("2,026 Stars for X") and
// drowns out a real low balance. If none of the strategies above hit, we
// report failure with a clear reason; better to ask the user to refresh than
// to silently sync a wrong number.

(function () {
  const MAX_RUNTIME_MS = 45_000;
  const POLL_INTERVAL_MS = 1500;
  const FETCH_TIMEOUT_MS = 4_000;
  const startedAt = Date.now();

  let resolved = false;
  let observer = null;

  const ON_SIGNIN = /\/signin\b/i.test(location.pathname);
  if (!ON_SIGNIN) {
    // Auto-run on non-signin pages. The signin page check stays — we just
    // don't gate the RESCAN listener on it (background may target an
    // existing tab regardless of where it's parked).
  }

  // Defensive against orphaned content scripts (extension reload leaves old
  // scripts running in older tabs with chrome.runtime undefined).
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
      // ignore
    }
  }

  function succeed(balance, source, extra) {
    if (resolved) return;
    resolved = true;
    if (observer) observer.disconnect();
    safeSend({
      type: "CHAIN_BALANCE_FROM_TAB",
      slug: "starbucks",
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
      slug: "starbucks",
      error,
    });
  }

  function parseGroupedInt(s) {
    const n = parseInt(String(s).replace(/,/g, ""), 10);
    return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : null;
  }

  // ---------------------------------------------------------------- API probe
  // Only these exact key names count as a balance. Anything fuzzier (e.g.
  // "stars") matches too many unrelated fields.
  const BALANCE_KEYS = new Set([
    "starBalance",
    "star_balance",
    "currentStarBalance",
    "currentStars",
    "rewardsBalance",
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
    "https://www.starbucks.com/bff/account",
    "https://www.starbucks.com/bff/account/dashboard",
    "https://app.starbucks.com/bff/account",
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
        if (typeof balance === "number") return { balance, source: "api", endpoint: url };
      } catch {
        // try the next candidate
      }
    }
    return null;
  }

  // --------------------------------------------------------- Semantic selectors
  // Tightened to selectors that name the balance specifically. Generic ones
  // like [class*="stars"] match anywhere a class contains "stars" — including
  // promotional cards.
  const SEMANTIC_SELECTORS = [
    '[data-e2e="starBalance"]',
    '[data-e2e="star-balance"]',
    '[data-testid="starBalance"]',
    '[data-testid="star-balance"]',
    '[aria-label*="Star balance" i]',
    '[aria-label*="your stars" i]',
    '[class*="StarBalance" i]',
    '[class*="rewardsBalance" i]',
    '[class*="rewards-balance" i]',
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
        if (n != null) return { balance: n, source: "selector", selector: sel };
      }
    }
    return null;
  }

  // ----------------------------------------------------------- Label proximity
  // Walk text nodes for high-confidence label phrases. When we find one,
  // walk up to a container element and pull the closest number out of its
  // text content. This works for layouts like:
  //
  //   <div>
  //     <span class="label">Star balance</span>
  //     <span class="value">0</span>
  //   </div>
  //
  // …without needing to know either class name in advance.
  const LABELS = [
    /\bstar\s*balance\b/i,
    /\byour\s*stars\b/i,
    /\bmy\s*stars\b/i,
    /\btotal\s*stars\b/i,
    /\bstars\s*available\b/i,
    /\bavailable\s*stars\b/i,
  ];

  function tryLabelProximity() {
    const root = document.body || document.documentElement;
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.nodeValue || "";
      if (!LABELS.some((re) => re.test(text))) continue;
      // Found a label-looking text node. Walk up to a small container and try
      // to find a number near it (in same element, sibling, or close parent).
      let el = walker.currentNode.parentElement;
      for (let i = 0; el && i < 4; i++, el = el.parentElement) {
        const t = el.textContent || "";
        // Skip if container is huge — we don't want to scan the entire page.
        if (t.length > 400) break;
        const m = t.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\b/);
        if (m) {
          const n = parseGroupedInt(m[1]);
          if (n != null) return { balance: n, source: "label-proximity", label: text.trim().slice(0, 60) };
        }
      }
    }
    return null;
  }

  // ------------------------------------------------------------- Orchestrator
  async function attempt() {
    if (resolved) return;
    const apiHit = await tryApi();
    if (apiHit) {
      succeed(apiHit.balance, apiHit.source, { endpoint: apiHit.endpoint });
      return;
    }
    const semHit = trySemantic();
    if (semHit) {
      succeed(semHit.balance, semHit.source, { selector: semHit.selector });
      return;
    }
    const labelHit = tryLabelProximity();
    if (labelHit) {
      succeed(labelHit.balance, labelHit.source, { label: labelHit.label });
      return;
    }
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      fail(
        "Couldn't confidently find your Star balance on the page. Try navigating to starbucks.com/rewards and clicking 'Sync now' from the extension.",
      );
    }
  }

  // On-demand RESCAN handler — background uses this to scrape an already-open
  // starbucks.com tab instead of opening a new one.
  try {
    chrome?.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== "RESCAN" || msg.slug !== "starbucks") return;
      (async () => {
        if (ON_SIGNIN) {
          sendResponse({ ok: false, error: "On signin page" });
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
      return true; // keep channel open for async sendResponse
    });
  } catch {
    // Orphan content script from before extension reload — abort cleanly.
    return;
  }

  // Auto-scrape on page load, only on non-signin pages.
  if (ON_SIGNIN) {
    safeSend({ type: "CHAIN_SIGNIN_DETECTED", slug: "starbucks" });
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
      attempt(); // triggers fail()
      return;
    }
    attempt();
  }, POLL_INTERVAL_MS);

  observer = new MutationObserver(() => {
    if (resolved) return;
    const semHit = trySemantic();
    if (semHit) {
      succeed(semHit.balance, semHit.source, { selector: semHit.selector });
      return;
    }
    const labelHit = tryLabelProximity();
    if (labelHit) {
      succeed(labelHit.balance, labelHit.source, { label: labelHit.label });
    }
  });
  try {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch {
    // observer is best-effort
  }
})();
