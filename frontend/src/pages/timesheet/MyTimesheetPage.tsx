import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Card, CardContent, Typography, IconButton, Button, Tooltip, Alert, Snackbar,
  TextField, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, Chip, Popover, Autocomplete,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon, Lock as LockIcon,
  Add as AddIcon, Send as SendIcon, Check as CheckIcon,
  EditOutlined as EditIcon, DeleteOutline as DeleteIcon, TodayOutlined as TodayIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import TimeEntryDialog from '../../components/timesheet/TimeEntryDialog';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchWeekThunk, createEntryThunk, updateEntryThunk, deleteEntryThunk,
  submitWeekThunk,
} from '../../store/slices/timesheetSlice';
import timesheetService from '../../services/timesheetService';
import {
  TimeEntry, ProjectRef, TimesheetStatus, CreateTimeEntryPayload,
} from '../../types/timesheet.types';
import {
  isoWeekOf, shiftIsoWeek, weekDates, weekLabel, dateKey, minutesToHM, minutesToPretty,
  parseDuration, splitMinutes,
} from '../../utils/timeFormat';

const INDIGO = '#4F46E5';
const WEEKLY_TARGET_MINUTES = 40 * 60; // soft target for the submit nudge

const statusStyles: Record<TimesheetStatus, { bg: string; fg: string; label: string }> = {
  DRAFT: { bg: '#F1F5F9', fg: '#64748B', label: 'Draft' },
  SUBMITTED: { bg: '#EEF0FF', fg: '#4338CA', label: 'Submitted' },
  APPROVED: { bg: '#E9F9EF', fg: '#15803D', label: 'Approved' },
  REJECTED: { bg: '#FDECEC', fg: '#B91C1C', label: 'Rejected' },
};

const StatusChip = ({ status, note }: { status: TimesheetStatus; note?: string | null }) => {
  const s = statusStyles[status];
  const pill = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600, bgcolor: s.bg, color: s.fg }}>
      {s.label}
    </Box>
  );
  if (status === 'REJECTED' && note) return <Tooltip title={note} arrow>{pill}</Tooltip>;
  return pill;
};

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card sx={{ flex: '1 1 150px', minWidth: 150 }}>
    <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

interface GridRow { project: ProjectRef; cells: Record<string, TimeEntry[]>; totalMinutes: number; }

const cellKeyOf = (projectId: string, dk: string) => `${projectId}|${dk}`;

const MyTimesheetPage = () => {
  const dispatch = useAppDispatch();
  const { isAdmin } = useAuth();
  const { week, weekLoading } = useAppSelector((s) => s.timesheet);

  const initial = isoWeekOf(new Date());
  const [ref, setRef] = useState<{ year: number; week: number }>(initial);
  const [extraProjects, setExtraProjects] = useState<ProjectRef[]>([]);

  // Cell editing
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [cellFeedback, setCellFeedback] = useState<Record<string, 'saving' | 'saved'>>({});
  const feedbackTimers = useRef<Record<string, number>>({});

  // Dialogs
  const [entryDialog, setEntryDialog] = useState<{ open: boolean; entry?: TimeEntry | null; defaultDate?: string; defaultProjectId?: string }>({ open: false });
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [multiCell, setMultiCell] = useState<{ projectName: string; projectId: string; dk: string } | null>(null);
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  // Add-row picker
  const [addRowAnchor, setAddRowAnchor] = useState<null | HTMLElement>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectRef[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null);

  const loadWeek = useCallback(() => {
    dispatch(fetchWeekThunk({ isoYear: ref.year, isoWeek: ref.week }));
  }, [dispatch, ref]);

  useEffect(() => { loadWeek(); }, [loadWeek]);
  useEffect(() => { setExtraProjects([]); setEditingCell(null); }, [ref]);

  // Always derive the columns locally; only trust the payload once it belongs
  // to the currently selected week (avoids flashing last week's data mid-navigation).
  const dates: string[] = weekDates(ref.year, ref.week).map(dateKey);
  const weekMatches = !!week && week.dates?.length === 7 && dateKey(week.dates[0]) === dates[0];
  const envelope = weekMatches ? week.week : null;
  const status: TimesheetStatus = envelope?.status ?? 'DRAFT';
  const locked = status === 'SUBMITTED' || status === 'APPROVED';
  const entries = weekMatches ? week.entries : [];
  const holidays = weekMatches ? week.holidays : [];
  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));
  const holidayName = (dk: string) => holidays.find((h) => dateKey(h.date) === dk)?.name;

  // Daily-lock rule: only "today" (ORG timezone, from the server payload) is
  // editable. Exceptions: a REJECTED week (fix window) and admins.
  const todayKey = weekMatches && week.today ? dateKey(week.today) : dateKey(new Date());
  // AI-only mode (server-enforced, admins exempt): no manual add/edit/submit at
  // all — the connected AI assistant is the only write path. Treat as read-only
  // while the payload loads so controls never flash in.
  const manualAllowed = weekMatches ? week.manualEntryEnabled : false;
  const canEditDay = (dk: string) => manualAllowed && !locked && (isAdmin || status === 'REJECTED' || dk === todayKey);
  const weekHasEditableDay = manualAllowed && !locked && (isAdmin || status === 'REJECTED' || dates.includes(todayKey));
  const lockReason = (dk: string) =>
    !manualAllowed
      ? 'Entries are logged by your connected AI assistant — manual editing is off (see AI Integrations)'
      : dk > todayKey ? "Future days can't be filled in advance" : 'This day is locked — time is logged the same day (locks 11:59 PM)';

  // ---- Build grid rows ----
  const rowMap = new Map<string, GridRow>();
  for (const e of entries) {
    const row = rowMap.get(e.projectId) ?? { project: e.project, cells: {}, totalMinutes: 0 };
    const dk = dateKey(e.date);
    (row.cells[dk] = row.cells[dk] ?? []).push(e);
    row.totalMinutes += e.minutes;
    rowMap.set(e.projectId, row);
  }
  for (const p of extraProjects) {
    if (!rowMap.has(p.id)) rowMap.set(p.id, { project: p, cells: {}, totalMinutes: 0 });
  }
  const rows = [...rowMap.values()].sort((a, b) => a.project.name.localeCompare(b.project.name));

  const dayTotals = dates.map((dk) => entries.filter((e) => dateKey(e.date) === dk).reduce((s, e) => s + e.minutes, 0));
  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);
  const billablePct = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  // ---- Cell editing ----
  const flashFeedback = (key: string, state: 'saving' | 'saved' | null) => {
    setCellFeedback((prev) => {
      const next = { ...prev };
      if (state) next[key] = state; else delete next[key];
      return next;
    });
    if (state === 'saved') {
      window.clearTimeout(feedbackTimers.current[key]);
      feedbackTimers.current[key] = window.setTimeout(() => flashFeedback(key, null), 1500);
    }
  };

  const beginEdit = (row: GridRow, dk: string) => {
    const cellEntries = row.cells[dk] ?? [];
    if (!canEditDay(dk)) {
      // Read-only cell: still open the entries dialog (view-only) so the
      // descriptions — especially detailed AI summaries — stay readable.
      if (cellEntries.length > 0) setMultiCell({ projectId: row.project.id, projectName: row.project.name, dk });
      return;
    }
    if (cellEntries.length > 1) {
      setMultiCell({ projectId: row.project.id, projectName: row.project.name, dk });
      return;
    }
    const sum = cellEntries.reduce((s, e) => s + e.minutes, 0);
    setEditingCell(cellKeyOf(row.project.id, dk));
    setEditValue(sum > 0 ? minutesToHM(sum) : '');
  };

  const commitEdit = async (row: GridRow, dk: string) => {
    const key = cellKeyOf(row.project.id, dk);
    setEditingCell(null);
    const cellEntries = row.cells[dk] ?? [];
    const existing = cellEntries.length === 1 ? cellEntries[0] : null;
    const prevMinutes = cellEntries.reduce((s, e) => s + e.minutes, 0);
    const parsed = parseDuration(editValue);

    if (Number.isNaN(parsed)) {
      setSnack({ msg: `Couldn't read "${editValue}" — try formats like 5:30, 5.5 or 90m`, severity: 'error' });
      return; // revert: nothing saved, grid still shows the old value
    }
    if (parsed === null) {
      if (!existing) return; // empty → empty: nothing to do
      flashFeedback(key, 'saving');
      const result = await dispatch(deleteEntryThunk({ id: existing.id, week: { isoYear: ref.year, isoWeek: ref.week } }));
      if (deleteEntryThunk.fulfilled.match(result)) flashFeedback(key, 'saved');
      else { flashFeedback(key, null); setSnack({ msg: (result.payload as string) || 'Delete failed', severity: 'error' }); }
      return;
    }
    if (parsed === prevMinutes) return; // unchanged
    const { hours, minutes } = splitMinutes(parsed);
    flashFeedback(key, 'saving');
    const weekRef = { isoYear: ref.year, isoWeek: ref.week };
    const result = existing
      ? await dispatch(updateEntryThunk({ id: existing.id, payload: { hours, minutes }, week: weekRef }))
      : await dispatch(createEntryThunk({ payload: { projectId: row.project.id, date: dk, hours, minutes, billable: true }, week: weekRef }));
    if (createEntryThunk.fulfilled.match(result) || updateEntryThunk.fulfilled.match(result)) {
      flashFeedback(key, 'saved');
    } else {
      flashFeedback(key, null);
      setSnack({ msg: (result.payload as string) || 'Save failed — the cell was reverted', severity: 'error' });
    }
  };

  // ---- Entry dialog save (create or edit) ----
  const handleDialogSave = async (payload: CreateTimeEntryPayload) => {
    setEntrySaving(true);
    setEntryError(null);
    const weekRef = { isoYear: ref.year, isoWeek: ref.week };
    const result = entryDialog.entry
      ? await dispatch(updateEntryThunk({ id: entryDialog.entry.id, payload, week: weekRef }))
      : await dispatch(createEntryThunk({ payload, week: weekRef }));
    setEntrySaving(false);
    if (createEntryThunk.fulfilled.match(result) || updateEntryThunk.fulfilled.match(result)) {
      setEntryDialog({ open: false });
      setSnack({ msg: entryDialog.entry ? 'Entry updated' : 'Entry added', severity: 'success' });
    } else {
      setEntryError((result.payload as string) || 'Could not save the entry');
    }
  };

  const handleDeleteEntry = async (entry: TimeEntry) => {
    const result = await dispatch(deleteEntryThunk({ id: entry.id, week: { isoYear: ref.year, isoWeek: ref.week } }));
    if (deleteEntryThunk.rejected.match(result)) {
      setSnack({ msg: (result.payload as string) || 'Delete failed', severity: 'error' });
    }
  };

  // ---- Submit week ----
  const doSubmit = async () => {
    setActionBusy(true);
    const result = await dispatch(submitWeekThunk({ isoYear: ref.year, isoWeek: ref.week }));
    setActionBusy(false);
    setSubmitConfirm(false);
    if (submitWeekThunk.fulfilled.match(result)) {
      setSnack({ msg: 'Timesheet submitted for approval', severity: 'success' });
    } else {
      setSnack({ msg: (result.payload as string) || 'Submit failed', severity: 'error' });
    }
  };
  const handleSubmitClick = () => {
    if (totalMinutes < WEEKLY_TARGET_MINUTES) setSubmitConfirm(true);
    else doSubmit();
  };

  // ---- Add row ----
  const openAddRow = (e: React.MouseEvent<HTMLElement>) => {
    setAddRowAnchor(e.currentTarget);
    if (projectOptions.length === 0) {
      setOptionsLoading(true);
      timesheetService.getProjectOptions()
        .then(setProjectOptions)
        .catch(() => setProjectOptions([]))
        .finally(() => setOptionsLoading(false));
    }
  };
  const availableRowOptions = projectOptions.filter((p) => !rowMap.has(p.id));

  const multiEntries = multiCell
    ? entries.filter((e) => e.projectId === multiCell.projectId && dateKey(e.date) === multiCell.dk)
    : [];
  const multiCellEditable = multiCell ? canEditDay(multiCell.dk) : false;
  useEffect(() => {
    // Close the dialog automatically once its cell has ≤1 entry left — but only
    // in edit mode (view-only cells legitimately open it with a single entry).
    if (multiCell && multiCellEditable && multiEntries.length <= 1) setMultiCell(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiEntries.length]);

  const headCellSx = { py: 1.25, px: 1.5, textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '1px solid #E9EBF2', whiteSpace: 'nowrap' } as const;
  const bodyCellSx = { py: 0.75, px: 0.75, textAlign: 'center', fontSize: '0.875rem', borderBottom: '1px solid #EEF0F5' } as const;

  return (
    <Box>
      <PageHeader title="My Timesheet" subtitle={manualAllowed
        ? 'Log your hours, track the week and submit it for approval'
        : 'Your connected AI assistant logs your work here — ask it to "fill my timesheet" at the end of the day'} />

      {/* Week navigator + actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={() => setRef(shiftIsoWeek(ref.year, ref.week, -1))} sx={{ border: '1px solid #E9EBF2', borderRadius: '8px' }}>
            <PrevIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', minWidth: 200, textAlign: 'center' }}>
            {weekLabel(ref.year, ref.week)}
          </Typography>
          <IconButton size="small" onClick={() => setRef(shiftIsoWeek(ref.year, ref.week, 1))} sx={{ border: '1px solid #E9EBF2', borderRadius: '8px' }}>
            <NextIcon fontSize="small" />
          </IconButton>
          <Button size="small" onClick={() => setRef(isoWeekOf(new Date()))} sx={{ ml: 0.5, textTransform: 'none' }}>Today</Button>
        </Box>
        <StatusChip status={status} note={envelope?.reviewNote} />
        {locked && <LockIcon sx={{ fontSize: 18, color: '#94A3B8' }} />}
        <Tooltip title="Time is logged the same day it was worked — each day locks at 11:59 PM and the week auto-submits Monday morning." arrow>
          <Chip icon={<TodayIcon sx={{ fontSize: 15 }} />} label="Same-day entry" size="small" sx={{ bgcolor: '#FEF3E2', color: '#B45309', fontWeight: 600, fontSize: '0.72rem' }} />
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        {manualAllowed && (
          <>
            <Tooltip title={weekHasEditableDay ? '' : 'This week is locked — time can only be logged on the current day'} arrow disableHoverListener={weekHasEditableDay}>
              <span>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} disabled={!weekHasEditableDay} onClick={() => setEntryDialog({ open: true, defaultDate: dates.includes(todayKey) ? todayKey : dates[0] })} sx={{ textTransform: 'none' }}>
                  Add entry
                </Button>
              </span>
            </Tooltip>
            <Button size="small" variant="contained" startIcon={<SendIcon />} disabled={entries.length === 0 || locked || actionBusy} onClick={handleSubmitClick} sx={{ textTransform: 'none' }}>
              Submit week
            </Button>
          </>
        )}
      </Box>

      {status === 'REJECTED' && envelope?.reviewNote && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          <strong>This week was rejected{envelope.reviewedBy?.name ? ` by ${envelope.reviewedBy.name}` : ''}:</strong> {envelope.reviewNote}
          {manualAllowed
            ? ' — fix the entries below and resubmit.'
            : ' — ask your AI assistant to log the corrected time for the affected days.'}
        </Alert>
      )}

      {/* Stat strip */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard label="This week" value={minutesToPretty(totalMinutes)} sub={`of ${WEEKLY_TARGET_MINUTES / 60}h target`} />
        <StatCard label="Billable" value={`${billablePct}%`} sub={minutesToPretty(billableMinutes)} />
        <StatCard label="Daily average" value={minutesToPretty(Math.round(totalMinutes / 7))} sub="across 7 days" />
        <StatCard label="Entries" value={String(entries.length)} sub={`${rows.length} project${rows.length === 1 ? '' : 's'}`} />
      </Box>

      {/* Week grid */}
      <Card sx={{ overflowX: 'auto', p: 0, mb: 2 }}>
        {weekLoading && !weekMatches ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 900 }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ ...headCellSx, textAlign: 'left', px: 2, width: 190 }}>
                  Project {locked && <LockIcon sx={{ fontSize: 12, verticalAlign: 'text-top', ml: 0.5 }} />}
                </Box>
                {dates.map((dk, i) => {
                  const d = dayjs(dk);
                  const isHoliday = holidaySet.has(dk);
                  const isToday = dk === dateKey(new Date());
                  return (
                    <Box component="th" key={dk} sx={{ ...headCellSx, ...(isToday ? { color: INDIGO } : {}) }}>
                      <Tooltip title={isHoliday ? (holidayName(dk) || 'Holiday') : ''} arrow disableHoverListener={!isHoliday}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]} {d.format('D')}
                          {isHoliday && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#EF4444' }} />}
                        </Box>
                      </Tooltip>
                    </Box>
                  );
                })}
                <Box component="th" sx={{ ...headCellSx, width: 80 }}>Total</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {rows.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={9} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">
                      {manualAllowed
                        ? 'No time logged this week — start the timer or add your first entry.'
                        : 'No time logged this week — ask your connected AI assistant to "fill my timesheet" at the end of the day.'}
                    </Typography>
                  </Box>
                </Box>
              ) : rows.map((row) => (
                <Box component="tr" key={row.project.id} sx={{ '&:hover': { bgcolor: '#F7F8FD' } }}>
                  <Box component="td" sx={{ ...bodyCellSx, textAlign: 'left', px: 2 }}>
                    <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.85rem' }} title={row.project.name}>{row.project.name}</Typography>
                  </Box>
                  {dates.map((dk) => {
                    const key = cellKeyOf(row.project.id, dk);
                    const cellEntries = row.cells[dk] ?? [];
                    const sum = cellEntries.reduce((s, e) => s + e.minutes, 0);
                    const feedback = cellFeedback[key];
                    const editable = canEditDay(dk);
                    if (editingCell === key) {
                      return (
                        <Box component="td" key={dk} sx={bodyCellSx}>
                          <TextField
                            size="small" autoFocus value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(row, dk)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            inputProps={{ style: { textAlign: 'center', padding: '6px 4px', fontSize: '0.85rem' } }}
                            sx={{ width: 72 }}
                            placeholder="h:mm"
                          />
                        </Box>
                      );
                    }
                    const clickable = editable || cellEntries.length > 0; // read-only cells with entries open the view dialog
                    return (
                      <Box component="td" key={dk} sx={{ ...bodyCellSx, cursor: clickable ? 'pointer' : 'default', ...(editable ? {} : { opacity: 0.55 }) }} onClick={() => beginEdit(row, dk)} title={editable || locked ? undefined : lockReason(dk)}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minHeight: 32, px: 1, borderRadius: '8px', '&:hover': clickable ? { bgcolor: '#EEF0FF' } : {} }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: sum > 0 ? 600 : 400, color: sum > 0 ? 'text.primary' : '#CBD5E1', fontVariantNumeric: 'tabular-nums' }}>
                            {sum > 0 ? minutesToHM(sum) : '–'}
                          </Typography>
                          {cellEntries.length > 1 && (
                            <Typography sx={{ fontSize: '0.65rem', color: '#4338CA', bgcolor: '#EEF0FF', px: 0.5, borderRadius: 1, fontWeight: 700 }}>
                              {cellEntries.length}
                            </Typography>
                          )}
                          {feedback === 'saving' && <CircularProgress size={12} sx={{ color: INDIGO }} />}
                          {feedback === 'saved' && <CheckIcon sx={{ fontSize: 14, color: '#22C55E' }} />}
                        </Box>
                      </Box>
                    );
                  })}
                  <Box component="td" sx={{ ...bodyCellSx, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {row.totalMinutes > 0 ? minutesToHM(row.totalMinutes) : '–'}
                  </Box>
                </Box>
              ))}
            </Box>
            {rows.length > 0 && (
              <Box component="tfoot">
                <Box component="tr" sx={{ bgcolor: '#F8FAFC' }}>
                  <Box component="td" sx={{ ...bodyCellSx, textAlign: 'left', px: 2, fontWeight: 700, fontSize: '0.78rem', color: 'text.secondary', borderBottom: 'none' }}>
                    Day total
                  </Box>
                  {dayTotals.map((m, i) => (
                    <Box component="td" key={dates[i]} sx={{ ...bodyCellSx, fontWeight: 600, color: m > 0 ? 'text.primary' : '#CBD5E1', borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>
                      {m > 0 ? minutesToHM(m) : '–'}
                    </Box>
                  ))}
                  <Box component="td" sx={{ ...bodyCellSx, fontWeight: 800, color: INDIGO, borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>
                    {minutesToHM(totalMinutes)}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {weekHasEditableDay && (
        <Button size="small" startIcon={<AddIcon />} onClick={openAddRow} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Add row
        </Button>
      )}

      {/* Add-row project picker */}
      <Popover
        open={Boolean(addRowAnchor)}
        anchorEl={addRowAnchor}
        onClose={() => setAddRowAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 1.5, width: 280 } } }}
      >
        <Autocomplete
          size="small"
          options={availableRowOptions}
          loading={optionsLoading}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          onChange={(_, v) => {
            if (v) { setExtraProjects((prev) => [...prev, v]); setAddRowAnchor(null); }
          }}
          renderInput={(params) => <TextField {...params} label="Project" autoFocus />}
          noOptionsText={optionsLoading ? 'Loading…' : 'No more projects'}
        />
      </Popover>

      {/* Add / edit entry dialog */}
      <TimeEntryDialog
        open={entryDialog.open}
        entry={entryDialog.entry}
        defaultDate={entryDialog.defaultDate}
        defaultProjectId={entryDialog.defaultProjectId}
        dateLocked={!isAdmin && status !== 'REJECTED'}
        saving={entrySaving}
        errorMsg={entryError}
        onSave={handleDialogSave}
        onClose={() => { setEntryDialog({ open: false }); setEntryError(null); }}
      />

      {/* Multi-entry cell dialog */}
      <Dialog open={!!multiCell} onClose={() => setMultiCell(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {multiCell?.projectName} · {multiCell ? dayjs(multiCell.dk).format('ddd, MMM D') : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={1}>
            {multiCellEditable
              ? 'This cell has several entries — edit or delete them individually.'
              : 'Logged entries for this day (read-only).'}
          </Typography>
          <List dense>
            {multiEntries.map((e) => (
              <ListItem
                key={e.id}
                secondaryAction={multiCellEditable ? (
                  <Box>
                    <IconButton size="small" onClick={() => { setMultiCell(null); setEntryDialog({ open: true, entry: e }); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleDeleteEntry(e)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : undefined}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(e.minutes)}</Typography>
                      {e.billable && <Chip label="Billable" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#E9F9EF', color: '#15803D' }} />}
                      {e.source === 'AI_AGENT' && <Chip label="AI" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#EEF0FF', color: '#4338CA', border: '1px solid #DFE2FA' }} />}
                      {e.source === 'TIMER' && <Chip label="Timer" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                    </Box>
                  }
                  secondary={e.description || 'No description'}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMultiCell(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Sub-target submit confirm */}
      <ConfirmDialog
        open={submitConfirm}
        title="Submit Week"
        message={`You've logged ${minutesToPretty(totalMinutes)} of ${WEEKLY_TARGET_MINUTES / 60}h — submit anyway? Once submitted, the week locks until it is reviewed.`}
        confirmLabel="Submit anyway"
        confirmColor="primary"
        loading={actionBusy}
        onConfirm={doSubmit}
        onCancel={() => setSubmitConfirm(false)}
      />

      <Snackbar
        open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity || 'info'} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MyTimesheetPage;
