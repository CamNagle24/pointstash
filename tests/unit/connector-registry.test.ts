import { describe, it, expect } from "vitest";
import {
  connectors,
  getConnector,
  hasImplementedConnector,
  NotImplementedError,
} from "@/lib/connectors";
import { CHAINS } from "@/lib/constants";

// Drive expected slugs from CHAINS itself so this test catches any future
// chain that's added to the catalog without a matching connector entry.
const KNOWN_SLUGS = Object.keys(CHAINS) as (keyof typeof CHAINS)[];

describe("getConnector", () => {
  it.each(KNOWN_SLUGS)("returns the connector for '%s'", (slug) => {
    const connector = getConnector(slug);
    expect(connector).toBeDefined();
    expect(connector?.chainSlug).toBe(slug);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getConnector("unknown-chain")).toBeUndefined();
    expect(getConnector("")).toBeUndefined();
  });

  it("connector registry contains exactly the expected slugs", () => {
    expect(Object.keys(connectors).sort()).toEqual([...KNOWN_SLUGS].sort());
  });
});

describe("hasImplementedConnector", () => {
  it.each(KNOWN_SLUGS)("returns false for unimplemented connector '%s'", (slug) => {
    expect(hasImplementedConnector(slug)).toBe(false);
  });

  it("returns false for an unknown slug", () => {
    expect(hasImplementedConnector("unknown-chain")).toBe(false);
  });
});

describe("unimplemented connector methods", () => {
  const token = {
    accessToken: "tok",
    refreshToken: "ref",
    expiresAt: new Date(),
  };
  const credentials = { email: "u@example.com", password: "pass" };

  it.each(KNOWN_SLUGS)(
    "authenticate rejects with NotImplementedError for '%s'",
    async (slug) => {
      const connector = getConnector(slug)!;
      await expect(connector.authenticate(credentials)).rejects.toThrow(NotImplementedError);
      await expect(connector.authenticate(credentials)).rejects.toThrow(slug);
    },
  );

  it.each(KNOWN_SLUGS)(
    "getPointsBalance rejects with NotImplementedError for '%s'",
    async (slug) => {
      const connector = getConnector(slug)!;
      await expect(connector.getPointsBalance(token)).rejects.toThrow(NotImplementedError);
    },
  );

  it.each(KNOWN_SLUGS)(
    "getRecentTransactions rejects with NotImplementedError for '%s'",
    async (slug) => {
      const connector = getConnector(slug)!;
      await expect(connector.getRecentTransactions(token)).rejects.toThrow(NotImplementedError);
    },
  );

  it.each(KNOWN_SLUGS)(
    "refreshToken rejects with NotImplementedError for '%s'",
    async (slug) => {
      const connector = getConnector(slug)!;
      await expect(connector.refreshToken(token)).rejects.toThrow(NotImplementedError);
    },
  );
});
