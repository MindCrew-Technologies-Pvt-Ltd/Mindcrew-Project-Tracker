# Timesheet Module — Requirements & Integration Design

**Status:** Draft for staging build · 2026-07-20
**Companion docs:** `01-competitor-analysis.md` (research), `03-ui-spec.md`, `04-database-design.md`, `05-api-design.md`, `06-architecture.md`

## 1. Where it fits in the existing system

| Existing piece | Reused by timesheets as |
|---|---|
| `User` (ADMIN / EMPLOYEE) | Entry author; admin = final approver & configurator |
| `Project` + `ProjectMember` | What time is logged against; membership defines what appears in your project picker |
| Project **owner** | The "manager" — approves their project team's submitted timesheets (mirrors the edit-request owner-approval decision) |
| `Notification` + bell/polling | Reminder, submission, approval, rejection notifications (type `TIMESHEET`) |
| `VALIDATION_CONTRACT.md` discipline | Yup ⇄ Joi parity for entry & submission payloads |
| Boot-time `prisma db push` | New tables ship additively — deploy = schema live |
| Sidebar (My Dashboard / My Projects / All Projects) | New **Timesheet** section: My Timesheet, Approvals (owners/admin), Time Reports |
| `DataTablePro` | Approvals queue, report tables |
| Redux Toolkit slices + services | New `timesheet` slice + service, same patterns |

**Roles decision (flagged):** the brief mentions a Manager role. We deliberately do NOT add a third role in v1 — "manager" = *project owner* for that project's entries, ADMIN = everything + final say. This matches how edit requests already work. A dedicated MANAGER role (cross-project) is listed under Future Enhancements.

## 2. v1 scope (build now)

### Employee
- **Manual time entry:** project (their projects by default, any project allowed), date, hours+minutes, description, billable flag. Draft by default.
- **Timer:** one active timer per user — start (pick project + note), pause/resume, stop → becomes a draft entry with accumulated time. Timer state survives refresh (server-side). Global timer widget in the top bar.
- **Weekly timesheet grid:** project rows × Mon–Sun columns, current week default, arrows to navigate weeks. Inline cell editing (`5:30` or `5.5` accepted), autosave per cell on blur, per-day and per-project totals, **Copy last week**, per-day cap validation (>16h warns, >24h blocks).
- **Submission:** submit a whole week (locks entries), see status chips DRAFT / SUBMITTED / APPROVED / REJECTED; rejected weeks reopen for editing with the reviewer's comment shown.
- **My timesheet dashboard:** this week / this month totals, billable vs non-billable split, active timer, daily average, per-project breakdown, pending/rejected weeks.

### Project owner ("manager")
- **Approvals queue:** submitted weeks from members of projects they own; week detail view (entries grouped by day); Approve / Reject with comment; notification both ways.
- Team hours per project, missing-timesheet list for their project members.

### Admin
- Everything owners can do, across all projects; final say (can approve/reject anything, can unlock an approved week).
- **Reports:** weekly / monthly / per-employee / per-project / billable / utilization, with filters (range, project, user, billable) and CSV export (Excel/PDF later — CSV ships v1, reuses the hardened `toCsv`).
- **Settings:** weekly hour target (utilization basis, default 40), reminder toggles (wired to the existing reminder cron switch), holidays list (dates excluded from missing-timesheet detection), optional per-user billable rate (feeds cost columns in reports).

### Notifications (v1)
- Submission → project owner; approval/rejection → employee; weekly "you haven't submitted last week" reminder (Mon 10:00, respects the global reminder kill-switch and holidays). All in-app + email via existing Nodemailer.

## 3. Deferred (documented, not built in v1)
- AI work summaries & productivity insights (company decision: no AI features yet).
- Idle-time detection (needs desktop agent — Hubstaff-style; out of scope for a web tool).
- Task/sub-task level tracking (no Task entity exists; logging is per project + free-text note).
- PDF/Excel export (CSV first; exceljs/pdfkit later).
- Resource forecasting / capacity planning UI; department dimension (no Department entity; `User.department` is a free-text field — reports can group by it, but "department utilization" dashboards deferred).
- Overtime pay rules (overtime = hours beyond weekly target appears in utilization report; payroll math deferred).
- Multi-level approval chains (owner → admin double approval): v1 is single approval, admin override.

## 4. Key user journeys
1. **Log as you work:** header timer → start on "Hiphype Website" → pause for lunch → resume → stop at 6pm → edit note → entry saved as draft in today's column.
2. **Friday catch-up:** My Timesheet → week grid → type hours into cells → Copy last week for the recurring project → Submit week → owner notified.
3. **Owner review:** bell notification → Approvals → open week → sees 38.5h across 3 projects → rejects with "Wed looks double-counted" → employee notified → fixes Wed → resubmits → approved → week locks.
4. **Month-end:** Admin → Reports → Monthly, filter Project=OMRA AI, export CSV for billing.

## 5. Constraints honored
- Fixed ports/URLs; staging-first workflow; Yup⇄Joi contract for every new payload; additive-only schema (no destructive push); reminder emails stay behind the global disable flag until re-enabled; no AI integrations.
