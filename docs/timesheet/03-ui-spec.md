# Timesheet Module — UI/UX Spec

Design language: existing indigo+slate theme, MUI 5, `DataTablePro`, status pills, Inter. All screens responsive (grid collapses to stacked cards <900px; tables scroll horizontally on mobile as elsewhere in the app).

## Navigation
Sidebar gains a **TIMESHEET** group:
- **My Timesheet** `/timesheet` (all users)
- **Approvals** `/timesheet/approvals` (project owners see their queue; admins all — hidden if user owns nothing and isn't admin)
- **Time Reports** `/timesheet/reports` (owners: own projects; admin: all)
Topbar gains the **global timer widget** (left of the bell): ▶ start (opens popover: project picker + note + billable) / running state shows `⏱ 2:34 · Project` + pause/stop; visible on every page.

## Screens

### 1. My Timesheet `/timesheet` — the hub (weekly grid + dashboard strip)
- **Header row:** week navigator (‹ Week 29 · Jul 14–20 ›, "Today" button), week status chip (Draft/Submitted/Approved/Rejected+tooltip note), actions: **Copy last week**, **＋ Add entry**, **Submit week** (primary; disabled when 0h or locked).
- **Stat strip** (4 cards): This week h, This month h, Billable %, Daily average.
- **Grid:** rows = projects (their member/owned projects with entries + "add row" project picker); columns Mon–Sun with dates, red dot on holidays; cells editable (accepts `5:30`, `5.5`, `90m`), autosave on blur w/ spinner→check; cell click opens mini-popover for description + billable toggle when the cell has an entry; per-row totals right, per-day totals bottom, grand total corner. Locked week = read-only grid with lock icon.
- **Rejected banner:** amber alert with reviewer note + "Fix & resubmit" scroll-to-grid.
- Empty state: "No time logged this week — start the timer or add your first entry."

### 2. Add/Edit Entry (dialog, not page)
Project (autocomplete, member projects first) · Date (defaults to clicked cell/today) · Hours + Minutes (two steppers) · Description (multiline) · Billable (switch, default on) · Save. Validation inline (max 24h/day incl. existing entries).

### 3. Timer widget (topbar, global)
Idle: ▶ button. Popover on start. Running: elapsed ticking each minute, project name, pause ⏸ / stop ⏹. Stop → confirmation popover "Save 3h 30m to OMRA AI?" → saves draft entry + snackbar with "Edit" action. Paused state shows ⏸ badge. Survives refresh (server state).

### 4. Approvals `/timesheet/approvals` (owners/admin)
`DataTablePro`: Employee (avatar+email) · Week (Jul 14–20) · Hours · Billable h · Projects (chips) · Submitted date · Actions 👁 ✓ ✗. Filters: status (default Submitted), week, project. Row → **Week detail drawer**: entries grouped by day with notes, totals, per-project subtotals; Approve (green) / Reject (opens comment dialog, note required). Tab "Missing" lists members with no submission for the selected week (with "remind" bell action → sends notification).

### 5. Time Reports `/timesheet/reports`
Filter bar: date range presets (This week/month, Last month, Custom), project, person, billable. Tabs: **Summary** (group by person | project | day — bar chart + table), **Utilization** (per person: logged vs target, % bar, overtime highlighted), Export CSV button. Charts: Recharts, indigo family, consistent with dashboards.

### 6. Admin Settings `/timesheet/settings` (admin)
Cards: Weekly target hours (number) · Reminders (enable + day/hour selects, note about global email pause) · Holidays (date+name list, add/remove) · Billable rates (user table with inline rate edit).

## Component hierarchy (frontend)
```
pages/timesheet/
  MyTimesheetPage        → WeekNavigator, StatStrip, WeekGrid(EntryCellPopover), SubmitBar
  ApprovalsPage          → DataTablePro, WeekDetailDrawer, RejectDialog, MissingTab
  TimeReportsPage        → ReportFilters, SummaryChart, SummaryTable, UtilizationTable
  TimesheetSettingsPage  → TargetCard, ReminderCard, HolidaysCard, RatesCard
components/timesheet/
  TimerWidget (mounted in Topbar)
  TimeEntryDialog
store/slices/timesheetSlice.ts   services/timesheetService.ts
```

## UX rules adopted from research
Toggl: one always-visible timer, one click to start, forgiving time input formats. ClickUp/Tempo: week grid with cell-level autosave + submit-week envelope; approval with mandatory rejection comment. Harvest: copy-previous-week; weekly reminder default Monday morning. Clockify: draft-first entries, lock after approval. Everywhere: totals always visible, never lose typed data (autosave), empty states teach the flow.
