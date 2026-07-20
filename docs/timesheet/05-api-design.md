# Timesheet Module — API Design

All routes under `/api`, `authenticate` required, Joi-validated bodies (contract mirrored in Yup). Response envelope: `{ success, message, data }` (+ pagination fields on lists). Errors: 400 validation, 403 permission, 404 missing, 409 conflict (locked week / timer exists).

## Time entries
| Method & path | Who | Notes |
|---|---|---|
| `GET /time-entries?from&to&projectId&userId` | own; owner/admin may pass `userId` | flat list for ranges/reports |
| `GET /time-entries/week?isoYear&isoWeek&userId?` | own; owner/admin any | grid payload: entries + week envelope status + per-day/project totals |
| `POST /time-entries` | any employee | `{projectId, date, hours, minutes, description?, billable?}` → 409 if that week is SUBMITTED/APPROVED |
| `PUT /time-entries/:id` | author (admin never needs to edit others' raw entries) | same body partial; 409 if week locked |
| `DELETE /time-entries/:id` | author | 409 if week locked |
| `POST /time-entries/copy-week` | any employee | `{fromIsoYear, fromIsoWeek, toIsoYear, toIsoWeek}` copies own entries (project+minutes+billable, description cleared, source=COPY); skips days that already have entries for that project; 409 if target week locked |

## Timer (state lives server-side; widget polls with the existing 30s notification poll)
| Method & path | Notes |
|---|---|
| `GET /timer` | current user's timer or null; includes computed elapsed minutes |
| `POST /timer/start` | `{projectId, description?, billable?}` → 409 if one already running |
| `POST /timer/pause` | banks elapsed into `accumulatedMin`, sets paused |
| `POST /timer/resume` | restarts the running span |
| `POST /timer/stop` | converts to a DRAFT TimeEntry (today, source TIMER, min 1 minute), deletes timer, returns the entry |
| `DELETE /timer` | discard without saving |

## Submission & approval
| Method & path | Who | Notes |
|---|---|---|
| `POST /timesheets/submit` | employee | `{isoYear, isoWeek}` → creates/updates envelope SUBMITTED (needs ≥1 entry); notifies owners of the projects included |
| `GET /timesheets/mine?year?` | employee | their envelopes (status chips for the grid header) |
| `GET /timesheets/pending` | owner/admin | queue: submitted weeks of users in projects I own (admin: all) + total, entry count |
| `GET /timesheets/:id` | owner-of-a-included-project/admin/self | envelope + entries grouped by day |
| `PUT /timesheets/:id/approve` | project owner (any included project) or admin | locks week; notifies employee |
| `PUT /timesheets/:id/reject` | same | `{note}` required; unlocks; notifies employee |
| `PUT /timesheets/:id/reopen` | admin | unlocks an APPROVED week (audit-logged) |
| `GET /timesheets/missing?isoYear&isoWeek` | owner/admin | active users with zero entries that week (holidays excluded) |

## Reports (owner scope = their projects; admin = all)
| Method & path | Notes |
|---|---|
| `GET /reports/time/summary?from&to&groupBy=user\|project\|day&projectId?&userId?&billable?` | table + totals; the one endpoint behind weekly/monthly/employee/project/billable views |
| `GET /reports/time/utilization?from&to` | per user: logged vs target hours (settings), utilization %, overtime (over target) |
| `GET /reports/time/export?same-params&format=csv` | CSV download (hardened toCsv); PDF/Excel deferred |

## Settings (admin only)
| Method & path | Notes |
|---|---|
| `GET/PUT /timesheet-settings` | weekly target, reminder config |
| `GET/POST/DELETE /holidays` | holiday list |
| `GET/PUT /billable-rates/:userId` | admin sets hourly rate |

## Authorization matrix
- Employee: CRUD own entries (unlocked weeks), own timer, submit own week, own dashboards/reports scoped to self.
- Project owner: read entries + approve/reject weeks **of users who logged time to a project they own**; missing-timesheet list for their members; reports filtered to their projects.
- Admin: all of the above everywhere + reopen + settings + rates + holidays.

Server-side enforcement mirrors `assertProjectWriteAccess` style helpers: `assertEntryEditable(entry, user)` (author + week unlocked) and `assertWeekReviewer(week, user)` (admin, or owns ≥1 project appearing in that week's entries).
