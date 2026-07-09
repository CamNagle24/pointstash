import { describe, it, expect } from "vitest";
import { PaytronixConnector, type PaytronixConfig } from "@/lib/connectors/paytronix";
import { PancherosConnector } from "@/lib/connectors/pancheros";
import { NotImplementedError } from "@/lib/connectors/base";

// Concrete test subclass so we can instantiate the abstract base
class TestPaytronixConnector extends PaytronixConnector {
  readonly chainSlug = "test-chain";
  readonly authLabel = "Email + password";
}

const validConfig: PaytronixConfig = {
  baseUrl: "https://example.com/api/paytronix",
  brandId: "test-brand",
};

describe("PaytronixConnector — construction", () => {
  it("constructs successfully with valid config", () => {
    const c = new TestPaytronixConnector(validConfig);
    expect(c.chainSlug).toBe("test-chain");
  });

  it("throws when baseUrl is missing", () => {
    expect(() => new TestPaytronixConnector({ baseUrl: "", brandId: "x" })).toThrow(
      "PaytronixConnector requires a non-empty baseUrl",
    );
  });

  it("throws when brandId is missing", () => {
    expect(
      () => new TestPaytronixConnector({ baseUrl: "https://example.com", brandId: "" }),
    ).toThrow("PaytronixConnector requires a non-empty brandId");
  });
});

describe("PaytronixConnector — URL helpers", () => {
  const c = new TestPaytronixConnector(validConfig);

  it("loginUrl appends /login to the baseUrl", () => {
    expect(c.loginUrl).toBe("https://example.com/api/paytronix/login");
  });

  it("balanceUrl appends /balance to the baseUrl", () => {
    expect(c.balanceUrl).toBe("https://example.com/api/paytronix/balance");
  });

  it("loginUrl and balanceUrl reflect the baseUrl from config", () => {
    const other = new TestPaytronixConnector({
      baseUrl: "https://other.brand.com/loyalty",
      brandId: "other",
    });
    expect(other.loginUrl).toBe("https://other.brand.com/loyalty/login");
    expect(other.balanceUrl).toBe("https://other.brand.com/loyalty/balance");
  });
});

describe("PaytronixConnector — method stubs", () => {
  const c = new TestPaytronixConnector(validConfig);
  const token = { accessToken: "tok" };
  const credentials = { email: "u@example.com", password: "pass" };

  it("authenticate throws NotImplementedError", async () => {
    await expect(c.authenticate(credentials)).rejects.toThrow(NotImplementedError);
    await expect(c.authenticate(credentials)).rejects.toThrow("test-chain");
  });

  it("getPointsBalance throws NotImplementedError", async () => {
    await expect(c.getPointsBalance(token)).rejects.toThrow(NotImplementedError);
  });
});

describe("PancherosConnector", () => {
  const c = new PancherosConnector();

  it("implemented stays false", () => {
    expect(c.implemented).toBe(false);
  });

  it("chainSlug is pancheros", () => {
    expect(c.chainSlug).toBe("pancheros");
  });

  it("loginUrl uses the Pancheros Paytronix base URL", () => {
    expect(c.loginUrl).toBe("https://www.pancheros.com/api/paytronix/login");
  });

  it("balanceUrl uses the Pancheros Paytronix base URL", () => {
    expect(c.balanceUrl).toBe("https://www.pancheros.com/api/paytronix/balance");
  });

  it("authenticate still throws NotImplementedError", async () => {
    await expect(c.authenticate({ email: "u@e.com", password: "p" })).rejects.toThrow(
      NotImplementedError,
    );
  });
});
