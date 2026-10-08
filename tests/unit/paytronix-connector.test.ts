import { describe, it, expect } from "vitest";
import { BaseConnector, NotImplementedError } from "@/lib/connectors/base";
import { PaytronixConnector } from "@/lib/connectors/paytronix";
import { PancherosConnector, pancherosConnector } from "@/lib/connectors/pancheros";

// Minimal concrete subclass for testing PaytronixConnector's abstract base directly
class TestPaytronixConnector extends PaytronixConnector {
  readonly chainSlug = "test-paytronix";
  readonly authLabel = "Test";
}

describe("PaytronixConnector", () => {
  it("PancherosConnector extends PaytronixConnector", () => {
    expect(pancherosConnector).toBeInstanceOf(PaytronixConnector);
  });

  it("PaytronixConnector extends BaseConnector", () => {
    expect(pancherosConnector).toBeInstanceOf(BaseConnector);
  });

  it("stores config on the instance", () => {
    const c = new TestPaytronixConnector({ baseUrl: "https://example.com", brandId: "testbrand" });
    expect(c.config.baseUrl).toBe("https://example.com");
    expect(c.config.brandId).toBe("testbrand");
  });

  it("throws when baseUrl is empty", () => {
    expect(() => new TestPaytronixConnector({ baseUrl: "", brandId: "brand" })).toThrow(
      "baseUrl is required",
    );
  });

  it("throws when brandId is empty", () => {
    expect(
      () => new TestPaytronixConnector({ baseUrl: "https://example.com", brandId: "" }),
    ).toThrow("brandId is required");
  });

  const token = { accessToken: "tok" };
  const credentials = { email: "u@example.com", password: "pass" };

  it("authenticate throws NotImplementedError with chainSlug", async () => {
    const c = new TestPaytronixConnector({ baseUrl: "https://example.com", brandId: "b" });
    await expect(c.authenticate(credentials)).rejects.toThrow(NotImplementedError);
    await expect(c.authenticate(credentials)).rejects.toThrow("test-paytronix");
  });

  it("getPointsBalance throws NotImplementedError", async () => {
    const c = new TestPaytronixConnector({ baseUrl: "https://example.com", brandId: "b" });
    await expect(c.getPointsBalance(token)).rejects.toThrow(NotImplementedError);
  });
});

describe("PancherosConnector", () => {
  it("chainSlug is 'pancheros'", () => {
    expect(pancherosConnector.chainSlug).toBe("pancheros");
  });

  it("implemented is false", () => {
    expect(pancherosConnector.implemented).toBe(false);
  });

  it("config.baseUrl points to the Pancheros Paytronix endpoint", () => {
    expect(pancherosConnector.config.baseUrl).toContain("pancheros.com");
  });

  it("config.brandId is 'pancheros'", () => {
    expect(pancherosConnector.config.brandId).toBe("pancheros");
  });

  it("authenticate throws NotImplementedError", async () => {
    await expect(
      pancherosConnector.authenticate({ email: "u@example.com", password: "pass" }),
    ).rejects.toThrow(NotImplementedError);
  });

  it("getPointsBalance throws NotImplementedError", async () => {
    await expect(pancherosConnector.getPointsBalance({ accessToken: "tok" })).rejects.toThrow(
      NotImplementedError,
    );
  });
});
