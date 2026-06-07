import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signUnsubscribeToken } from "@/lib/unsubscribe-token";

// The route uses the real token lib (pure) and only the db is mocked.
const { updateManyMock } = vi.hoisted(() => ({ updateManyMock: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { updateMany: updateManyMock } } }));

import { GET } from "@/app/api/unsubscribe/route";

const SECRET = "test-secret";

function req(token?: string) {
  const q = token === undefined ? "" : `?token=${encodeURIComponent(token)}`;
  return new NextRequest(`http://localhost/api/unsubscribe${q}`);
}

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
  updateManyMock.mockReset().mockResolvedValue({ count: 1 });
});

describe("GET /api/unsubscribe", () => {
  it("turns off notifyExpiring for the token's user and confirms", async () => {
    const token = signUnsubscribeToken("user_1", SECRET);
    const res = await GET(req(token));
    expect(res.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { notifyExpiring: false },
    });
    const html = await res.text();
    expect(html).toContain("unsubscribed");
  });

  it("400s a missing token without touching the db", async () => {
    const res = await GET(req());
    expect(res.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("400s a token signed with a different secret", async () => {
    const forged = signUnsubscribeToken("user_1", "other-secret");
    const res = await GET(req(forged));
    expect(res.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("500s (gracefully) when the db write fails", async () => {
    updateManyMock.mockRejectedValue(new Error("db down"));
    const token = signUnsubscribeToken("user_1", SECRET);
    const res = await GET(req(token));
    expect(res.status).toBe(500);
  });
});
