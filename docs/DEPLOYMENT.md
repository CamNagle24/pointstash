# Deployment

This is the full path from a fresh clone to a live, scraping, cron-running deployment on Vercel + Supabase. Everything below uses free tiers.

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a project. Pick a region close to your Vercel region (US East works for `iad1`).
2. Set a strong DB password — you'll need it in Step 2. If your password contains `#`, `@`, `:`, `/`, or `?`, **URL-encode** them in the connection strings (`#` → `%23`, etc.).

## Step 2 — Copy connection strings into `.env.local`

In Supabase: **Project Settings → Database → Connection string**.

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<ref>:<pwd>@aws-1-<region>.pooler.supabase.com:5432/postgres
```

- `DATABASE_URL` is the **transaction pooler** (port `6543`, `pgbouncer=true`) — used at runtime.
- `DIRECT_URL` is the **session pooler** (port `5432`) — used by Prisma migrations. Don't use `db.<ref>.supabase.co` directly — Supabase free tier exposes it as IPv6 only and most CI/runtime environments are IPv4.

## Step 3 — Apply the schema

```bash
npm install
npx prisma migrate deploy   # production migrations
# OR for local first-time: npx prisma db push
```

If `prisma migrate deploy` complains about there being no migrations yet, run `npx prisma migrate dev --name init` once locally to generate the initial migration.

## Step 4 — Seed reference data

```bash
npm run db:seed
```

This populates the 9 chains and 50+ redemption options. Idempotent — safe to re-run.

## Step 5 — Create a Vercel project

1. Push the repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo. Framework auto-detects Next.js.
3. **Don't deploy yet** — add env vars first (next step).

## Step 6 — Add env vars to Vercel

In **Project → Settings → Environment Variables**, add every key from `.env.example`:

| Variable                  | Value                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`            | Pooled Supabase URL (from Step 2)                                      |
| `DIRECT_URL`              | Direct/session Supabase URL                                            |
| `NEXTAUTH_SECRET`         | `openssl rand -base64 32`                                              |
| `NEXTAUTH_URL`            | `https://<your-vercel-domain>`                                         |
| `GOOGLE_CLIENT_ID`        | From Google Cloud Console (see below)                                  |
| `GOOGLE_CLIENT_SECRET`    | Same source                                                            |
| `BLOB_READ_WRITE_TOKEN`   | **Vercel → Storage → Create Blob store** → copy the read-write token   |
| `CRON_SECRET`             | `openssl rand -base64 32`                                              |

**Google OAuth:** `console.cloud.google.com` → APIs & Services → Credentials → Create OAuth 2.0 Client ID. Add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI (also `http://localhost:3000/api/auth/callback/google` for local dev).

## Step 7 — Deploy

Click **Deploy**. The first build runs `prisma generate` automatically via `postinstall`. Subsequent deploys reuse the schema; if you change `prisma/schema.prisma`, run `npx prisma migrate deploy` from your machine (or a CI step) before deploying — Vercel's build environment can't reach a non-pooled DB host on the free tier.

Verify:

- Landing page renders at the new URL.
- `/dashboard` shows the seeded mock UI (no auth wired through yet — that's Phase 2).
- `GET /api/deals` returns `{ "deals": [...] }` with a 200.

## Step 8 — Verify the cron job

`vercel.json` schedules `/api/cron/scrape-deals` daily at 11:00 UTC (= 6:00 CT). Vercel automatically signs cron requests with `Authorization: Bearer $CRON_SECRET`, which the route validates via `isCronRequest`.

Trigger it manually to confirm the wiring:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-domain>/api/cron/scrape-deals
```

Expected response:

```json
{
  "ok": true,
  "chainsScanned": 9,
  "dealsInserted": 27,
  "dealsDeactivated": 0,
  "errors": []
}
```

In **Vercel → Cron Jobs**, you'll see the next scheduled run and a log of past invocations after the first 11:00 UTC tick.

---

## Local development without a database

If you don't want to provision Supabase, set:

```
NEXT_PUBLIC_ENABLE_MSW=1
```

`npm run dev` will boot Mock Service Worker against the seeded fixtures in `tests/mocks/fixtures/`. Every API endpoint returns realistic data, so the UI is fully exerciseable. See `tests/mocks/handlers.ts` for the full surface.

## Local development with Postgres in Docker

```bash
docker compose up -d db
DATABASE_URL=postgresql://pointstash:pointstash@localhost:5432/pointstash \
DIRECT_URL=postgresql://pointstash:pointstash@localhost:5432/pointstash \
  npm run db:push && npm run db:seed
npm run dev
```

See `docker-compose.yml` for service details. To run the whole app in containers: `docker compose up`.

## Pre-commit hook

`npm install` wires up a Husky pre-commit hook (`.husky/pre-commit`) that runs on every
commit:

1. `lint-staged` runs `eslint --fix` on staged `.js`/`.jsx`/`.ts`/`.tsx` files only.
2. `npm run typecheck` runs the full project typecheck (`tsc` has no per-file mode that
   respects the project's type graph, so this checks everything, not just staged files).

A commit aborts if either step fails. To skip in an emergency: `git commit --no-verify`.

## Troubleshooting

- **Prisma `P1001 Can't reach database server`** → using the direct host on Supabase free tier. Switch `DIRECT_URL` to the session pooler (port `5432`, `aws-1-<region>.pooler.supabase.com`).
- **`Authentication failed against database server`** → password contains `#` (or other URL-special chars). URL-encode it.
- **Cron returns `401 Unauthorized`** → `CRON_SECRET` not set in Vercel project env, or the bearer header didn't match. Check `Vercel → Logs → /api/cron/scrape-deals` for the request that failed.
- **`Module not found: @auth/prisma-adapter`** → not used; remove any leftover import. We use JWT-only sessions and a manual `signIn` callback.
- **Build fails on `prisma generate`** → `prisma` is in `devDependencies`; ensure `npm install` (not `npm install --production`) runs in the Vercel build.
