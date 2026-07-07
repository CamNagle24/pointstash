import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("response body has ok, version, and timestamp fields", async () => {
    const res = await GET();
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("timestamp");
  });

  it("timestamp is a valid ISO 8601 string", async () => {
    const res = await GET();
    const { timestamp } = await res.json();

    expect(typeof timestamp).toBe("string");
    expect(isNaN(Date.parse(timestamp))).toBe(false);
  });

  it("requires no authentication", async () => {
    // GET accepts no arguments — it is intentionally unguarded (no requireAuth call)
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
