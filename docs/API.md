# API Reference

All endpoints live under `/api`. Auth is handled by NextAuth — protected routes return `401` when no session is present.

## Auth

- `GET|POST /api/auth/[...nextauth]` — NextAuth handler (sign-in, callbacks, session)

## Accounts

- `GET /api/accounts` — list the current user's linked rewards accounts
- `POST /api/accounts` — link a new rewards account
- `GET /api/accounts/:id` — fetch a single account
- `PUT /api/accounts/:id` — update an account
- `DELETE /api/accounts/:id` — unlink an account

## Points

- `GET /api/points` — totals across all chains
- `POST /api/points/update` — record a manual balance update
- `GET /api/points/history` — points-change history

## Deals

- `GET /api/deals?chain=<id>` — current deals, optionally filtered
- `POST /api/deals/scrape` — trigger a manual scrape (`{ chain: ChainId }`)

## Redemptions

- `GET /api/redemptions?chain=<id>` — best redemption options ranked by ¢/pt

## Upload

- `POST /api/upload` — multipart form, field `file` — upload a screenshot for OCR balance extraction

## Cron

- `GET /api/cron/scrape-deals` — Vercel Cron entrypoint (requires `Authorization: Bearer $CRON_SECRET`)
