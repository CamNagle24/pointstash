# PointStash — Decisions (ADR log)

Append-only. Newest first.

## 2026-06-14 — Adopt agent + routine workflow
Added `docs/` (PROJECT/ARCHITECTURE/TASKS/DECISIONS/ROADMAP alongside the existing
API/DEPLOYMENT/SCRAPER guides) and role-based `agents/`. A daily cloud routine pulls the
top task from `docs/TASKS.md`, implements it on a `routine/<slug>` branch, runs checks,
and opens a PR. Routines never push to `main`, never merge, never touch `.env`/secrets.
**Why:** safe autonomous progress while the owner is away; reviewable PRs only.
