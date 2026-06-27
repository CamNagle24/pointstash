import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// db + scan/deactivate side effects are mocked; the real isCronRequest and
// requireAuth guards (from @/lib/api) run — isCronRequest against the header,
// requireAuth against the mocked auth(). @/lib/auth is stubbed because
// @/lib/api imports it transitively. Per-chain isolation is covered against
// the real scanAndReplaceDeals in tests/unit/deals.test.ts; here we only
// check that the route wires its result through correctly.
const { authMock, chainFindManyMock, scanAndReplaceDealsMock, deactivateMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    chainFindManyMock: vi.fn(),
    scanAndReplaceDealsMock: vi.fn(),
    deactivateMock: vi.fn(),
  }),
);
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({ db: { chain: { findMany: chainFindManyMock } } }));
vi.mock("@/lib/deals", () => ({
  scanAndReplaceDeals: scanAndReplaceDealsMock,
  deactivateExpiredDeals: deactivateMock,
}));

import { POST } from "@/app/api/deals/scrape/route";

const CRON_SECRET = "test-cron-secret";

function scrapeReq({ cron = false, body }: { cron?: boolean; body?: unknown } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cron) headers.authorization = `Bearer ${CRON_SECRET}`;
  return new NextRequest("http://localhost/api/deals/scrape", {
    method: "POST",
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  authMock.mockReset().mockResolvedValue(null);
  chainFindManyMock
    .mockReset()
    .mockResolvedValue([{ id: "c1", slug: "wendys" }, { id: "c2", slug: "kfc" }]);
  scanAndReplaceDealsMock.mockReset().mockResolvedValue({ chainsScanned: 2, dealsInserted: 4, errors: [] });
  deactivateMock.mockReset().mockResolvedValue(3);
});

describe("POST /api/deals/scrape", () => {
  it("401s a non-cron, unauthenticated caller", async () => {
    const res = await POST(scrapeReq({ body: {} }));
    expect(res.status).toBe(401);
    expect(chainFindManyMock).not.toHaveBeenCalled();
  });

  it("runs for an authenticated user (no cron header)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "u@x.com" } });
    const res = await POST(scrapeReq({ body: {} }));
    expect(res.status).toBe(200);
    expect(chainFindManyMock).toHaveBeenCalled();
  });

  it("runs for the cron caller and replaces each chain's auto deals", async () => {
    const res = await POST(scrapeReq({ cron: true, body: {} }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ scraped: 2, inserted: 4, deactivated: 3, errors: [] });
    expect(scanAndReplaceDealsMock).toHaveBeenCalledWith([
      { id: "c1", slug: "wendys" },
      { id: "c2", slug: "kfc" },
    ]);
  });

  it("scopes the scan to the requested chains", async () => {
    chainFindManyMock.mockResolvedValue([{ id: "c1", slug: "wendys" }]);
    await POST(scrapeReq({ cron: true, body: { chains: ["wendys"] } }));
    expect(chainFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { scrapingEnabled: true, slug: { in: ["wendys"] } } }),
    );
  });

  it("400s an invalid body", async () => {
    const res = await POST(scrapeReq({ cron: true, body: { chains: "wendys" } }));
    expect(res.status).toBe(400);
    expect(chainFindManyMock).not.toHaveBeenCalled();
  });

  it("surfaces partial errors from scanAndReplaceDeals without failing the request", async () => {
    scanAndReplaceDealsMock.mockResolvedValue({
      chainsScanned: 1,
      dealsInserted: 1,
      errors: ["wendys: timeout"],
    });
    const res = await POST(scrapeReq({ cron: true, body: {} }));
    const body = await res.json();
    expect(body.scraped).toBe(1); // only kfc
    expect(body.errors).toEqual(["wendys: timeout"]);
  });

  it("500s when the job throws", async () => {
    deactivateMock.mockRejectedValue(new Error("db down"));
    expect((await POST(scrapeReq({ cron: true, body: {} }))).status).toBe(500);
  });
});
