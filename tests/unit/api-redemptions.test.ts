import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));
// @/lib/api → @/lib/auth → next-auth can't resolve next/server here; stub it.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { redemptionOption: { findMany: findManyMock } } }));

import { GET } from "@/app/api/redemptions/route";

const req = (query = "") => new NextRequest(`http://localhost/api/redemptions${query}`);

beforeEach(() => {
  findManyMock.mockReset().mockResolvedValue([]);
});

describe("GET /api/redemptions", () => {
  it("400s an invalid sort", async () => {
    expect((await GET(req("?sort=bogus"))).status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("400s an invalid category", async () => {
    expect((await GET(req("?category=SNACK"))).status).toBe(400);
  });

  it("filters by chain + category and only available options", async () => {
    await GET(req("?chain=wendys&category=DRINK"));
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isAvailable: true, chain: { slug: "wendys" }, category: "DRINK" },
      }),
    );
  });

  it("converts the dollar retail price to integer cents for the client", async () => {
    findManyMock.mockResolvedValue([
      { id: "r1", itemName: "Frosty", estimatedRetailPrice: 5.5, chain: {} },
    ]);
    const res = await GET(req());
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.redemptions[0].retailPriceCents).toBe(550);
    expect(body.redemptions[0]).not.toHaveProperty("estimatedRetailPrice");
  });
});
