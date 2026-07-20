import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createTimeEntrySchema, updateTimeEntrySchema, copyWeekSchema, timerStartSchema,
  submitWeekSchema, rejectWeekSchema, timesheetSettingsSchema, holidaySchema, billableRateSchema,
} from '../validations/schemas';
import {
  getTimeEntries, getWeekEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry, copyWeek,
} from '../controllers/timeEntries.controller';
import {
  getTimer, startTimer, pauseTimer, resumeTimer, stopTimer, discardTimer,
} from '../controllers/timer.controller';
import {
  submitWeek, myWeeks, pendingWeeks, getWeekDetail, approveWeek, rejectWeek, reopenWeek, missingWeek,
} from '../controllers/timesheets.controller';
import { timeSummary, utilization, exportSummary } from '../controllers/timeReports.controller';
import {
  getSettings, updateSettings, listHolidays, addHoliday, deleteHoliday, listRates, setRate,
} from '../controllers/timesheetAdmin.controller';

const router = Router();
router.use(authenticate);

// Time entries
router.get('/time-entries', getTimeEntries);
router.get('/time-entries/week', getWeekEntries);
router.post('/time-entries', validate(createTimeEntrySchema), createTimeEntry);
router.post('/time-entries/copy-week', validate(copyWeekSchema), copyWeek);
router.put('/time-entries/:id', validate(updateTimeEntrySchema), updateTimeEntry);
router.delete('/time-entries/:id', deleteTimeEntry);

// Timer
router.get('/timer', getTimer);
router.post('/timer/start', validate(timerStartSchema), startTimer);
router.post('/timer/pause', pauseTimer);
router.post('/timer/resume', resumeTimer);
router.post('/timer/stop', stopTimer);
router.delete('/timer', discardTimer);

// Submission & approvals
router.post('/timesheets/submit', validate(submitWeekSchema), submitWeek);
router.get('/timesheets/mine', myWeeks);
router.get('/timesheets/pending', pendingWeeks);
router.get('/timesheets/missing', missingWeek);
router.get('/timesheets/:id', getWeekDetail);
router.put('/timesheets/:id/approve', approveWeek);
router.put('/timesheets/:id/reject', validate(rejectWeekSchema), rejectWeek);
router.put('/timesheets/:id/reopen', reopenWeek);

// Reports
router.get('/reports/time/summary', timeSummary);
router.get('/reports/time/utilization', utilization);
router.get('/reports/time/export', exportSummary);

// Admin configuration
router.get('/timesheet-settings', requireAdmin, getSettings);
router.put('/timesheet-settings', requireAdmin, validate(timesheetSettingsSchema), updateSettings);
router.get('/holidays', listHolidays); // read open to all (grid shows holiday dots)
router.post('/holidays', requireAdmin, validate(holidaySchema), addHoliday);
router.delete('/holidays/:id', requireAdmin, deleteHoliday);
router.get('/billable-rates', requireAdmin, listRates);
router.put('/billable-rates/:userId', requireAdmin, validate(billableRateSchema), setRate);

export default router;
