# PointStash — Decisions (ADR log)

Append-only. Newest first.

## 2026-06-16 — Redemption-completion flow design

**Goal:** Let users mark that they have redeemed a `RedemptionOption` (e.g., "I just
used 500 Wendy's points on a Frosty"), deduct the `pointsCost` from the linked
account's `currentPoints`, and record the change in `PointsHistory`.

### Schema assessment
No new tables needed. The existing models cover everything:
- `Account.currentPoints` — the balance to deduct from.
- `RedemptionOption.pointsCost` — the cost to deduct.
- `PointsHistory.changeReason` already includes `"REDEMPTION"`.
- `Account` is scoped to a single user via `userId` — no cross-user risk.

### API route
**`POST /api/accounts/[id]/redeem`**
- Auth: `requireAuth`; the account's `userId` must match the session user.
- Body: `{ redemptionOptionId: string }` (the catalog item being redeemed).
- Validation (z.object): account existence + ownership (404 not 403), option
  belongs to the same chain (`option.chainId === account.chainId`), user has
  enough points (`account.currentPoints >= option.pointsCost`).
- Atomic DB transaction: deduct points (`Account.update`) + create `PointsHistory`
  row (`changeReason: "REDEMPTION"`, `previousPoints`, `newPoints`,
  `lastSynced = now()`).
- Response `200 { account, pointsHistory }` or appropriate error status.

### UI affordance
A secondary **"Mark as Redeemed"** button/link on `RedeemPage` (alongside the
existing "View deal" external-link CTA) and a compact icon-button on `DealCard`
for redemption options the user can currently afford. Opens a confirmation sheet
(name of item, points cost, resulting balance) before calling the API. On
success, SWR's `useAccounts` + `usePoints` keys are invalidated so the balance
updates live.

### Implementation tasks (to be inserted at top of queue in order):
1. `POST /api/accounts/[id]/redeem` route + unit tests.
2. Confirmation UI on `RedeemPage` / `DealCard` + SWR invalidation.
3. Playwright E2E for the full redeem flow (unblocks the existing blocked task).

### What this design does NOT do
- No new Prisma migration needed.
- No redemption record beyond PointsHistory (history row is the audit trail).
- The existing "Redeem CTA" deep-links to the chain app remain unchanged — this
  feature is additive and records what the user already did in the chain app.

---

## 2026-06-14 — Adopt agent + routine workflow
Added `docs/` (PROJECT/ARCHITECTURE/TASKS/DECISIONS/ROADMAP alongside the existing
API/DEPLOYMENT/SCRAPER guides) and role-based `agents/`. A daily cloud routine pulls the
top task from `docs/TASKS.md`, implements it on a `routine/<slug>` branch, runs checks,
and opens a PR. Routines never push to `main`, never merge, never touch `.env`/secrets.
**Why:** safe autonomous progress while the owner is away; reviewable PRs only.
