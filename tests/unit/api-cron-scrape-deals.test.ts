import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// db + the scraping/deals side effects are mocked; the real isCronRequest guard
// (from @/lib/api) runs against the request header. @/lib/auth is stubbed
// because @/lib/api imports it transitively.
const { chainFindManyMock, scrapeChainMock, replaceAutoDealsMock, deactivateMock } = vi.hoisted(
  () => ({
    chainFindManyMock: vi.fn(),
    scrapeChainMock: vi.fn(),
    replaceAutoDealsMock: vi.fn(),
    deactivateMock: vi.fn(),
  }),
);
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { chain: { findMany: chainFindManyMock } } }));
vi.mock("@/lib/scrapers", () => ({ scrapeChain: scrapeChainMock }));
vi.mock("@/lib/deals", () => ({
  replaceAutoDeals: replaceAutoDealsMock,
  deactivateExpiredDeals: deactivateMock,
}));

import { GET } from "@/app/api/cron/scrape-deals/route";

const CRON_SECRET = "test-cron-secret";
function cronReq(authorized = true) {
  const headers: Record<string, string> = {};
  if (authorized) headers.authorization = `Bearer ${CRON_SECRET}`;
  return new NextRequest("http://localhost/api/cron/scrape-deals", { headers });
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  chainFindManyMock.mockReset().mockResolvedValue([{ id: "c1", slug: "wendys" }, { id: "c2", slug: "kfc" }]);
  scrapeChainMock.mockReset().mockResolvedValue({ ok: true, deals: [{}, {}] });
  replaceAutoDealsMock.mockReset().mockResolvedValue(2);
  deactivateMock.mockReset().mockResolvedValue(3);
});

describe("GET /api/cron/scrape-deals", () => {
  it("401s without the cron secret", async () => {
    const res = await GET(cronReq(false));
    expect(res.status).toBe(401);
    expect(chainFindManyMock).not.toHaveBeenCalled();
  });

  it("scrapes every enabled chain and replaces its auto deals", async () => {
    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, chainsScanned: 2, dealsInserted: 4, dealsDeactivated: 3, errors: [] });
    expect(replaceAutoDealsMock).toHaveBeenCalledTimes(2);
  });

  it("records the error and skips a chain whose scrape fails, keeping the rest", async () => {
    scrapeChainMock.mockImplementation(async (slug: string) =>
      slug === "wendys" ? { ok: false, error: "timeout" } : { ok: true, deals: [{}] },
    );
    const res = await GET(cronReq());
    const body = await res.json();
    expect(body.chainsScanned).toBe(1); // only kfc
    expect(body.errors).toEqual(["wendys: timeout"]);
    // The failed chain's existing deals are left untouched (no replace call).
    expect(replaceAutoDealsMock).toHaveBeenCalledTimes(1);
  });

  it("500s when the job throws", async () => {
    deactivateMock.mockRejectedValue(new Error("db down"));
    expect((await GET(cronReq())).status).toBe(500);
  });
});
