import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUniqueMock, updateMock, createMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: findUniqueMock, update: updateMock, create: createMock } },
}));

import { linkGoogleAccount } from "@/lib/auth-link";

beforeEach(() => {
  findUniqueMock.mockReset();
  updateMock.mockReset();
  createMock.mockReset();
});

describe("linkGoogleAccount", () => {
  it("refuses to link onto an existing user with an unverified email", async () => {
    findUniqueMock.mockResolvedValue({ id: "u1", email: "victim@example.com", emailVerified: null });

    const userId = await linkGoogleAccount({ email: "victim@example.com", name: "Victim", image: null });

    expect(userId).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("links cleanly onto an existing user with a verified email", async () => {
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: new Date("2026-01-01"),
    });
    updateMock.mockResolvedValue({ id: "u1" });

    const userId = await linkGoogleAccount({ email: "a@b.com", name: "A", image: "https://img" });

    expect(userId).toBe("u1");
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "A", image: "https://img" },
    });
  });

  it("creates a brand-new, pre-verified user when none exists yet", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "u2" });

    const userId = await linkGoogleAccount({ email: "new@b.com", name: "New", image: null });

    expect(userId).toBe("u2");
    expect(createMock).toHaveBeenCalledTimes(1);
    const data = createMock.mock.calls[0][0].data;
    expect(data.email).toBe("new@b.com");
    expect(data.emailVerified).toBeInstanceOf(Date);
  });
});
