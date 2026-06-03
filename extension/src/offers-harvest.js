// Shared content script (all chain hosts). On a HARVEST_OFFERS message it
// grabs the rendered text of the page the user is on (their logged-in
// rewards/offers page) plus the URL, and ships it to the background, which
// POSTs it to PointStash. The server runs the same LLM extractor used for the
// public scrape to turn that text into structured, personal, redeemable deals.
//
// We harvest *rendered* text (document.body.innerText) because these offers
// pages are authed SPAs — the server can't fetch them, but we're already
// inside the user's session here.

(function () {
  const MAX_TEXT_CHARS = 30_000;

  // hostname suffix -> PointStash chain slug. Mirrors the host_permissions /
  // CHAIN_REGISTRY list (the 14 chains the extension syncs).
  const HOST_SLUG = [
    ["starbucks.com", "starbucks"],
    ["chick-fil-a.com", "chickfila"],
    ["wendys.com", "wendys"],
    ["bk.com", "burgerking"],
    ["popeyes.com", "popeyes"],
    ["dunkindonuts.com", "dunkin"],
    ["dunkin.com", "dunkin"],
    ["chipotle.com", "chipotle"],
    ["pancheros.com", "pancheros"],
    ["dairyqueen.com", "dairyqueen"],
    ["culvers.com", "culvers"],
    ["jimmyjohns.com", "jimmyjohns"],
    ["buffalowildwings.com", "buffalowildwings"],
    ["kfc.com", "kfc"],
    ["pandaexpress.com", "pandaexpress"],
  ];

  function slugForHost() {
    const host = location.hostname.toLowerCase();
    for (const [suffix, slug] of HOST_SLUG) {
      if (host === suffix || host.endsWith("." + suffix)) return slug;
    }
    return null;
  }

  function ctxValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function harvest() {
    const slug = slugForHost();
    if (!slug) return { ok: false, error: "Unknown chain host" };
    const text = (document.body?.innerText || "").replace(/\s+\n/g, "\n").trim();
    if (text.length < 40) return { ok: false, error: "No readable offers text on this page yet" };
    return {
      ok: true,
      slug,
      pageText: text.slice(0, MAX_TEXT_CHARS),
      pageUrl: location.href,
    };
  }

  try {
    chrome?.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== "HARVEST_OFFERS") return;
      if (!ctxValid()) {
        sendResponse({ ok: false, error: "Extension context invalidated" });
        return;
      }
      // Reply with the harvested text; the background forwards it to
      // PointStash (single POST path, mirrors the balance rescan flow).
      sendResponse(harvest());
      return true;
    });
  } catch {
    // best-effort; offers harvesting is optional enrichment
  }
})();
