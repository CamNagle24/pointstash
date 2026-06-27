import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

describe("next.config headers()", () => {
  it("applies standard security headers to every route", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toBeDefined();

    const allHeaders = rules!.flatMap((rule) => rule.headers);
    const byKey = Object.fromEntries(allHeaders.map((h) => [h.key, h.value]));

    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toBeTruthy();
  });

  it("applies the headers to every route via a catch-all source", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toHaveLength(1);
    expect(rules![0].source).toBe("/:path*");
  });
});
