import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// db + the email sender are mocked; the detection logic (findNewlyAffordableAccounts)
// is left real since it's the behavior we want to confirm wires through correctly.
// The email mock is the safety net: this test never calls the real Resend-backed sender.
const {
  accountFindManyMock,
  redemptionFindManyMock,
  alertFindManyMock,
  alertCreateManyMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  accountFindManyMock: vi.fn(),
  redemptionFindManyMock: vi.fn(),
  alertFindManyMock: vi.fn(),
  alertCreateManyMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    account: { findMany: accountFindManyMock },
    redemptionOption: { findMany: redemptionFindManyMock },
    affordabilityAlert: { findMany: alertFindManyMock, createMany: alertCreateManyMock },
  },
}));
vi.mock("@/lib/affordable-alert-email", () => ({ sendAffordableRedemptionEmail: sendEmailMock }));
// @/lib/api (imported by the route) pulls in @/lib/auth → next-auth, which
// fails to resolve in this test env. Stub it; the route only uses isCronRequest.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET } from "@/app/api/cron/affordable-redemptions/route";

const CRON_SECRET = "test-cron-secret";

function cronReq(authorized = true) {
  const headers: Record<string, string> = {};
  if (authorized) headers.authorization = `Bearer ${CRON_SECRET}`;
  return new NextRequest("http://localhost/api/cron/affordable-redemptions", { headers });
}

// One opted-in user with a wendys account that can now afford the chain's
// only redemption option.
function seedAccountAndRedemption(currentPoints = 500) {
  accountFindManyMock.mockResolvedValue([
    {
      id: "acc_1",
      userId: "user_1",
      chainId: "wendys",
      currentPoints,
      chain: { slug: "wendys", name: "Wendy's" },
      user: { email: "u@example.com", name: "U" },
    },
  ]);
  redemptionFindManyMock.mockResolvedValue([
    {
      id: "redemption_1",
      chainId: "wendys",
      itemName: "Free Frosty",
      pointsCost: 500,
      estimatedRetailPrice: 1.99,
      centsPerPoint: 0.398,
      category: "DESSERT",
    },
  ]);
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET;
  accountFindManyMock.mockReset();
  redemptionFindManyMock.mockReset();
  alertFindManyMock.mockReset().mockResolvedValue([]);
  alertCreateManyMock.mockReset().mockResolvedValue({ count: 0 });
  sendEmailMock.mockReset().mockResolvedValue("logged");
});

describe("GET /api/cron/affordable-redemptions", () => {
  it("rejects a request without the cron secret", async () => {
    const res = await GET(cronReq(false));
    expect(res.status).toBe(401);
    expect(accountFindManyMock).not.toHaveBeenCalled();
  });

  it("emails an opted-in user about a newly-affordable redemption", async () => {
    seedAccountAndRedemption();

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, candidates: 1, logged: 1 });

    expect(sendEmailMock).toHaveBeenCalledOnce();
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.to).toBe("u@example.com");
    expect(arg.userId).toBe("user_1");
    expect(arg.items).toEqual([
      { chainSlug: "wendys", chainName: "Wendy's", itemName: "Free Frosty", pointsCost: 500 },
    ]);

    // Records the alert so it's never re-armed for this pair.
    expect(alertCreateManyMock).toHaveBeenCalledOnce();
    const recorded = alertCreateManyMock.mock.calls[0][0];
    expect(recorded.data).toEqual([
      { accountId: "acc_1", userId: "user_1", redemptionOptionId: "redemption_1" },
    ]);
    expect(recorded.skipDuplicates).toBe(true);
  });

  it("excludes an account that can't yet afford the chain's best redemption", async () => {
    seedAccountAndRedemption(100);

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    expect((await res.json()).candidates).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not repeat an already-alerted (account, redemptionOption) pair", async () => {
    seedAccountAndRedemption();
    alertFindManyMock.mockResolvedValue([{ accountId: "acc_1", redemptionOptionId: "redemption_1" }]);

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    expect((await res.json()).candidates).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("counts a real send separately from a dev-logged one", async () => {
    seedAccountAndRedemption();
    sendEmailMock.mockResolvedValue("sent");

    const body = await (await GET(cronReq())).json();
    expect(body).toMatchObject({ sent: 1, logged: 0 });
  });

  it("returns zero stats when there are no opted-in accounts", async () => {
    accountFindManyMock.mockResolvedValue([]);
    redemptionFindManyMock.mockResolvedValue([]);

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, candidates: 0, sent: 0, logged: 0, errors: [] });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("captures a per-user email error in errors[] without aborting the batch", async () => {
    accountFindManyMock.mockResolvedValue([
      {
        id: "acc_1",
        userId: "u1",
        chainId: "wendys",
        currentPoints: 500,
        chain: { slug: "wendys", name: "Wendy's" },
        user: { email: "u1@example.com", name: "U1" },
      },
      {
        id: "acc_2",
        userId: "u2",
        chainId: "wendys",
        currentPoints: 500,
        chain: { slug: "wendys", name: "Wendy's" },
        user: { email: "u2@example.com", name: "U2" },
      },
    ]);
    redemptionFindManyMock.mockResolvedValue([
      {
        id: "redemption_1",
        chainId: "wendys",
        itemName: "Free Frosty",
        pointsCost: 500,
        estimatedRetailPrice: 1.99,
        centsPerPoint: 0.398,
        category: "DESSERT",
      },
    ]);
    // u1 fails, u2 succeeds.
    sendEmailMock.mockRejectedValueOnce(new Error("SMTP timeout")).mockResolvedValueOnce("sent");

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("u1@example.com");
    expect(body.sent).toBe(1);
    // u2 was still emailed despite u1's failure.
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    // u1's pair was never recorded since the send failed.
    expect(alertCreateManyMock).toHaveBeenCalledOnce();
  });
});
