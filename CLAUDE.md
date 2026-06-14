# PointStash — Agent & Routine Workflow

Fast-food rewards dashboard across 9 chains; ranks redemptions by cents-per-point. See
`docs/PROJECT.md` for orientation, plus `docs/API.md`, `docs/DEPLOYMENT.md`,
`docs/SCRAPER_GUIDE.md`.

## Docs & agents
- `docs/` — PROJECT, ARCHITECTURE, TASKS (the routine queue), DECISIONS, ROADMAP
  (alongside the existing API/DEPLOYMENT/SCRAPER guides).
- `agents/` — architect (design only), developer (implements top task), qa (tests/gates),
  security (auth/secrets veto).

## Routine workflow (daily cloud routine)
1. Read `docs/TASKS.md`; pick the **top unblocked** task (one per run).
2. Architect clarifies/decomposes if needed.
3. Developer branches `routine/<slug>` off `main`, makes the smallest change.
4. QA adds/runs tests (`npm run test:run`) + typecheck + lint.
5. Security reviews (auth/cron guards, secrets, per-user scoping).
6. Push branch; open PR `[routine] <task>` with summary + check output; tick the task.
7. If blocked: leave it, add `> blocked: <reason>`, move on.

## Guardrails (non-negotiable)
- Never push to/merge `main`. Never read/echo/edit/commit `.env*` (key presence only).
- Tests use MSW/fixtures — no live chain scraping in CI.
- Schema changes go through Prisma migrations; keep `prisma/seed.ts` idempotent.
