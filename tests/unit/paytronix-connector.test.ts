import { describe, it, expect } from "vitest";
import { BaseConnector, NotImplementedError } from "@/lib/connectors/base";
import { PaytronixConnector } from "@/lib/connectors/paytronix";
import { PancherosConnector, pancherosConnector } from "@/lib/connectors/pancheros";

describe("PaytronixConnector", () => {
  it("PancherosConnector extends PaytronixConnector", () => {
    expect(pancherosConnector).toBeInstanceOf(PaytronixConnector);
  });

  it("PaytronixConnector extends BaseConnector", () => {
    expect(pancherosConnector).toBeInstanceOf(BaseConnector);
  });

  it("stores config passed to constructor", () => {
    const c = new PancherosConnector({ baseUrl: "https://example.com", brandId: "test" });
    expect((c as unknown as { config: { baseUrl: string; brandId: string } }).config).toEqual({
      baseUrl: "https://example.com",
      brandId: "test",
    });
  });

  it("chainSlug is 'pancheros'", () => {
    expect(pancherosConnector.chainSlug).toBe("pancheros");
  });

  it("implemented is false", () => {
    expect(pancherosConnector.implemented).toBe(false);
  });

  const token = { accessToken: "tok" };
  const credentials = { email: "u@example.com", password: "pass" };

  it("authenticate throws NotImplementedError", async () => {
    await expect(pancherosConnector.authenticate(credentials)).rejects.toThrow(NotImplementedError);
  });

  it("getPointsBalance throws NotImplementedError", async () => {
    await expect(pancherosConnector.getPointsBalance(token)).rejects.toThrow(NotImplementedError);
  });

  it("getRecentTransactions throws NotImplementedError", async () => {
    await expect(pancherosConnector.getRecentTransactions(token)).rejects.toThrow(NotImplementedError);
  });

  it("refreshToken throws NotImplementedError", async () => {
    await expect(pancherosConnector.refreshToken(token)).rejects.toThrow(NotImplementedError);
  });
});
