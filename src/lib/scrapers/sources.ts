/**
 * Per-chain text sources for LLM deal extraction.
 *
 * Point these at URLs that return *text* in their static HTML — official
 * promo/press/newsroom pages, RSS feeds, or Reddit search JSON. Do NOT point
 * them at the JS-rendered deal SPAs (mcdonalds.com/deals etc.): those ship no
 * offer text in static HTML, so there's nothing for the LLM to read.
 *
 * Chains with an entry here get the LLM extraction path in scrapeChain(), which
 * is tried first when ANTHROPIC_API_KEY is set. The 6 chains that have no
 * bespoke Cheerio scraper (pancheros, dairyqueen, culvers, buffalowildwings,
 * kfc, pandaexpress) are wired purely through this config — no scraper class
 * needed. chipotle and jimmyjohns have both: the LLM path when configured,
 * falling back to src/lib/scrapers/chipotle.ts or jimmyjohns.ts otherwise.
 */
export type DealSourceType = "html" | "rss";

export interface DealSource {
  urls: string[];
  type: DealSourceType;
}

export const DEAL_SOURCES: Record<string, DealSource> = {
  mcdonalds: {
    type: "html",
    urls: ["https://corporate.mcdonalds.com/corpmcd/our-stories.html"],
  },
  chickfila: {
    type: "html",
    urls: ["https://www.chick-fil-a.com/stories"],
  },
  wendys: {
    type: "html",
    urls: [
      "https://www.wendys.com/blog",
      "https://ir.wendys.com/news-and-events/news/default.aspx",
    ],
  },
  tacobell: {
    type: "html",
    urls: ["https://www.tacobell.com/newsroom"],
  },
  // Burger King + Popeyes are Restaurant Brands International — its corporate
  // newsroom server-renders press releases for both brands.
  burgerking: {
    type: "html",
    urls: ["https://www.rbi.com/English/news/default.aspx"],
  },
  popeyes: {
    type: "html",
    urls: ["https://www.rbi.com/English/news/default.aspx"],
  },
  subway: {
    type: "html",
    urls: ["https://newsroom.subway.com"],
  },
  dunkin: {
    type: "html",
    urls: ["https://news.dunkindonuts.com/news"],
  },
  starbucks: {
    type: "html",
    urls: ["https://about.starbucks.com/stories/program/press-resources/"],
  },
  chipotle: {
    type: "html",
    urls: ["https://newsroom.chipotle.com/press-releases"],
  },
  dairyqueen: {
    type: "html",
    urls: ["https://news.dairyqueen.com"],
  },
  jimmyjohns: {
    type: "html",
    urls: ["https://www.jimmyjohns.com/menu/deals"],
  },
  // No reliably-scrapeable public text source today (sites are JS-only SPAs or
  // block bots): pancheros, culvers, buffalowildwings, kfc, pandaexpress. Their
  // best-effort official pages stay below; the LLM path returns nothing for
  // them and the cron falls back to curated MANUAL deals (the hybrid design).
  pancheros: {
    type: "html",
    urls: ["https://www.pancheros.com/"],
  },
  culvers: {
    type: "html",
    urls: ["https://www.culvers.com/"],
  },
  buffalowildwings: {
    type: "html",
    urls: ["https://www.buffalowildwings.com/"],
  },
  kfc: {
    type: "html",
    urls: ["https://www.kfc.com/about/newsroom"],
  },
  pandaexpress: {
    type: "html",
    urls: ["https://www.pandaexpress.com/promotions"],
  },
};
