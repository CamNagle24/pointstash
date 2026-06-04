import { describe, it, expect } from "vitest";
import { hostBelongsToChain } from "@/lib/chain-host";

describe("hostBelongsToChain", () => {
  describe("accepts legitimate chain hosts", () => {
    it("matches the exact chain domain", () => {
      expect(hostBelongsToChain("https://wendys.com/rewards", "wendys")).toBe(true);
      expect(hostBelongsToChain("https://mcdonalds.com/deals", "mcdonalds")).toBe(true);
    });

    it("matches sub-domains of the chain domain", () => {
      expect(hostBelongsToChain("https://order.wendys.com/loyalty/rewards", "wendys")).toBe(true);
      expect(hostBelongsToChain("https://www.mcdonalds.com/us/en-us/deals.html", "mcdonalds")).toBe(
        true,
      );
      expect(hostBelongsToChain("https://app.order.starbucks.com/menu", "starbucks")).toBe(true);
    });

    it("is case-insensitive on the host", () => {
      expect(hostBelongsToChain("https://ORDER.Wendys.COM/x", "wendys")).toBe(true);
    });

    it("allows plain http as well as https", () => {
      expect(hostBelongsToChain("http://wendys.com/rewards", "wendys")).toBe(true);
    });

    it("accepts both of dunkin's domains (dunkindonuts.com + dunkin.com)", () => {
      expect(hostBelongsToChain("https://www.dunkindonuts.com/en/rewards", "dunkin")).toBe(true);
      expect(hostBelongsToChain("https://www.dunkin.com/en/rewards", "dunkin")).toBe(true);
    });
  });

  describe("rejects spoofing and mismatch", () => {
    it("rejects a different chain's domain", () => {
      expect(hostBelongsToChain("https://mcdonalds.com/deals", "wendys")).toBe(false);
    });

    it("rejects an attacker domain that suffixes the chain name without a dot boundary", () => {
      expect(hostBelongsToChain("https://evilwendys.com/phish", "wendys")).toBe(false);
    });

    it("rejects the chain domain used as a prefix of an attacker domain", () => {
      expect(hostBelongsToChain("https://wendys.com.evil.com/phish", "wendys")).toBe(false);
    });

    it("rejects userinfo tricks that resolve to a foreign host", () => {
      expect(hostBelongsToChain("https://wendys.com@evil.com/phish", "wendys")).toBe(false);
    });

    it("rejects an unrelated host entirely", () => {
      expect(hostBelongsToChain("https://evil.com/phish", "wendys")).toBe(false);
    });
  });

  describe("rejects malformed or unsafe URLs", () => {
    it("rejects a non-URL string", () => {
      expect(hostBelongsToChain("not a url", "wendys")).toBe(false);
      expect(hostBelongsToChain("", "wendys")).toBe(false);
    });

    it("rejects non-http(s) protocols even when the host matches", () => {
      expect(hostBelongsToChain("ftp://wendys.com/x", "wendys")).toBe(false);
      expect(hostBelongsToChain("javascript:alert(1)//wendys.com", "wendys")).toBe(false);
      expect(hostBelongsToChain("file:///wendys.com", "wendys")).toBe(false);
    });

    it("rejects an unknown chain slug", () => {
      expect(hostBelongsToChain("https://wendys.com/x", "not-a-chain")).toBe(false);
    });
  });
});
