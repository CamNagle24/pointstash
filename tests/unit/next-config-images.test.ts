import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config images.remotePatterns", () => {
  const patterns = nextConfig.images?.remotePatterns ?? [];

  it("does not allow a wildcard remote image hostname", () => {
    for (const pattern of patterns) {
      expect(pattern.hostname).not.toBe("**");
    }
  });

  it("only allows the Google OAuth profile-photo host", () => {
    expect(patterns).toEqual([
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ]);
  });
});
