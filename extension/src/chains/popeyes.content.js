// Content script for *.popeyes.com. Same belt-and-suspenders strategy as
// Burger King (they share the RBI platform), minus the crown-icon scanner —
// Popeyes uses generic "points" labeling rather than a unique currency
// name like BK's "crowns".

(function () {
  const MAX_RUNTIME_MS = 45_000;
  const POLL_INTERVAL_MS = 1500;
  const FETCH_TIMEOUT_MS = 4_000;
  const startedAt = Date.now();

  let resolved = false;
  let observer = null;

  const ON_SIGNIN = /\/(signin|sign-in|signup|sign-up|login|callback|auth)\b/i.test(location.pathname);

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
      slug: "popeyes",
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
      slug: "popeyes",
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
    "balance",
    "loyaltyPoints",
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
    "https://www.popeyes.com/api/customer/me",
    "https://www.popeyes.com/api/customer/rewards",
    "https://www.popeyes.com/api/loyalty/balance",
    "https://www.popeyes.com/api/rewards/balance",
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

  // ------------------------------------------------- Structural label/value
  const LABEL_TAGS = ["h2", "h3", "h4", "h5", "h6", "p", "span"];
  const VALUE_TAGS = ["h1", "h2", "h3"];
  const LABEL_RE =
    /\b(rewards?\s*points?|points?\s*balance|your\s*points?|available\s*points?|total\s*points?|my\s*points?|popeyes\s*rewards?)\b/i;

  function tryStructural() {
    for (const tag of LABEL_TAGS) {
      const candidates = document.getElementsByTagName(tag);
      for (const labelEl of candidates) {
        const text = (labelEl.textContent || "").trim();
        if (!LABEL_RE.test(text)) continue;
        const container = labelEl.parentElement;
        if (!container) continue;
        for (const vTag of VALUE_TAGS) {
          const valEl = container.querySelector(vTag);
          if (!valEl || valEl === labelEl) continue;
          const valText = (valEl.textContent || "").trim();
          const m = valText.match(/^(\d{1,3}(?:,\d{3})*|\d+)$/);
          if (!m) continue;
          const n = parseGroupedInt(m[1]);
          if (n != null) return { balance: n, source: "structural", labelTag: tag, valueTag: vTag };
        }
      }
    }
    return null;
  }

  // ------------------------------------------------ Aria-label scanner
  // RBI's React Native Web stack renders the header pill as
  //   <button aria-label="0 Points" data-testid="loyalty-points-or-signup-button">
  //     <icon/> <div>0</div>
  //   </button>
  // The textContent is just "0" so trySemantic/tryHeaderShortFormat can't
  // disambiguate from any other digit on the page. But the aria-label *is*
  // "<N> Points" verbatim, which is unambiguous when it matches a strict
  // "number + currency word" shape with nothing else around it.
  //
  // We further gate the match on either (a) being inside a header/nav
  // container, or (b) having a data-testid that hints at loyalty so a
  // reward-purchase button labeled "500 Points" doesn't poison the result.
  const CURRENCY_WORDS = /(?:pts?|points?|crowns?|stars?|tokens?)/i;
  const ARIA_STRICT = new RegExp(
    `^(\\d{1,3}(?:,\\d{3})*|\\d+)\\s*${CURRENCY_WORDS.source}$`,
    "i",
  );
  const TESTID_HINT = /(?:loyalty|points|balance|rewards)/i;

  function tryAriaLabel() {
    // Pass 1: aria-labels inside header/nav containers.
    for (const sel of HEADER_CONTAINERS) {
      let containers;
      try {
        containers = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const container of containers) {
        const candidates = container.querySelectorAll("[aria-label]");
        for (const el of candidates) {
          const label = (el.getAttribute("aria-label") || "").trim();
          const m = label.match(ARIA_STRICT);
          if (!m) continue;
          const n = parseGroupedInt(m[1]);
          if (n != null) return { balance: n, label, source: "aria-header" };
        }
      }
    }
    // Pass 2: anywhere with a loyalty-hinted data-testid.
    const hinted = document.querySelectorAll("[data-testid][aria-label]");
    for (const el of hinted) {
      const testid = el.getAttribute("data-testid") || "";
      if (!TESTID_HINT.test(testid)) continue;
      const label = (el.getAttribute("aria-label") || "").trim();
      const m = label.match(ARIA_STRICT);
      if (!m) continue;
      const n = parseGroupedInt(m[1]);
      if (n != null) return { balance: n, label, source: "aria-testid" };
    }
    return null;
  }

  // ----------------------------------------- Header short-format ("N pts")
  const HEADER_CONTAINERS = [
    "header",
    "nav",
    '[role="banner"]',
    '[role="navigation"]',
    '[class*="Header" i]',
    '[class*="header-" i]',
    '[class*="Nav" i]',
  ];
  const SHORT_FORMAT_RE = /^(\d{1,3}(?:,\d{3})*|\d+)\s*(?:pts?|points?)$/i;

  function tryHeaderShortFormat() {
    for (const sel of HEADER_CONTAINERS) {
      let containers;
      try {
        containers = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const container of containers) {
        const candidates = container.querySelectorAll("span, div, button, a, p");
        for (const el of candidates) {
          const text = (el.textContent || "").trim();
          const m = text.match(SHORT_FORMAT_RE);
          if (!m) continue;
          const n = parseGroupedInt(m[1]);
          if (n != null) return { balance: n, container: sel };
        }
      }
    }
    return null;
  }

  // --------------------------------------------------------- Semantic selectors
  const SEMANTIC_SELECTORS = [
    // Popeyes (RBI) test IDs — `user-points` is the h1 on /rewards,
    // `loyalty-points-or-signup-button` is the header pill on every page.
    '[data-testid="user-points"]',
    '[data-testid*="user-points" i]',
    '[data-testid*="loyalty-points" i]',
    // Generic patterns we've seen across chains.
    '[data-testid="pointsBalance"]',
    '[data-testid="points-balance"]',
    '[data-testid="rewards-balance"]',
    '[data-testid="loyaltyPoints"]',
    '[data-e2e="pointsBalance"]',
    '[aria-label*="points balance" i]',
    '[aria-label*="your points" i]',
    '[aria-label*="rewards balance" i]',
    '[class*="PointsBalance" i]',
    '[class*="rewardsBalance" i]',
    '[class*="LoyaltyPoints" i]',
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
    /\byour\s*points?\b/i,
    /\bmy\s*points?\b/i,
    /\btotal\s*points?\b/i,
    /\bavailable\s*points?\b/i,
    /\bpoints?\s*available\b/i,
    /\brewards?\s*points?\b/i,
    /\bpopeyes\s*rewards?\b/i,
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
    const structHit = tryStructural();
    if (structHit) {
      succeed(structHit.balance, "structural", {
        labelTag: structHit.labelTag,
        valueTag: structHit.valueTag,
      });
      return;
    }
    const ariaHit = tryAriaLabel();
    if (ariaHit) {
      succeed(ariaHit.balance, "aria-label", { source: ariaHit.source, label: ariaHit.label });
      return;
    }
    const headerHit = tryHeaderShortFormat();
    if (headerHit) {
      succeed(headerHit.balance, "header-short-format", { container: headerHit.container });
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
      fail("Couldn't find your points. Make sure you're signed in and on popeyes.com/rewards.");
    }
  }

  // On-demand RESCAN handler.
  try {
    chrome?.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== "RESCAN" || msg.slug !== "popeyes") return;
      (async () => {
        if (ON_SIGNIN) {
          sendResponse({ ok: false, error: "On signin page" });
          return;
        }
        const structHit = tryStructural();
        if (structHit) {
          sendResponse({ ok: true, balance: structHit.balance, source: "structural" });
          return;
        }
        const ariaHit = tryAriaLabel();
        if (ariaHit) {
          sendResponse({ ok: true, balance: ariaHit.balance, source: "aria-label" });
          return;
        }
        const headerHit = tryHeaderShortFormat();
        if (headerHit) {
          sendResponse({ ok: true, balance: headerHit.balance, source: "header-short-format" });
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
    return;
  }

  if (ON_SIGNIN) {
    safeSend({ type: "CHAIN_SIGNIN_DETECTED", slug: "popeyes" });
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
    const structHit = tryStructural();
    if (structHit) {
      succeed(structHit.balance, "structural", {
        labelTag: structHit.labelTag,
        valueTag: structHit.valueTag,
      });
      return;
    }
    const ariaHit = tryAriaLabel();
    if (ariaHit) {
      succeed(ariaHit.balance, "aria-label", { source: ariaHit.source, label: ariaHit.label });
      return;
    }
    const headerHit = tryHeaderShortFormat();
    if (headerHit) {
      succeed(headerHit.balance, "header-short-format", { container: headerHit.container });
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
