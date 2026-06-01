/**
 * Per-chain text sources for LLM deal extraction.
 *
 * Point these at URLs that return *text* in their static HTML — official
 * promo/press/newsroom pages, RSS feeds, or Reddit search JSON. Do NOT point
 * them at the JS-rendered deal SPAs (mcdonalds.com/deals etc.): those ship no
 * offer text in static HTML, so there's nothing for the LLM to read.
 *
 * Chains with an entry here get the LLM extraction path in scrapeChain(). The 8
 * chains that have no bespoke Cheerio scraper (chipotle, pancheros, dairyqueen,
 * culvers, jimmyjohns, buffalowildwings, kfc, pandaexpress) are wired purely
 * through this config — no scraper class needed.
 */
export type DealSourceType = "html" | "rss";

export interface DealSource {
  urls: string[];
  type: DealSourceType;
}

export const DEAL_SOURCES: Record<string, DealSource> = {
  mcdonalds: {
    type: "html",
    urls: [
      "https://www.mcdonalds.com/us/en-us/about-us/newsroom.html",
      "https://www.reddit.com/r/McDonaldsEmployees/search.json?q=deal+OR+promo&restrict_sr=1&sort=new&limit=25",
    ],
  },
  chickfila: {
    type: "html",
    urls: ["https://www.chick-fil-a.com/news"],
  },
  wendys: {
    type: "html",
    urls: [
      "https://www.wendys.com/feed/press-releases",
      "https://www.reddit.com/r/wendys/search.json?q=deal+OR+offer&restrict_sr=1&sort=new&limit=25",
    ],
  },
  tacobell: {
    type: "html",
    urls: ["https://www.tacobell.com/news"],
  },
  burgerking: {
    type: "html",
    urls: ["https://company.bk.com/news"],
  },
  popeyes: {
    type: "html",
    urls: ["https://www.popeyes.com/"],
  },
  subway: {
    type: "html",
    urls: ["https://www.subway.com/en-us/aboutus/news"],
  },
  dunkin: {
    type: "html",
    urls: ["https://news.dunkindonuts.com/news"],
  },
  starbucks: {
    type: "html",
    urls: ["https://stories.starbucks.com/press/"],
  },
  chipotle: {
    type: "html",
    urls: [
      "https://newsroom.chipotle.com/news-releases",
      "https://www.reddit.com/r/Chipotle/search.json?q=deal+OR+promo+OR+free&restrict_sr=1&sort=new&limit=25",
    ],
  },
  pancheros: {
    type: "html",
    urls: ["https://www.pancheros.com/news"],
  },
  dairyqueen: {
    type: "html",
    urls: ["https://www.dairyqueen.com/en-us/promotions/"],
  },
  culvers: {
    type: "html",
    urls: ["https://www.culvers.com/news"],
  },
  jimmyjohns: {
    type: "html",
    urls: ["https://www.jimmyjohns.com/"],
  },
  buffalowildwings: {
    type: "html",
    urls: ["https://www.buffalowildwings.com/en/promotions/"],
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
