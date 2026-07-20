# Timesheet Module — Competitor Analysis

Research conducted 2026-07-20 against live sources (official docs, pricing pages, G2/Capterra reviews). Ten platforms: Toggl Track, Clockify, Harvest, ClickUp, Hubstaff, Jira+Tempo, Asana, Monday.com, Teamwork, Wrike. Full comparison matrix and adopted-patterns list at the end.

---

## Toggl Track

**Entry model:** description + project + task (paid) + tags + billable + start/end/duration. Two modes: Timer and Manual. Seconds-granularity storage, forgiving duration parser (`5`, `5.5`, `5:30`, `5h30m`, `120m`, `50%` of weekly target).

**Timer:** persistent top bar on Timer page; start via big play button or `N` key; **no pause — "Continue" pattern instead** (hover any past entry / `C` restarts it as a new entry with same metadata); running timers stay fully editable; idle detection only in desktop apps (keep/discard/split recovery options); autotracker rules + Pomodoro on desktop.

**Weekly timesheet view:** projects × days grid, autosave per cell on Enter/blur, Tab advances across the week, "+ Add row" with inline project create, per-row tag/billable controls, **copy previous week in two flavors** (ghost rows vs duplicate entries), weekly target comparison. Quirks: cell entries default to 8AM start, >16h entries anchor to day start, midnight-crossing splits.

**Approvals (Premium only):** weekly-only periods, opt-in per member, manual submission (unsubmitted weeks invisible to approvers — a top complaint), submit locks the week, approve/reject with comments + email, multi-layer sequential approvers, bulk approve, statuses Unsubmitted→Submitted→Approved/Rejected with audit trail. Separate workspace "lock entries before date". Admins can't pre-inspect or amend a submitted sheet — must reject.

**Billable/rates:** per-entry flag defaulting from project; rates at 5 levels (workspace→member→project→project-member→task), most granular wins; historic rates Premium.

**Reports:** Summary (group/subgroup, switchable metric Time/Billable%/Revenue/Cost/Profit), Detailed (row-per-entry), Weekly matrix, Profitability (Premium), saved reports w/ share links, scheduled email reports (Premium). **PDF free; CSV/Excel paid** (famous gotcha).

**Dashboards:** employee — personal stats sidebar + target comparison; admin — team adoption dashboard, Workload report w/ Utilization mode (billable vs available hours; "rows without tracked time" toggle to surface missing time), Time Audits (suspicious entries), Analytics custom charts. Explicitly **no surveillance/screenshots**.

**Pricing signal:** approvals, locking, required fields, audits, scheduled reports = **Premium ($14-18/u/mo)**. Billable rates/tasks = Starter ($9).

**Complaints:** approval flow clunky & bolted-on; admins can't fix submitted sheets; mobile editing clunky; key features paywalled; timer sync glitches across devices; data quality decays without discipline (no enforcement below Premium).

**Adopt:** forgiving cell parser; Tab-through-week; copy-last-week (both intents); editable running timer; required-at-stop-not-start philosophy; targets-based reminders ("<6h/day emails me") over blunt nags; missing-time surfaced in the approver view (fixing Toggl's biggest approval complaint).

---

## Clockify

**Entry model:** description + project (+task) + tags + billable + start/end; timer and manual modes in one toggled bar (`n`/`m` shortcuts). Signature **forgiving parser**: `1.5`, `90`, `1:30`, `1h30m`, `.5` all resolve; second-level granularity. Backdating free; admins can restrict via Lock timesheets / Force timer.

**Timer:** persistent top bar; server-side survival if browser closes; **editable start time on a running timer** (click the ticking clock); "Continue" play button on any past entry duplicates metadata into a new running entry; idle triage on desktop (discard/keep/split — idle data stays private from admins).

**Weekly grid:** project rows × day columns; one aggregate entry per cell (descriptions only via cell pop-up — power users fall back to Detailed view); Add row picker; copy last week (activities-only vs activities+time, only into an empty week); personal week templates; per-day + week totals; enabling grid view forces Project as required; **in-grid approval glyphs** (green=approved-locked, orange=pending, none=editable).

**Approvals (Standard tier):** period weekly/semi-monthly/monthly; submit covers time+expenses; approvers = admins + team managers + project managers; bulk/Approve All; **reject requires a mandatory note** (emailed); **approved entries permanently locked, even for admins**; "Remind to submit"/"Remind to approve" nudges; separate rolling auto-lock + Force timer integrity controls; per-user targets with under/over-target emails to user AND manager (time-off reduces expected capacity).

**Billable/rates:** $ toggle; 5 rate levels most-specific-wins (project-member → task → project → member → workspace); parallel cost rates (profit = billable − cost); historic-rate prompts on change.

**Reports:** Summary (hierarchical group/subgroup + billable-split bar chart), Detailed (admins edit anyone's entries inline, undo-toast on delete), Weekly grid (Time↔Amount toggle, **"show users without time"**, filter by approval status); exports PDF free, CSV/Excel Basic+; saved/shared links; scheduled email reports (Pro); automatic personal weekly digest email.

**Dashboards:** one page, "Only me" vs "Team" toggle; team view shows **what each person is working on right now** (live entry); role-scoped visibility.

**Pricing signal:** approvals+locking+targets = **Standard $5.49–7/seat**; required fields + CSV export = Basic $4–5.

**Complaints:** mobile app weak (no approvals on phone, sync bugs); UI clutter at scale; grid can't hold multiple entries per cell; dashboard shallow; CSV export paywalled.

**Adopt:** the forgiving parser; editable running-timer start; in-grid approval glyphs; mandatory rejection note; "show users without time"; copy-week into empty week only (conflict-free); undo on entry delete.

---

## Jira + Tempo Timesheets (reference implementation for approvals)

**Entry:** `w` hotkey opens Log Time from anywhere; fields: work item, date (+multi-day), hours, description, custom admin-defined "work attributes", billable-hours field defaulting to worked hours. Play/pause/stop tracker per issue. **Killer feature: calendar integration** — synced Google/M365 meetings appear as cards, one click converts a meeting to a time entry.
**Approval lifecycle (the reference):** admin-defined periods (weekly/monthly, open/closed globally) → per-user status chips `Open → Ready to Submit → Waiting for Approval → Approved/Rejected`; **one reviewer per timesheet** (multi-level chains NOT supported even here); submission locks the period for that user; per-user **grace periods** for corrections; approver queue with **bulk approve via checkboxes** + drill into a member's sheet + next/prev member navigation; **Approval Log** (full submit/approve/reject audit trail with actor + timestamp); accounting "period close" freezes everything; Scheduler emails: status reminder to all + late-only reminder N days before close.
**Reports:** multi-level group-by (Account→User→Issue), saved reports, XLS/CSV/PDF + raw-data export; **no scheduled email reports even in Tempo Cloud**. Utilization/capacity live in a separate Capacity Planner app.
**Complaints:** pricey, clunky admin config, slow big reports, "too many clicks to log time", redesign backlash, single-reviewer limit.

## Asana (Timesheets & Budgets add-on)
Native = est/actual fields + task timer only. The $5.99/user add-on gives the weekly grid (projects × days, weekend toggle, billable toggle), submit-week → reviewer tab approve/reject (one reviewer), inbox notices, weekly submission reminders, per-member cost rates with budget threshold alerts. Cleanest weekly grid of the PM suites; thin exports; paywalled.

## Monday.com
Time Tracking Column (Pro+): per-item timer/sessions. **No native timesheet view, no approvals, no billable concept** — dashboards widget is summary-only. Its strength is workload/capacity visuals (Enterprise Resource Planner, FTE views). Verdict: great allocation visuals, not a timesheet product.

## Teamwork (agency-shaped — closest to our needs)
Log vs tasks/projects with billable toggle + tags; **Sheet view** (grid, week/month) + Calendar view; admin Company Timesheet. Approvals: weekly/monthly periods, Unsubmitted/In review/Approved, approve or request changes, lock + **"Request to re-open timesheet"** after approval. **Cost rates AND billable rates** (role/project/client overrides). Utilization report (est vs actual %), Profitability report; exports PDF/CSV/Excel/Sheets. **Best-in-class reminders: criteria-based, email+bell, message states "logged X of Y hours."** Complaints: shallow reports, scattered UI.

## Wrike
Weekly grid with **task × category rows**, double-click cells; per-entry comment + admin-defined categories. Approvals (top 2 plans only): daily/weekly/monthly submission rules with **required hours that auto-adjust for PTO/holidays**, **soft (confirm) vs hard (block) enforcement**, approver override alerts, per-person lock. Billability inherited from task. Workload charts by job role + Bookings demand placeholders. Complaint: runaway timers, in-app-only reminders.

---

## Cross-suite comparison (PM suites)

| Dimension | Tempo (Jira) | Asana (+add-on) | Monday.com | Teamwork | Wrike |
|---|---|---|---|---|---|
| Entry | `w` hotkey, issue-level, meeting import | grid entry w/ billable | timer sessions only | task/project, billable, tags | task timer + cell entry, categories |
| Weekly view | period grid (classic screen removed) | weekly grid (add-on) | none native | Sheet + Calendar + Company | grid, task×category rows |
| Approvals | full lifecycle, 1 reviewer, bulk, grace, audit log, period close | submit→review tab, 1 reviewer | none | periods, lock, re-open request | required-hrs rules, PTO-adjust, soft/hard |
| Billable/rates | billable hrs + account categories; rates in add-on | cost rates only | none | cost AND billable rates | inherited billability, role rates |
| Reports | multi-group, saved, raw+formatted export | dashboard charts | Excel column dump | Time/Utilization/Profitability | Timelog + builder + Analyze |
| Utilization | Capacity Planner app | Workload view | Resource Planner (Ent.) | Utilization report | Workload by job role |
| Reminders | status + late-only emails pre-close | weekly, built-in | DIY | criteria-based, states the gap | self-serve, in-app only |

## Top 10 patterns adopted for our build (ranked, from both research tracks)

1. **Tempo's status lifecycle** with visible chips (ours: Draft → Submitted → Approved/Rejected) — the backbone.
2. **Weekly grid, inline cell entry** with live day/week totals (universal expected layout).
3. **Reject-with-mandatory-comment loop** that reopens the week (Tempo/Clockify/Teamwork).
4. **Approver queue + drill-in drawer** (Tempo); bulk approve as fast-follow.
5. **Reminders that state the gap** ("logged 24h of 40h") to under-target people only (Teamwork/Toggl).
6. **Soft target enforcement** — submit under target = confirm prompt, never a hard block (Wrike, soft mode).
7. **Billable default with per-entry override**; billable inherited toward reporting categories.
8. **Grouped reports + saved filter params + CSV** raw export (Tempo raw-vs-formatted split → later).
9. **Lock on approval + audit trail** (ActivityLog) + admin reopen (Teamwork's re-open request, admin-actioned).
10. **Forgiving duration parser + copy-last-week + editable running timer** (Toggl/Clockify capture ergonomics).

**Deliberately not built (overkill at 10–50 people, per research):** multi-level approver chains (not even Tempo has them), FTE capacity managers, CapEx/OpEx accounting split, scheduled report emails, AI capacity prediction, desktop idle detection.
**Anti-patterns avoided:** >3 clicks to log time; timers running forever (we cap spans at 12h with warnings); in-app-only reminders (ours: in-app + email); hiding missing timesheets from approvers (our Missing tab surfaces them); paywall psychology is irrelevant internally — every feature ships to everyone.

## ClickUp

**Entry:** time is a field on tasks; three modes in one widget (timer / manual duration / start–end range); natural-language durations ("1h 30m"); global toolbar timer with task picker, syncs across devices; Business+ can track without a task and attach later. **No idle detection** (top complaint: forgotten timers).
**Timesheets Hub:** weekly grid, task rows × day columns, inline cell typing, Timesheet vs Time-entries display modes, daily totals; team tab shows **capacity under each name** (hover: capacity vs tracked vs billable vs remaining). **Approvals (Business+, recent):** submit week → approver approves / requests changes with comment; deadlines + automated reminders; **entries lock on submission**.
**Billable:** per-entry flag + workspace default-to-billable; **no native rates at any price** (5-year-old open request — teams export CSV and price in spreadsheets).
**Reports:** dashboard cards (Timesheet / Time Reporting / Billable Report), 2-level grouping, CSV export; "Me mode" as the employee view.
**Complaints:** too many clicks; forgotten timers; manual-first data quality; reporting depth requires exports; mobile timer flaky.
**Adopt:** global timer with picker; three-modes-in-one entry widget; capacity overlay in team view; lock-on-submission; workspace defaults over per-entry discipline.

## Hubstaff

**Philosophy: monitoring-first** (screenshots, activity %, apps/URLs, GPS) — the anti-model for an internal trust-first tool, but its approval/locking chain is well-engineered.
**Entry:** manual add requires project + start/end + **mandatory reason note**; manual time displays 0% activity, filterable as its own "Manual" time type, logged in a dedicated Manual Time Edits report; destructive-overlap warnings. Duration parser accepts `18.5`, `1hour`, `30min`.
**Approvals (Team plan $10-12/seat):** pay-period timesheets, tabs Open/Submitted/Approved/Denied/All, manual submit, **Unsubmit escape hatch**, denial requires reason + email, approve gates payroll; **lock icons with cause-specific explanations** ("part of an approved timesheet"), unlock with desync warning. Gotcha in their own docs: early submission blocks further tracking for the period.
**Rates:** separate PAY vs BILL rate per member, project-level override.
**Reports:** Time & Activity flagship; saved filter sets; CSV/PDF/XLS; scheduled reports to external recipients.
**Dashboards:** Who's Online, Timesheets-to-approve widget, Late shifts, Low activity.
**Complaints:** surveillance anxiety (Trustpilot 2.6 vs G2 4.5 — telling split), activity score punishes thinking work, resource-heavy desktop app, billing practices.
**Adopt:** mandatory reason on manual edits *only for post-approval corrections* (not everyday entry — too much friction); cause-labeled lock states; approval status tabs; unsubmit. **Reject:** all surveillance mechanics — explicitly out of our product's values.

## Harvest

**Philosophy: compliance-through-minimalism** — one timesheet surface, Day/Week toggle, autosave with no save button anywhere, type-ahead pickers, `N`/Tab/ESC shortcuts.
**Entry:** always project+task; notes on Day view; timer restartable on any past entry (play button); idle prompt with four resolutions (stop-and-remove / continue-and-remove / add-as-entry / ignore).
**Week grid:** project/task rows × 7 day cells, cells autosave seconds after typing, **last week's rows auto-carry into a new week with zeroed hours** + "Copy rows from most recent timesheet" link (structure, never hours). Gotcha: no notes in Week view.
**Approvals (Enterprise tier):** submit week (or custom range); entries stay editable until approved ("approvers always see live entries"); **no reject state** — approver emails the person or jumps in and fixes it directly; approval locks the whole week; only admins withdraw approval; auto-submit + auto-lock schedules; **reminders sent before AND after the deadline**.
**Rates:** task-level billability; three rate modes per project (project/person/task rate); cost rates → profitability; invoicing pulls uninvoiced billable time and locks it.
**Reports:** Time report with Clients/Projects/Tasks/Team tabs, every number click-drills to raw entries; detailed report with bulk move-entries; saved/recurring emailed reports; custom export column picker; Excel/CSV/PDF/Drive.
**Team overview:** per-person capacity bar (dark=billable, light=non-billable; **blue ≤ capacity, red over**), orange dot = timer running now, pinned people, budget bars with red overflow + threshold email alerts.
**Complaints:** Week view can't hold notes; no month view; no background capture; post-acquisition usage-based pricing chaos (dominant 2025-26 gripe).
**Adopt:** autosave-no-button; auto-carry rows with zeroed hours; restart-timer-from-entry; before+after deadline reminders; capacity color semantics; clickable drill-down numbers.

---

# Final comparison matrix (all 10)

| Capability | Toggl | Clockify | Harvest | ClickUp | Hubstaff | Tempo | Asana | Monday | Teamwork | Wrike |
|---|---|---|---|---|---|---|---|---|---|---|
| Manual entry | ✅ | ✅ | ✅ | ✅ | ✅ (reason req.) | ✅ | add-on | sessions | ✅ | ✅ |
| Timer | ✅ no pause | ✅ | ✅ | ✅ global | ✅ desktop | ✅ | task-level | per-item | ✅ multi | ✅ |
| Weekly grid | ✅ | ✅ | ✅ | ✅ Hub | summary-only | grid | add-on | ❌ | ✅ + month | ✅ |
| Copy last week | ✅ 2 modes | ✅ 2 modes | ✅ auto-rows | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit/approve | Premium | Standard | Enterprise | Business | Team plan | ✅ core | add-on | ❌ | ✅ | top plans |
| Reject w/ comment | ✅ | ✅ mandatory | ❌ (email/fix) | ✅ req. changes | ✅ reason req. | ✅ | ✅ | — | ✅ | ✅ |
| Lock on approval | ✅ | ✅ permanent | ✅ | ✅ on submit | ✅ + causes | ✅ + period close | ✅ | — | ✅ + reopen req. | ✅ |
| Billable flag | ✅ | ✅ | task-level | ✅ | ✅ | ✅ hrs field | ✅ | ❌ | ✅ | inherited |
| Rates | 5-level | 5-level + cost | 3 modes + cost | ❌ none! | pay + bill | via add-on | cost only | ❌ | cost + bill | job-role |
| Utilization view | Workload | targets | capacity bars | capacity overlay | activity % | Capacity app | Workload | Resource Planner | Utilization rpt | Workload |
| Missing-timesheet chase | reminders | "users w/o time" | unsubmitted tab | reminders | approvals tab | late-only email | reminders | ❌ | criteria emails | in-app remind |
| CSV/Excel export | paid | Basic+ | ✅ + custom cols | ✅ | ✅ + XLS | ✅ + raw | thin | Excel dump | ✅ 4 formats | Excel |
| Scheduled reports | Premium | Pro | ✅ recurring | thin | Grow+ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Bottom line for our build:** nobody at any price ships the full loop of {frictionless capture + weekly grid + copy-week + owner approvals + missing-timesheet surfacing + utilization + CSV} without paywalls or add-ons. Internally we ship all of it to everyone, adopting Toggl/Clockify capture ergonomics, Harvest's autosave/copy-forward/capacity colors, Tempo's approval lifecycle + audit trail, Teamwork's gap-stating reminders, ClickUp's global timer placement — and rejecting Hubstaff-style surveillance entirely.
