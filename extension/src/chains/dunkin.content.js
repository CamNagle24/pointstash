// Content script for *.dunkindonuts.com and *.dunkin.com. Dunkin' calls
// their currency "DD Perks points" — every regex below accepts "points",
// "pts", or the longer "dd perks" prefix to cover their copy variants.

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
      slug: "dunkin",
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
      slug: "dunkin",
      error,
    });
  }

  function parseGroupedInt(s) {
    const n = parseInt(String(s).replace(/,/g, ""), 10);
    return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : null;
  }

  // Dunkin's public marketing page (`/en/dd-perks` when signed-out) is
  // saturated with "DD Perks" branding and numeric copy ("earn 1 point per
  // dollar", "5x points Tuesdays", etc). Without a signed-in gate every
  // scanner false-positives on that copy. We require at least one durable
  // logged-in marker before scraping anything.
  const SIGNED_IN_MARKERS = [
    'a[href*="signout" i]',
    'a[href*="logout" i]',
    'a[href*="sign-out" i]',
    'a[href*="log-out" i]',
    'button[aria-label*="sign out" i]',
    'button[aria-label*="log out" i]',
    '[data-testid*="user-menu" i]',
    '[data-testid*="account-menu" i]',
    '[aria-label*="my account" i]',
    // Dunkin'-specific: these classes only render on the authenticated
    // rewards page, so their presence is itself proof of sign-in.
    ".reward-milestone__total-points__amount",
    '[class*="reward-milestone" i]',
  ];
  let signinNotified = false;
  function looksSignedIn() {
    for (const sel of SIGNED_IN_MARKERS) {
      try {
        if (document.querySelector(sel)) return true;
      } catch {
        // bad selector — skip
      }
    }
    return false;
  }
  function notifySignedOut() {
    if (signinNotified) return;
    signinNotified = true;
    safeSend({ type: "CHAIN_SIGNIN_DETECTED", slug: "dunkin" });
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
    "ddPerksPoints",
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
    "https://www.dunkindonuts.com/api/customer/me",
    "https://www.dunkindonuts.com/api/customer/rewards",
    "https://www.dunkindonuts.com/api/loyalty/balance",
    "https://www.dunkindonuts.com/api/ddperks/balance",
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

  // ------------------------------------------------- High-confidence selector
  // Targets the `.reward-milestone__total-points` block which contains both
  // the amount span and a "Total Points" sibling label. Verifying the label
  // prevents matches against unrelated milestone widgets that might re-use
  // the same BEM tail (e.g. progress thresholds).
  function tryHighConfidence() {
    const containers = document.querySelectorAll(".reward-milestone__total-points");
    for (const container of containers) {
      const labelEl = container.querySelector(".reward-milestone__total-points__label");
      const amountEl = container.querySelector(".reward-milestone__total-points__amount");
      if (!labelEl || !amountEl) continue;
      const labelText = (labelEl.textContent || "").trim();
      if (!/total\s*points?/i.test(labelText)) continue;
      const amountText = (amountEl.textContent || "").trim();
      const m = amountText.match(/^(\d{1,3}(?:,\d{3})*|\d+)$/);
      if (!m) continue;
      const n = parseGroupedInt(m[1]);
      if (n != null) return { balance: n };
    }
    return null;
  }

  // ------------------------------------------------- Structural label/value
  const LABEL_TAGS = ["h2", "h3", "h4", "h5", "h6", "p", "span"];
  const VALUE_TAGS = ["h1", "h2", "h3"];
  // Intentionally requires "points" to follow "dd perks" — the bare brand
  // appears on every promo card / hero banner and would let any nearby
  // number win.
  const LABEL_RE =
    /\b(dd\s*perks\s*points?|rewards?\s*points?|points?\s*balance|your\s*points?|available\s*points?|total\s*points?|my\s*points?)\b/i;

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
  const HEADER_CONTAINERS = [
    "header",
    "nav",
    '[role="banner"]',
    '[role="navigation"]',
    '[class*="Header" i]',
    '[class*="header-" i]',
    '[class*="Nav" i]',
  ];
  const CURRENCY_WORDS = /(?:pts?|points?)/i;
  const ARIA_STRICT = new RegExp(
    `^(\\d{1,3}(?:,\\d{3})*|\\d+)\\s*${CURRENCY_WORDS.source}$`,
    "i",
  );
  const TESTID_HINT = /(?:loyalty|points|balance|rewards|perks)/i;

  function tryAriaLabel() {
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
  // NOTE: kept tighter than the other chains because Dunkin' uses "DD Perks"
  // as a brand name on marketing pages — `[class*="DDPerks"]` would match
  // promo cards, not the balance widget. Use only selectors that imply a
  // balance/points display specifically.
  const SEMANTIC_SELECTORS = [
    // Confirmed on /en/account/dunkinrewards: BEM span containing just the
    // integer balance. The broader `total-points__amount` variant catches
    // small naming drift if Dunkin' moves the widget.
    ".reward-milestone__total-points__amount",
    '[class*="total-points__amount" i]',
    '[data-testid="user-points"]',
    '[data-testid="pointsBalance"]',
    '[data-testid="points-balance"]',
    '[data-testid="rewards-balance"]',
    '[data-testid="loyaltyPoints"]',
    '[data-testid*="loyalty-points" i]',
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

  // Label-proximity scanner intentionally omitted. The other chains use one,
  // but Dunkin's rewards page has copy like "REWARD POINTS $1 = 10 points"
  // adjacent to a matching label — the walker would return $1 as the user's
  // balance. The high-confidence + semantic selectors above are precise
  // enough that we'd rather time out and surface the tab than guess.

  // ------------------------------------------------------------- Orchestrator
  async function attempt() {
    if (resolved) return;
    // High-confidence first: if the rewards-points span is on the page, the
    // user is signed in *and* this is its real value — no signed-in gate
    // needed (the selector itself only exists when authenticated).
    const hcHit = tryHighConfidence();
    if (hcHit) {
      succeed(hcHit.balance, "high-confidence");
      return;
    }
    if (!looksSignedIn()) {
      // Surface the tab so the user can sign in. Polling keeps trying — once
      // they sign in and the account menu renders, looksSignedIn() flips true.
      notifySignedOut();
      return;
    }
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
    // NOTE: label-proximity intentionally not invoked here. Dunkin's rewards
    // page has copy like "REWARD POINTS $1 = 10 points" right next to a
    // `\brewards?\s*points?\b` label, which the walker treats as a balance
    // of $1. The high-confidence + semantic selectors above are precise
    // enough that we'd rather time out than guess.
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      fail("Couldn't find your DD Perks points. Make sure you're signed in and on dunkindonuts.com/en/account/dunkinrewards.");
    }
  }

  try {
    chrome?.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== "RESCAN" || msg.slug !== "dunkin") return;
      (async () => {
        if (ON_SIGNIN) {
          sendResponse({ ok: false, error: "On signin page" });
          return;
        }
        const hcHit = tryHighConfidence();
        if (hcHit) {
          sendResponse({ ok: true, balance: hcHit.balance, source: "high-confidence" });
          return;
        }
        if (!looksSignedIn()) {
          sendResponse({ ok: false, error: "Not signed in" });
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
        sendResponse({ ok: false, error: "No balance found on this page" });
      })();
      return true;
    });
  } catch {
    return;
  }

  if (ON_SIGNIN) {
    safeSend({ type: "CHAIN_SIGNIN_DETECTED", slug: "dunkin" });
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
    const hcHit = tryHighConfidence();
    if (hcHit) {
      succeed(hcHit.balance, "high-confidence");
      return;
    }
    if (!looksSignedIn()) return;
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
    }
    // label-proximity deliberately omitted — see attempt() above for why.
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
