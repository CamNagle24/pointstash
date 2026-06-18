import { describe, it, expect, beforeEach, vi } from "vitest";

// isExtensionConfigured reads process.env.NEXT_PUBLIC_EXTENSION_ID at module
// load time, so each case needs a fresh module instance with the env var
// stubbed before import.
describe("isExtensionConfigured", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns false when NEXT_PUBLIC_EXTENSION_ID is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_EXTENSION_ID", "");
    const { isExtensionConfigured } = await import("@/lib/extension-bridge");
    expect(isExtensionConfigured()).toBe(false);
  });

  it("returns true when NEXT_PUBLIC_EXTENSION_ID is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_EXTENSION_ID", "abcdefghijklmnopabcdefghijklmnop");
    const { isExtensionConfigured } = await import("@/lib/extension-bridge");
    expect(isExtensionConfigured()).toBe(true);
  });
});
