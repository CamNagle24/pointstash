// Runs on every chain page. When PointStash links to an offer it appends a
// `#ps-deal=<offer title>` fragment to the redeemable page URL; this script
// reads that fragment, locates the on-page element whose text matches the
// title, scrolls it into view, and briefly highlights it.
//
// Matches on visible TEXT, not CSS selectors — these sites use hashed
// styled-component class names that churn, so the same text-first strategy the
// balance scraper relies on is what survives here too. The offer often renders
// late (authed SPA), so we poll + observe like the balance content scripts.

(function () {
  const PREFIX = "ps-deal=";
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  if (!hash.startsWith(PREFIX)) return;

  let target;
  try {
    target = decodeURIComponent(hash.slice(PREFIX.length)).trim().toLowerCase();
  } catch {
    target = hash.slice(PREFIX.length).trim().toLowerCase();
  }
  if (!target) return;

  const MAX_RUNTIME_MS = 20_000;
  const POLL_INTERVAL_MS = 600;
  const startedAt = Date.now();
  let done = false;
  let observer = null;
  let pollId = null;

  function injectHighlightStyle() {
    if (document.getElementById("ps-deal-style")) return;
    const style = document.createElement("style");
    style.id = "ps-deal-style";
    style.textContent = `
      @keyframes ps-deal-pulse {
        0%   { box-shadow: 0 0 0 3px rgba(245,158,11,0.9), 0 0 18px 4px rgba(245,158,11,0.5); }
        100% { box-shadow: 0 0 0 3px rgba(245,158,11,0); }
      }
      .ps-deal-highlight {
        animation: ps-deal-pulse 1.25s ease-out 2;
        border-radius: 10px;
        scroll-margin: 96px;
        outline: 2px solid rgba(245,158,11,0.9);
        outline-offset: 2px;
        transition: outline-color 0.4s ease-out;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function isVisible(el) {
    if (!el || !el.getClientRects().length) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  // Find the *smallest* visible element that contains the target text — that's
  // the tightest wrapper around the offer (a parent card would also match but
  // is too coarse to highlight cleanly).
  function findMatch() {
    const nodes = document.body ? document.body.querySelectorAll("*") : [];
    let best = null;
    for (const el of nodes) {
      const text = (el.textContent || "").trim().toLowerCase();
      if (!text || !text.includes(target)) continue;
      if (!isVisible(el)) continue;
      // Prefer the deepest match: skip if a child also contains the text.
      let childMatches = false;
      for (const child of el.children) {
        if ((child.textContent || "").trim().toLowerCase().includes(target)) {
          childMatches = true;
          break;
        }
      }
      if (childMatches) continue;
      if (!best) best = el;
    }
    return best;
  }

  function reveal(el) {
    if (done) return;
    done = true;
    if (observer) observer.disconnect();
    if (pollId) clearInterval(pollId);
    injectHighlightStyle();
    // Climb to a reasonably card-sized wrapper for the highlight (the tightest
    // text match is often just a heading inside a larger offer card).
    let highlightEl = el;
    for (let i = 0; i < 3 && highlightEl.parentElement; i++) {
      const rect = highlightEl.getBoundingClientRect();
      if (rect.height >= 60) break;
      highlightEl = highlightEl.parentElement;
    }
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      el.scrollIntoView();
    }
    highlightEl.classList.add("ps-deal-highlight");
    setTimeout(() => highlightEl.classList.remove("ps-deal-highlight"), 3000);
  }

  function attempt() {
    if (done) return;
    const match = findMatch();
    if (match) {
      reveal(match);
      return;
    }
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      if (observer) observer.disconnect();
      if (pollId) clearInterval(pollId);
    }
  }

  attempt();
  if (done) return;

  pollId = setInterval(() => {
    if (done || Date.now() - startedAt > MAX_RUNTIME_MS) {
      clearInterval(pollId);
      return;
    }
    attempt();
  }, POLL_INTERVAL_MS);

  try {
    observer = new MutationObserver(() => attempt());
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch {
    // best-effort
  }
})();
