# AI Integration (MCP) + Daily-Lock Model

## What it is
Every employee can connect their AI tool (Claude Code/Desktop, Cursor, Windsurf, Google Antigravity, Gemini CLI — anything MCP-capable) to the Project Tracker. The agent logs the day's work per project (time estimate + bullet summary) straight into the timesheet, marked with an **AI** badge, flowing through the normal weekly approval.

## Architecture
```
AI tool ── MCP (streamable HTTP, stateless) ──► POST /mcp
                 Authorization: Bearer ptk_<personal token>
Tools: list_projects · log_work(project, hours, minutes, summary, billable?) · get_my_week
Same functions exposed as REST for scripts: /api/integrations/{projects, work-log, my-week}
```
- **Tokens** (`ApiToken`): `ptk_` + 40 hex; sha256 hash stored, shown once; per-user limit 10; revocable; `lastUsedAt` visible in UI; managed only via JWT session (`/api/api-tokens`) so a leaked token can't mint tokens. 60 req/min rate limit per token.
- **MCP server**: `@modelcontextprotocol/sdk`, stateless `StreamableHTTPServerTransport` per request (`backend/src/mcp/mcpServer.ts`) — no sessions, horizontally safe.
- Agent entries: `TimeEntry.source = 'AI_AGENT'`, always dated **today** (no backfill parameter exists).

## Daily-lock model (client requirement)
- Time is logged **the same day only**; each day locks at **11:59 PM org time** (`TimesheetSettings.timezone`, default Asia/Kolkata).
- Enforced server-side by `assertDateEditable` (utils/timesheetAccess.ts) on entry create/edit/delete and AI logging. Exceptions: admins, and days inside a **REJECTED** week (fix window until resubmission).
- **Copy last week removed** (meaningless under same-day logging).
- **Auto-submit**: Monday 00:10 org time, the finished week is auto-submitted for everyone with entries (cron `autoSubmit.ts`); rejected weeks are never auto-resubmitted. Manual Submit still works for early submission.
- Grid UI: only today's column editable (others dimmed with a lock tooltip), date fixed in the Add Entry dialog, "Same-day entry" hint chip.

## User setup (Integrations page, `/integrations`)
1. Generate token → copy once.
2. Pick the tab for your tool → copy the prefilled snippet (Claude Code command / mcpServers JSON) — the fresh token is auto-inserted.
3. Optional: paste the **auto-log rule** into CLAUDE.md/.cursorrules so the agent logs at the end of each session unprompted.

## Security properties
- Token grants exactly: read project names, write own same-day time entries, read own current week. No approvals, no other users' data, no admin surface.
- Validation: Joi `workLogSchema` (no Yup mirror — agent/script surface, no browser form; exception noted in VALIDATION_CONTRACT.md).
- All entry guards reused: daily lock, week lock (submitted/approved), 24h/day cap.
