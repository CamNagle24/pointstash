import { describe, it, expect } from "vitest";
import { PaytronixConnector, type PaytronixConfig } from "@/lib/connectors/paytronix";
import { PancherosConnector } from "@/lib/connectors/pancheros";
import { NotImplementedError } from "@/lib/connectors";

// Concrete subclass used to instantiate the abstract base in tests
class TestPaytronixConnector extends PaytronixConnector {
  readonly chainSlug = "test-paytronix";
  readonly authLabel = "Test";
}

const validConfig: PaytronixConfig = { baseUrl: "https://loyalty.example.com", brandId: "testbrand" };
const token = { accessToken: "tok" };
const credentials = { email: "u@example.com", password: "pass" };

describe("PaytronixConnector", () => {
  it("constructs with valid config", () => {
    expect(() => new TestPaytronixConnector(validConfig)).not.toThrow();
  });

  it("throws when baseUrl is empty", () => {
    expect(() => new TestPaytronixConnector({ baseUrl: "", brandId: "brand" })).toThrow("baseUrl");
  });

  it("throws when brandId is empty", () => {
    expect(() => new TestPaytronixConnector({ baseUrl: "https://example.com", brandId: "" })).toThrow("brandId");
  });

  it("exposes baseUrl and brandId on config", () => {
    const c = new TestPaytronixConnector(validConfig);
    expect(c.config.baseUrl).toBe("https://loyalty.example.com");
    expect(c.config.brandId).toBe("testbrand");
  });

  it("authenticate throws NotImplementedError referencing chainSlug", async () => {
    const c = new TestPaytronixConnector(validConfig);
    await expect(c.authenticate(credentials)).rejects.toThrow(NotImplementedError);
    await expect(c.authenticate(credentials)).rejects.toThrow("test-paytronix");
  });

  it("getPointsBalance throws NotImplementedError", async () => {
    const c = new TestPaytronixConnector(validConfig);
    await expect(c.getPointsBalance(token)).rejects.toThrow(NotImplementedError);
  });
});

describe("PancherosConnector", () => {
  it("implemented is false", () => {
    expect(new PancherosConnector().implemented).toBe(false);
  });

  it("chainSlug is pancheros", () => {
    expect(new PancherosConnector().chainSlug).toBe("pancheros");
  });

  it("config.baseUrl points to the Pancheros Paytronix endpoint", () => {
    expect(new PancherosConnector().config.baseUrl).toContain("pancheros.com");
  });

  it("config.brandId is pancheros", () => {
    expect(new PancherosConnector().config.brandId).toBe("pancheros");
  });
});
