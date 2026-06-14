# PointStash — Phone Prompts

Paste into Claude on claude.ai (web/phone) for this repo, or trigger the routine directly.

## Add / prioritize
- `Add to docs/TASKS.md as the TOP priority: <task + acceptance criteria>. Commit only that change to main, then stop.`
- `Re-prioritize docs/TASKS.md: move "<task>" to the top. Commit only that, then stop.`

## Run now
- `Run the routine workflow now: top unblocked task in docs/TASKS.md → routine/<slug> branch → typecheck/lint/test:run → open a [routine] PR. Never touch .env, never push main, use MSW/fixtures (no live scraping).`

## Review
- `Summarize all open [routine] PRs and what each changes. List any > blocked: tasks.`
- `For PR #<n>: review the diff (ranking/OCR/scrapers/auth guards/secrets) and tell me if it's safe to merge.`

## Unblock
- `Task "<title>" is blocked because <reason>. Answer: <...>. Remove the blocked note and run it.`
