# API Reference

All endpoints live under `/api`. Auth is handled by NextAuth — protected routes return `401` when no session is present.

## Auth

- `GET|POST /api/auth/[...nextauth]` — NextAuth handler (sign-in, callbacks, session)
- `POST /api/auth/signup` — public; `{email, password, name?}`; creates an account, `409` on duplicate email
- `POST /api/auth/forgot-password` — public; `{email}`; always `200` (anti-enumeration); rate-limited to 3 tokens/user/hour; emails a reset link
- `POST /api/auth/reset-password` — public; `{token, password}`; consumes a one-time reset token and sets the new password

## Accounts

- `GET /api/accounts` — list the current user's linked rewards accounts
- `POST /api/accounts` — link a new rewards account
- `GET /api/accounts/:id` — fetch a single account
- `PUT /api/accounts/:id` — update an account
- `DELETE /api/accounts/:id` — unlink an account
- `POST /api/accounts/:id/redeem` — `{redemptionOptionId}`; deducts points and logs a `REDEMPTION` points-history entry; `400` if the option doesn't belong to the account's chain or points are insufficient

## Points

- `GET /api/points` — totals across all chains
- `POST /api/points/update` — record a manual balance update
- `GET /api/points/history` — points-change history

## Deals

- `GET /api/deals?chain=<id>` — current deals, optionally filtered
- `POST /api/deals/scrape` — `isCronRequest` or signed-in session; optional `{chains?: string[]}`; deactivates expired deals and re-scrapes the given (or all) chains

## Admin

- `GET /api/admin/deals` — admin-only; list all deals including inactive, optional `?source=` filter
- `POST /api/admin/deals` — admin-only; create a curated, verified, active deal
- `PATCH /api/admin/deals/:id` — admin-only; partial update, can toggle `isVerified`/`isActive`
- `DELETE /api/admin/deals/:id` — admin-only; hard delete, or soft-expire with `?expire=1`

## Extension

- `POST /api/extension/pair` — signed-in dashboard session; mints a bearer token for the browser extension, revoking any prior un-revoked token
- `POST /api/extension/sync` — bearer token; `{chainSlug, balance, raw?}`; upserts the account and logs a `SYNC` points-history entry
- `POST /api/extension/sync-offers` — bearer token; `{chainSlug, pageText, pageUrl}`; validates the URL belongs to the chain, extracts deals via LLM, and replaces the user's extension-sourced deals for that chain
- `GET /api/extension/whoami` — bearer token; returns `{userId, email, name}`

## Redemptions

- `GET /api/redemptions?chain=<id>` — best redemption options ranked by ¢/pt

## Upload

- `POST /api/upload` — multipart form, field `file` — upload a screenshot for OCR balance extraction

## User

- `GET /api/user/me` — signed-in session; profile including notification preferences
- `PATCH /api/user/me` — signed-in session; update `name`/`notifyExpiring`/`notifyDeals`/`notifyDigest`
- `DELETE /api/user/me` — signed-in session; cascade-deletes the user and all owned data

## Unsubscribe

- `GET /api/unsubscribe?token=...` — public, stateless HMAC token (no session); turns off `notifyExpiring` and returns an HTML confirmation page

## Cron

- `GET /api/cron/scrape-deals` — Vercel Cron entrypoint (requires `Authorization: Bearer $CRON_SECRET`)
- `GET /api/cron/deal-reminders` — Vercel Cron entrypoint; emails users about deals expiring soon
