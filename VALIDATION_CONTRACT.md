# Frontend ⇄ Backend Validation Contract

The frontend and backend validate the **same rules** for every request body.
When you change a rule on one side, you **must** change it on the other.

| Where | File |
|---|---|
| Frontend (Yup) | `frontend/src/utils/validators.ts` |
| Backend (Joi) | `backend/src/validations/schemas.ts` |
| Backend wiring | `backend/src/middleware/validate.ts` + each `*.routes.ts` |

The backend `validate()` middleware runs Joi with `stripUnknown: true`
(extra fields are dropped, not rejected) and `abortEarly: false`
(all errors returned at once).

## Rules (kept identical on both sides)

### Password (signup, reset, change, admin reset)
- Minimum 8 characters
- At least one capital letter
- At least one number
- At least one special symbol
- (Login only checks presence, no complexity.)
- The admin reset endpoint (`PUT /admin/users/:id/reset-password`) enforces the
  same rule via `adminResetPasswordSchema`, and the new password is **never
  emailed** — the admin shares it out-of-band.

### Phone (optional everywhere)
- Optional — may be blank
- If provided: must start with a country code `+` and contain at least 10 digits
- Example: `+91 9876543210`

### Signup — mandatory vs optional
- **Mandatory:** name (min 2), email, password, confirm password (must match)
- **Optional:** phone, department, designation

### Project create
- **Required:** name (min 2), clientName, status, priority, technologies (≥1)
- **Optional:** startDate, clientLocation, clientWhatsapp, clientGmail (valid email), description,
  tags, repositoryUrls[], liveUrls[], endDate, deadline, budget, teamMemberIds
- Project **update** makes the required fields optional (partial update).

### Weekly update create
- **Required:** weekNumber (1–53), year (2020–2100), progressSummary (min 10),
  healthStatus, completionPercentage (0–100)
- **Optional:** completedTasks[], plannedTasks[], blockers, milestones, hoursLogged (0–168)

### AI work-log (`POST /api/integrations/work-log`, MCP `log_work`)
- **Required:** project (min 1), hours (0–24), minutes (0–59), summary (min 3)
- **Optional:** billable; started (`"HH:MM"` 24h org time — when the AI first
  observed the user active today; agents are told to ALWAYS send it)
- Joi only — consumed by AI agents/scripts, not browser forms, so there is
  deliberately **no Yup mirror** for this schema.
- Server-side plausibility cap: for non-admins, today's logged total may not
  exceed the time elapsed since the day's **work start** — the earliest
  AI-reported `started` across today's entries (stored as
  `TimeEntry.workStartedHm`, shown to admins on Daily Timesheets), or, when no
  start was reported, `TimesheetSettings.workdayStartHour` (default 8 = 08:00
  org time, admin-set 0–12 on Timesheet Settings). Enforced in
  `assertDayCapacity`, applies to the AI path AND manual entries/timer; admin
  corrections are exempt. `started` may not be in the future.

### Edit request
- **Required:** reason (min 10)
- **Optional:** comments
- (No duration — approved edit access is permanent, per user decision 2026-07-15.
  The `duration`/`expiresAt` columns remain in the DB as nullable legacy fields.)

## Data model fields

These project fields are collected in the UI, validated on both sides, **and**
persisted in the database (`backend/prisma/schema.prisma` → `Project`):
`clientLocation`, `clientWhatsapp`, `clientGmail`, `repositoryUrls[]`, `liveUrls[]`, `videoUrls[]`.

> If you add a new field to a form, add it in all four places:
> 1. Frontend type + Yup schema
> 2. Backend Joi schema
> 3. Backend controller (read + persist)
> 4. Prisma schema

## Database stays in sync automatically

The backend `start` script runs `prisma db push` before booting the server
(`backend/package.json`). So **every deploy syncs the database to the Prisma
schema automatically** — you never need to run a manual DB command after a
schema change.

- **Additive changes** (new columns/tables) apply automatically on deploy.
- **Destructive changes** (removing/narrowing a column) intentionally make the
  deploy **fail** instead of silently dropping data. If that happens, review the
  change and run `prisma db push --accept-data-loss` manually in the backend
  console once you've confirmed the data loss is intended.
