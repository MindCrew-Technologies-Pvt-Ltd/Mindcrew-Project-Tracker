# Timesheet Module — Technical Architecture, Estimation, Risks

## Architecture (v1, matches existing stack)
- **Backend:** new `timesheet` domain: `routes/timeEntries.routes.ts`, `routes/timer.routes.ts`, `routes/timesheets.routes.ts`, `routes/timeReports.routes.ts`, `routes/timesheetAdmin.routes.ts`; controllers per file; shared `utils/isoWeek.ts` + `utils/timesheetAccess.ts` guards; Joi schemas in `validations/schemas.ts` (contract-mirrored). Prisma models per `04-database-design.md` (additive → boot db push applies them).
- **Frontend:** one Redux slice (`timesheet`) holding week grid, timer, approvals queue, reports; service module; screens per `03-ui-spec.md`. Timer widget polls `GET /timer` piggybacking the existing 30s cadence; elapsed ticks locally between polls.
- **Aggregation:** reports run as Prisma `groupBy`/aggregate queries — no reporting engine needed at this scale. All heavy report endpoints paginate and cap ranges (≤ 1 year).
- **Notifications:** reuse `createNotification` + Nodemailer. Missing-timesheet reminder = extension of the cron scheduler, gated by `TimesheetSettings.reminderEnabled` AND the global `ENABLE_WEEKLY_REMINDERS` flag (currently off by user decision).

## Scaling path (documented for 1000+ employees, not built now)
1. Composite indexes `(status, submittedAt)` on TimesheetWeek; `(userId, date)` on TimeEntry.
2. Nightly rollup table (`user_day_minutes`) refreshed by cron → dashboards/reports read rollups; raw entries only for drill-down.
3. Redis: cache report responses (5-min TTL), move rate limiting + timer reads off Postgres.
4. Queue (BullMQ) for email fan-out and report exports; exports become async downloads.
5. Multi-tenant: introduce `orgId` on User/Project/TimeEntry + row-level scoping middleware; single-DB-shared-schema is the right first tenant model for this app.
6. Read replica for reporting once write volume matters.

## Effort estimate (single developer-equivalent)
| Chunk | Estimate |
|---|---|
| Schema + entries CRUD + guards | 1.5 d |
| Timer (API + widget) | 1 d |
| Weekly grid UI (autosave, copy week, validation) | 2 d |
| Submission + approvals (API + queue UI + drawer) | 2 d |
| Dashboards strip + reports + CSV export | 2 d |
| Settings (target/holidays/rates/reminders) | 1 d |
| Testing (3 rounds incl. browser E2E) + fixes | 1.5 d |
| **Total v1** | **~11 dev-days** (compressed heavily by generation; calendar time on staging: 1–2 sessions) |

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Locked-week race (entry edited while approval in flight) | Every entry write re-checks envelope status in the same transaction; 409 surfaces "week locked" in UI |
| Timezone drift (dates crossing midnight) | Entries store date-only (UTC midnight); ISO week computed server-side from the date the user picked, not server clock |
| Timer left running for days | Stop caps a single span at 12h with a warning; UI shows long-running badge after 8h |
| Approval scope confusion (multi-project weeks) | Any included project's owner may approve the whole week (documented in UI tooltip); admin override exists |
| Report queries degrading | Range caps + indexes now; rollup path documented above |
| Email spam | All reminder mail behind the existing global kill-switch, per-feature toggle default OFF |
| Contract drift (new payloads) | Every schema added to both Joi and Yup + VALIDATION_CONTRACT.md updated in the same commit |

## Future enhancements (post-v1 backlog)
Task-level tracking · MANAGER role & multi-level approval chains · PDF/Excel export & scheduled email reports · AI weekly summaries & anomaly detection (pending company AI decision) · idle detection via desktop agent · capacity planning board · payroll/overtime rules · per-project budgets vs actuals · calendar (month) view · mobile PWA optimizations.
