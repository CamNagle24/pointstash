import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// offers-harvest.js is the content script that turns the user's logged-in
// rewards page into the payload POSTed to /api/extension/sync-offers. It's a
// self-running IIFE that registers a chrome.runtime.onMessage listener; we eval
// its source against a mocked `chrome` so a refactor can't silently break the
// HARVEST_OFFERS contract (host->slug mapping, text floor/cap, URL capture).
const SCRIPT = readFileSync(
  resolve(process.cwd(), "extension/src/offers-harvest.js"),
  "utf8",
);

type SendResponse = (r: unknown) => void;
type Listener = (msg: unknown, sender: unknown, sendResponse: SendResponse) => unknown;

interface HarvestResponse {
  ok: boolean;
  slug?: string;
  pageText?: string;
  pageUrl?: string;
  error?: string;
}

let listener: Listener | null = null;
let chromeMock: { runtime: { id: string | undefined; onMessage: { addListener: (fn: Listener) => void } } };

function runScript() {
  new Function(SCRIPT)();
}

function setPage(hostname: string, href: string, innerText: string) {
  vi.stubGlobal("location", { hostname, href });
  Object.defineProperty(document.body, "innerText", {
    value: innerText,
    configurable: true,
  });
}

function sendHarvest(type = "HARVEST_OFFERS"): HarvestResponse | undefined {
  let response: HarvestResponse | undefined;
  listener?.({ type }, {}, (r) => {
    response = r as HarvestResponse;
  });
  return response;
}

describe("offers-harvest content script", () => {
  beforeEach(() => {
    listener = null;
    chromeMock = {
      runtime: {
        id: "test-extension-id",
        onMessage: {
          addListener: (fn: Listener) => {
            listener = fn;
          },
        },
      },
    };
    vi.stubGlobal("chrome", chromeMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers a message listener on load", () => {
    runScript();
    expect(typeof listener).toBe("function");
  });

  it("harvests slug, capped page text, and URL on a known chain host", () => {
    setPage(
      "order.wendys.com",
      "https://order.wendys.com/loyalty/rewards",
      "My Rewards\n   \nFree Dave's Single — 500 points with any purchase.",
    );
    runScript();

    const resp = sendHarvest();
    expect(resp?.ok).toBe(true);
    expect(resp?.slug).toBe("wendys");
    expect(resp?.pageUrl).toBe("https://order.wendys.com/loyalty/rewards");
    expect(resp?.pageText).toContain("Free Dave's Single");
  });

  it("maps both dunkin domains to the dunkin slug", () => {
    const text = "Dunkin Rewards: free medium coffee with any mobile order today.";
    setPage("www.dunkindonuts.com", "https://www.dunkindonuts.com/en/rewards", text);
    runScript();
    expect(sendHarvest()?.slug).toBe("dunkin");

    // Fresh listener for the second host.
    listener = null;
    setPage("www.dunkin.com", "https://www.dunkin.com/en/rewards", text);
    runScript();
    expect(sendHarvest()?.slug).toBe("dunkin");
  });

  it("rejects an unknown (non-chain) host", () => {
    setPage("example.com", "https://example.com/whatever", "a".repeat(200));
    runScript();
    const resp = sendHarvest();
    expect(resp?.ok).toBe(false);
    expect(resp?.error).toMatch(/unknown chain/i);
  });

  it("rejects a page with too little readable text (below the 40-char floor)", () => {
    setPage("www.kfc.com", "https://www.kfc.com/account", "Loading...");
    runScript();
    const resp = sendHarvest();
    expect(resp?.ok).toBe(false);
    expect(resp?.error).toMatch(/no readable offers/i);
  });

  it("caps very long page text at 30,000 chars", () => {
    setPage(
      "www.starbucks.com",
      "https://www.starbucks.com/rewards",
      "Stars ".repeat(10_000), // ~60k chars
    );
    runScript();
    const resp = sendHarvest();
    expect(resp?.ok).toBe(true);
    expect(resp?.pageText?.length).toBe(30_000);
  });

  it("reports context invalidation when the runtime id is gone", () => {
    setPage("www.bk.com", "https://www.bk.com/rewards", "Royal Perks: free Whopper with $3 purchase.");
    runScript();
    chromeMock.runtime.id = undefined; // simulate the SW being recycled
    const resp = sendHarvest();
    expect(resp?.ok).toBe(false);
    expect(resp?.error).toMatch(/context invalidated/i);
  });

  it("ignores messages that aren't HARVEST_OFFERS", () => {
    setPage("www.bk.com", "https://www.bk.com/rewards", "Royal Perks: free Whopper.");
    runScript();
    expect(sendHarvest("RESCAN")).toBeUndefined();
  });
});
