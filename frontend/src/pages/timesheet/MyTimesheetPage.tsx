import { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, IconButton, Button, Tooltip, Alert, Snackbar,
  TextField, CircularProgress, Chip,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
  Add as AddIcon, EditOutlined as EditIcon, DeleteOutline as DeleteIcon,
  TodayOutlined as TodayIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import PageHeader from '../../components/common/PageHeader';
import TimeEntryDialog from '../../components/timesheet/TimeEntryDialog';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchWeekThunk, createEntryThunk, updateEntryThunk, deleteEntryThunk,
} from '../../store/slices/timesheetSlice';
import { TimeEntry, TimesheetStatus, CreateTimeEntryPayload } from '../../types/timesheet.types';
import { isoWeekOf, weekDates, dateKey, minutesToHM, minutesToPretty } from '../../utils/timeFormat';

const INDIGO = '#4F46E5';
const WEEKLY_TARGET_MINUTES = 40 * 60;

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

const MyTimesheetPage = () => {
  const dispatch = useAppDispatch();
  const { isAdmin } = useAuth();
  const { week, weekLoading } = useAppSelector((s) => s.timesheet);

  // Daily view: one selected date; the week payload behind it powers status,
  // holidays, org-today and the weekly total.
  const [selected, setSelected] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const [entryDialog, setEntryDialog] = useState<{ open: boolean; entry?: TimeEntry | null }>({ open: false });
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null);

  const wkRef = isoWeekOf(dayjs(selected).toDate());
  const loadWeek = useCallback(() => {
    dispatch(fetchWeekThunk({ isoYear: wkRef.year, isoWeek: wkRef.week }));
  }, [dispatch, wkRef.year, wkRef.week]);
  useEffect(() => { loadWeek(); }, [loadWeek]);

  // Only trust the payload once it belongs to the selected date's week.
  const wDates = weekDates(wkRef.year, wkRef.week).map(dateKey);
  const weekMatches = !!week && week.dates?.length === 7 && dateKey(week.dates[0]) === wDates[0];
  const envelope = weekMatches ? week.week : null;
  const status: TimesheetStatus = envelope?.status ?? 'DRAFT';
  const locked = status === 'SUBMITTED' || status === 'APPROVED';
  const holidays = weekMatches ? week.holidays : [];
  const holiday = holidays.find((h) => dateKey(h.date) === selected);
  const todayKey = weekMatches && week.today ? dateKey(week.today) : dayjs().format('YYYY-MM-DD');
  // AI-only mode (server-enforced, admins exempt): treat as read-only while
  // loading so controls never flash in.
  const manualAllowed = weekMatches ? week.manualEntryEnabled : false;
  const canEdit = manualAllowed && !locked && (isAdmin || status === 'REJECTED' || selected === todayKey);

  const weekEntries = weekMatches ? week.entries : [];
  const dayEntries = weekEntries
    .filter((e) => dateKey(e.date) === selected)
    .sort((a, b) => a.project.name.localeCompare(b.project.name) || a.createdAt.localeCompare(b.createdAt));
  const dayTotal = dayEntries.reduce((s, e) => s + e.minutes, 0);
  const dayBillable = dayEntries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);
  const weekTotal = weekEntries.reduce((s, e) => s + e.minutes, 0);
  const dayProjects = new Set(dayEntries.map((e) => e.projectId)).size;

  const shiftDay = (delta: number) => setSelected(dayjs(selected).add(delta, 'day').format('YYYY-MM-DD'));

  const handleDialogSave = async (payload: CreateTimeEntryPayload) => {
    setEntrySaving(true);
    setEntryError(null);
    const weekRef = { isoYear: wkRef.year, isoWeek: wkRef.week };
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
    const result = await dispatch(deleteEntryThunk({ id: entry.id, week: { isoYear: wkRef.year, isoWeek: wkRef.week } }));
    if (deleteEntryThunk.rejected.match(result)) {
      setSnack({ msg: (result.payload as string) || 'Delete failed', severity: 'error' });
    } else {
      setSnack({ msg: 'Entry deleted', severity: 'success' });
    }
  };

  const isToday = selected === todayKey;

  return (
    <Box>
      <PageHeader title="My Timesheet" subtitle={manualAllowed
        ? 'Log your hours day by day'
        : 'Your connected AI assistant logs your work here — ask it to "fill my timesheet" at the end of the day'} />

      {/* Day navigator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={() => shiftDay(-1)} sx={{ border: '1px solid #E9EBF2', borderRadius: '8px' }}>
            <PrevIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', minWidth: 210, textAlign: 'center', color: isToday ? INDIGO : 'text.primary' }}>
            {dayjs(selected).format('dddd, MMM D, YYYY')}{isToday ? ' · Today' : ''}
          </Typography>
          <IconButton size="small" onClick={() => shiftDay(1)} sx={{ border: '1px solid #E9EBF2', borderRadius: '8px' }}>
            <NextIcon fontSize="small" />
          </IconButton>
          <Button size="small" onClick={() => setSelected(dayjs().format('YYYY-MM-DD'))} sx={{ ml: 0.5, textTransform: 'none' }}>Today</Button>
          <TextField
            size="small" type="date" value={selected}
            onChange={(e) => { if (e.target.value) setSelected(e.target.value); }}
            sx={{ ml: 0.5, width: 165, '& input': { py: 0.75, fontSize: '0.85rem' } }}
          />
        </Box>
        <StatusChip status={status} note={envelope?.reviewNote} />
        {holiday && <Chip label={`Holiday: ${holiday.name}`} size="small" sx={{ bgcolor: '#FDECEC', color: '#B91C1C', fontWeight: 600, fontSize: '0.72rem' }} />}
        <Tooltip title="Time is logged the same day it was worked — each day locks at 11:59 PM and the week auto-submits Monday morning." arrow>
          <Chip icon={<TodayIcon sx={{ fontSize: 15 }} />} label="Same-day entry" size="small" sx={{ bgcolor: '#FEF3E2', color: '#B45309', fontWeight: 600, fontSize: '0.72rem' }} />
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        {canEdit && (
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setEntryDialog({ open: true })} sx={{ textTransform: 'none' }}>
            Add entry
          </Button>
        )}
      </Box>

      {/* Stat strip */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard label="This day" value={minutesToPretty(dayTotal)} sub={`${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'} · ${dayProjects} project${dayProjects === 1 ? '' : 's'}`} />
        <StatCard label="Billable" value={dayTotal > 0 ? `${Math.round((dayBillable / dayTotal) * 100)}%` : '–'} sub={minutesToPretty(dayBillable)} />
        <StatCard label="This week" value={minutesToPretty(weekTotal)} sub={`of ${WEEKLY_TARGET_MINUTES / 60}h target`} />
      </Box>

      {/* Day entries */}
      <Card sx={{ p: 0 }}>
        {weekLoading && !weekMatches ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : dayEntries.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              {manualAllowed
                ? 'No time logged for this day yet.'
                : isToday
                  ? 'No time logged today — ask your connected AI assistant to "fill my timesheet" at the end of the day.'
                  : 'No time was logged on this day.'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {dayEntries.map((e, i) => (
              <Box key={e.id} sx={{ px: 2.5, py: 2, borderBottom: i < dayEntries.length - 1 ? '1px solid #EEF0F5' : 'none', '&:hover': { bgcolor: '#F7F8FD' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{e.project.name}</Typography>
                  {e.source === 'AI_AGENT' && <Chip label="AI" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#EEF0FF', color: '#4338CA', border: '1px solid #DFE2FA' }} />}
                  {e.source === 'TIMER' && <Chip label="Timer" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                  {e.billable && <Chip label="Billable" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#E9F9EF', color: '#15803D' }} />}
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: INDIGO }}>{minutesToHM(e.minutes)}</Typography>
                  {canEdit && (
                    <Box>
                      <IconButton size="small" onClick={() => setEntryDialog({ open: true, entry: e })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleDeleteEntry(e)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, whiteSpace: 'pre-line' }}>
                  {e.description || 'No description'}
                </Typography>
              </Box>
            ))}
            {/* Day total footer */}
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #EEF0F5' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day total</Typography>
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontWeight: 800, color: INDIGO, fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(dayTotal)}</Typography>
            </Box>
          </Box>
        )}
      </Card>

      {/* Add / edit entry dialog (manual mode + admin corrections only) */}
      <TimeEntryDialog
        open={entryDialog.open}
        entry={entryDialog.entry}
        defaultDate={selected}
        dateLocked={!isAdmin && status !== 'REJECTED'}
        saving={entrySaving}
        errorMsg={entryError}
        onSave={handleDialogSave}
        onClose={() => { setEntryDialog({ open: false }); setEntryError(null); }}
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
