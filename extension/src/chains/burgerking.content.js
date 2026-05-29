// Content script for *.bk.com. Same belt-and-suspenders strategy as the
// other chains, but BK calls their currency "crowns" — every regex/label
// here is widened from /points?|pts?/ to /crowns?|points?|pts?/ so the
// header pill "120 crowns" and the rewards-page heading both register.
//
// BK uses Firebase Auth + a Next.js front-end. Class names are hashed and
// useless — we lean on structural pairs (label + sibling value) and a
// header-restricted short-format scanner.

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
      slug: "burgerking",
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
      slug: "burgerking",
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
    "crowns",
    "crownBalance",
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
    "https://www.bk.com/api/customer/me",
    "https://www.bk.com/api/customer/rewards",
    "https://www.bk.com/api/loyalty/balance",
    "https://www.bk.com/api/rewards/balance",
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
  // Pairs like `<smallHeading>label</smallHeading><bigHeading>N</bigHeading>`
  // inside one wrapper. Class names are useless because they're hashed.
  const LABEL_TAGS = ["h2", "h3", "h4", "h5", "h6", "p", "span"];
  const VALUE_TAGS = ["h1", "h2", "h3"];
  const LABEL_RE =
    /\b(royal\s*perks|crowns?\s*balance|your\s*crowns?|available\s*crowns?|total\s*crowns?|crowns?\s*available|my\s*crowns?|rewards?\s*points?|points?\s*balance|your\s*points?|available\s*points?|total\s*points?)\b/i;

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

  // ----------------------------------- Header short-format ("N crowns")
  // BK renders the user's crown count as a pill in the site header. The
  // rewards page also lists reward items priced in crowns, so we restrict
  // the search to header/nav containers to avoid matching item prices.
  const HEADER_CONTAINERS = [
    "header",
    "nav",
    '[role="banner"]',
    '[role="navigation"]',
    '[class*="Header" i]',
    '[class*="header-" i]',
    '[class*="Nav" i]',
  ];
  const SHORT_FORMAT_RE = /^(\d{1,3}(?:,\d{3})*|\d+)\s*(?:crowns?|pts?|points?)$/i;

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

  // ------------------------------------------------- Crown-icon proximity
  // BK's crown icon is an SVG with fill="#FFAA00". The crown count is
  // almost always rendered as a bare integer in the same parent element
  // (`<svg>…</svg><span>120</span>` pattern). Anchor on the unique fill
  // color and read the integer from a nearby ancestor.
  function tryCrownIconProximity() {
    // Match #FFAA00 case-insensitively. Some pages also use #FFA500.
    const paths = document.querySelectorAll(
      'path[fill="#FFAA00" i], path[fill="#FFA500" i], path[fill="#ffaa00"], path[fill="#ffa500"]',
    );
    for (const path of paths) {
      const svg = path.closest("svg");
      let el = svg?.parentElement || path.parentElement;
      for (let i = 0; el && i < 4; i++, el = el.parentElement) {
        const text = (el.textContent || "").trim();
        // Containers with lots of text are probably reward cards or copy,
        // not a header pill. Keep it tight.
        if (text.length > 80) break;
        const m = text.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\b/);
        if (!m) continue;
        const n = parseGroupedInt(m[1]);
        if (n != null) return { balance: n, source: "crown-icon", ancestorDepth: i };
      }
    }
    return null;
  }

  // --------------------------------------------------------- Semantic selectors
  const SEMANTIC_SELECTORS = [
    '[data-testid="pointsBalance"]',
    '[data-testid="points-balance"]',
    '[data-testid="crownsBalance"]',
    '[data-testid="crowns-balance"]',
    '[data-testid="rewards-balance"]',
    '[data-e2e="pointsBalance"]',
    '[data-e2e="crownsBalance"]',
    '[aria-label*="crowns balance" i]',
    '[aria-label*="your crowns" i]',
    '[aria-label*="points balance" i]',
    '[aria-label*="rewards balance" i]',
    '[class*="CrownsBalance" i]',
    '[class*="PointsBalance" i]',
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
    /\bcrowns?\s*balance\b/i,
    /\byour\s*crowns?\b/i,
    /\bmy\s*crowns?\b/i,
    /\btotal\s*crowns?\b/i,
    /\bavailable\s*crowns?\b/i,
    /\bcrowns?\s*available\b/i,
    /\broyal\s*perks\b/i,
    /\bpoints?\s*balance\b/i,
    /\byour\s*points?\b/i,
    /\brewards?\s*points?\b/i,
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
    const headerHit = tryHeaderShortFormat();
    if (headerHit) {
      succeed(headerHit.balance, "header-short-format", { container: headerHit.container });
      return;
    }
    const crownHit = tryCrownIconProximity();
    if (crownHit) {
      succeed(crownHit.balance, "crown-icon", { ancestorDepth: crownHit.ancestorDepth });
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
      fail("Couldn't find your crowns. Make sure you're signed in and on bk.com/rewards.");
    }
  }

  // On-demand RESCAN handler.
  try {
    chrome?.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== "RESCAN" || msg.slug !== "burgerking") return;
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
        const headerHit = tryHeaderShortFormat();
        if (headerHit) {
          sendResponse({ ok: true, balance: headerHit.balance, source: "header-short-format" });
          return;
        }
        const crownHit = tryCrownIconProximity();
        if (crownHit) {
          sendResponse({ ok: true, balance: crownHit.balance, source: "crown-icon" });
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
    // Tell the background tab to come to the foreground so the user can
    // actually sign in. Otherwise the dashboard appears frozen.
    safeSend({ type: "CHAIN_SIGNIN_DETECTED", slug: "burgerking" });
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
    const headerHit = tryHeaderShortFormat();
    if (headerHit) {
      succeed(headerHit.balance, "header-short-format", { container: headerHit.container });
      return;
    }
    const crownHit = tryCrownIconProximity();
    if (crownHit) {
      succeed(crownHit.balance, "crown-icon", { ancestorDepth: crownHit.ancestorDepth });
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
