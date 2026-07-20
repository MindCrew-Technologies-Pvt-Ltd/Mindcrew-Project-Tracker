# Timesheet Module — Database Design

All additions are **additive** (safe for the boot-time `prisma db push`). Postgres via Prisma 5.

## ER overview (text)

```
User 1──* TimeEntry *──1 Project
User 1──1 ActiveTimer (0..1) ──1 Project
User 1──* TimesheetWeek 1──* (implicit: TimeEntry via userId+weekKey)
TimesheetWeek *──1 User (reviewedBy, nullable)
User 0..1──1 BillableRate
Holiday (standalone)
TimesheetSettings (single row)
```

`TimeEntry` is the atom (one row per project+date+person entry). `TimesheetWeek` is the submission/approval envelope for a user's ISO week — entries are linked by `(userId, isoYear, isoWeek)` rather than FK so entries can exist before a week is ever submitted.

## Models

```prisma
enum TimesheetStatus { DRAFT SUBMITTED APPROVED REJECTED }

model TimeEntry {
  id          String   @id @default(cuid())
  userId      String
  projectId   String
  date        DateTime            // day of work (date-only semantics, stored UTC midnight)
  minutes     Int                 // total minutes (hours*60+minutes); 1..1440
  description String?
  billable    Boolean  @default(true)
  isoYear     Int                 // denormalized from date for fast week grouping
  isoWeek     Int
  source      String   @default("MANUAL") // MANUAL | TIMER | COPY
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([userId, isoYear, isoWeek])   // weekly grid + submission collection
  @@index([projectId, date])            // project reports
  @@index([date])                       // range reports
}

model TimesheetWeek {
  id            String          @id @default(cuid())
  userId        String
  isoYear       Int
  isoWeek       Int
  status        TimesheetStatus @default(SUBMITTED) // row exists only once submitted
  totalMinutes  Int             // snapshot at submission (display; entries stay source of truth)
  submittedAt   DateTime        @default(now())
  reviewedById  String?
  reviewedAt    DateTime?
  reviewNote    String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  user       User  @relation("tsWeekUser", fields: [userId], references: [id], onDelete: Cascade)
  reviewedBy User? @relation("tsWeekReviewer", fields: [reviewedById], references: [id])

  @@unique([userId, isoYear, isoWeek])  // one envelope per user-week
  @@index([status])                     // approvals queue
}

model ActiveTimer {
  id             String    @id @default(cuid())
  userId         String    @unique      // ONE timer per user, enforced by DB
  projectId      String
  description    String?
  billable       Boolean   @default(true)
  startedAt      DateTime  @default(now()) // start of current running span
  accumulatedMin Int       @default(0)     // minutes banked across pauses
  isPaused       Boolean   @default(false)

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model BillableRate {
  id         String   @id @default(cuid())
  userId     String   @unique
  hourlyRate Float                 // internal cost/billing rate, admin-set
  currency   String   @default("INR")
  updatedAt  DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Holiday {
  id   String   @id @default(cuid())
  date DateTime @unique
  name String
}

model TimesheetSettings {
  id                 String  @id @default("singleton")
  weeklyTargetHours  Int     @default(40)   // utilization denominator
  reminderEnabled    Boolean @default(false) // respects global email pause
  reminderDay        Int     @default(1)     // 1=Mon
  reminderHour       Int     @default(10)
}
```

Plus back-relations on `User` (`timeEntries`, `timesheetWeeks`, `reviewedWeeks`, `activeTimer`, `billableRate`) and `Project` (`timeEntries`, `activeTimers`).

## Design decisions

- **Minutes as Int**, never floats — no rounding bugs; UI converts to h:mm.
- **ISO week denormalized** onto entries: the grid, submission and reports all group by `(isoYear, isoWeek)` without date math in SQL; computed server-side on every write (single source: shared `isoWeek()` util, same algorithm the weekly-update page uses).
- **Envelope-not-FK submission:** locking = "a SUBMITTED/APPROVED `TimesheetWeek` row exists for that user-week" → write guards on TimeEntry check it. Rejection flips the envelope to REJECTED, which unlocks edits; resubmission updates the same row (unique constraint) and re-snapshots totals. Full history of state changes goes to the existing `ActivityLog` (module `TIMESHEET`), reusing the audit trail instead of a new table.
- **One-timer-per-user** via `@unique(userId)` — a second start is a 409, matching Toggl/Clockify behavior.
- **Approvals queue query:** `TimesheetWeek WHERE status=SUBMITTED AND userId IN (members/owners of my projects)` — index on `status` + the existing ProjectMember index carries it. Fine to 100k entries; at 1000+ employees add composite `(status, submittedAt)` and paginate (documented in 06-architecture).
- **Utilization/productivity metrics are computed, not stored** (aggregations over TimeEntry with the settings target). Materialized rollups (`EmployeeUtilization` table) are a documented scale-out step, not v1 — premature at current size.
- **Constraints:** minutes 1..1440 per entry (Joi + UI); per-day total cap enforced in controller (>24h reject); date not in future beyond today (configurable later).
```
