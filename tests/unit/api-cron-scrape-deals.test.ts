import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// db + the scan/deactivate side effects are mocked; the real isCronRequest
// guard (from @/lib/api) runs against the request header. @/lib/auth is
// stubbed because @/lib/api imports it transitively. Per-chain isolation
// (a failed scrape/replace not blocking other chains) is covered against
// the real scanAndReplaceDeals in tests/unit/deals.test.ts; here we only
// check that the route wires its result through correctly.
const { chainFindManyMock, scanAndReplaceDealsMock, deactivateMock } = vi.hoisted(() => ({
  chainFindManyMock: vi.fn(),
  scanAndReplaceDealsMock: vi.fn(),
  deactivateMock: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { chain: { findMany: chainFindManyMock } } }));
vi.mock("@/lib/deals", () => ({
  scanAndReplaceDeals: scanAndReplaceDealsMock,
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
  scanAndReplaceDealsMock.mockReset().mockResolvedValue({ chainsScanned: 2, dealsInserted: 4, errors: [] });
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
    expect(scanAndReplaceDealsMock).toHaveBeenCalledWith([
      { id: "c1", slug: "wendys" },
      { id: "c2", slug: "kfc" },
    ]);
  });

  it("surfaces partial errors from scanAndReplaceDeals without failing the request", async () => {
    scanAndReplaceDealsMock.mockResolvedValue({
      chainsScanned: 1,
      dealsInserted: 1,
      errors: ["wendys: timeout"],
    });
    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chainsScanned).toBe(1);
    expect(body.errors).toEqual(["wendys: timeout"]);
  });

  it("500s when the job throws", async () => {
    deactivateMock.mockRejectedValue(new Error("db down"));
    expect((await GET(cronReq())).status).toBe(500);
  });
});
