import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// db + the email sender are mocked; the grouping/idempotency logic
// (groupExpiringDealsByUser, removeAlreadyReminded) is left real since it's the
// behavior we want to confirm wires through correctly. The email mock is the
// safety net: this test never calls the real Resend-backed sender.
const {
  userFindManyMock,
  dealFindManyMock,
  reminderFindManyMock,
  reminderDeleteManyMock,
  reminderCreateManyMock,
  transactionMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  userFindManyMock: vi.fn(),
  dealFindManyMock: vi.fn(),
  reminderFindManyMock: vi.fn(),
  reminderDeleteManyMock: vi.fn(),
  reminderCreateManyMock: vi.fn(),
  transactionMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: userFindManyMock },
    deal: { findMany: dealFindManyMock },
    dealReminder: {
      findMany: reminderFindManyMock,
      deleteMany: reminderDeleteManyMock,
      createMany: reminderCreateManyMock,
    },
    $transaction: transactionMock,
  },
}));
vi.mock("@/lib/deal-reminder-email", () => ({ sendExpiringDealsEmail: sendEmailMock }));
// @/lib/api (imported by the route) pulls in @/lib/auth → next-auth, which
// fails to resolve in this test env. Stub it; the route only uses isCronRequest.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET } from "@/app/api/cron/deal-reminders/route";

const CRON_SECRET = "test-cron-secret";

function cronReq(authorized = true) {
  const headers: Record<string, string> = {};
  if (authorized) headers.authorization = `Bearer ${CRON_SECRET}`;
  return new NextRequest("http://localhost/api/cron/deal-reminders", { headers });
}

// One opted-in user linked to wendys, and a wendys global deal expiring in ~2h.
function seedUserAndDeal() {
  userFindManyMock.mockResolvedValue([
    {
      id: "user_1",
      email: "u@example.com",
      name: "U",
      accounts: [{ chain: { slug: "wendys" } }],
    },
  ]);
  dealFindManyMock.mockResolvedValue([
    {
      id: "deal_1",
      userId: null,
      title: "Free Fries",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      redeemUrl: null,
      anchorText: null,
      sourceUrl: null,
      chain: { slug: "wendys", name: "Wendy's" },
    },
  ]);
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  userFindManyMock.mockReset();
  dealFindManyMock.mockReset();
  reminderFindManyMock.mockReset().mockResolvedValue([]);
  reminderDeleteManyMock.mockReset().mockReturnValue({ __op: "del" });
  reminderCreateManyMock.mockReset().mockReturnValue({ __op: "ins" });
  transactionMock.mockReset().mockResolvedValue([]);
  sendEmailMock.mockReset().mockResolvedValue("logged");
});

describe("GET /api/cron/deal-reminders", () => {
  it("rejects a request without the cron secret", async () => {
    const res = await GET(cronReq(false));
    expect(res.status).toBe(401);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("emails an opted-in user about their soon-expiring deal", async () => {
    seedUserAndDeal();

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, candidates: 1, logged: 1 });

    expect(sendEmailMock).toHaveBeenCalledOnce();
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.to).toBe("u@example.com");
    expect(arg.userId).toBe("user_1");
    expect(arg.deals.map((d: { id: string }) => d.id)).toEqual(["deal_1"]);

    // Records the reminder so the next run dedupes it.
    expect(reminderCreateManyMock).toHaveBeenCalledOnce();
    const recorded = reminderCreateManyMock.mock.calls[0][0].data;
    expect(recorded).toEqual([{ userId: "user_1", dealKey: "wendys:free fries", sentAt: expect.any(Date) }]);
  });

  it("skips a deal already reminded within the dedupe window (idempotency)", async () => {
    seedUserAndDeal();
    reminderFindManyMock.mockResolvedValue([{ userId: "user_1", dealKey: "wendys:free fries" }]);

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    expect((await res.json()).candidates).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("counts a real send separately from a dev-logged one", async () => {
    seedUserAndDeal();
    sendEmailMock.mockResolvedValue("sent");

    const body = await (await GET(cronReq())).json();
    expect(body).toMatchObject({ sent: 1, logged: 0 });
  });
});
