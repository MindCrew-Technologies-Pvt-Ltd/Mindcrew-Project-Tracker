import { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, Typography, IconButton, Button, Tooltip, Alert, Snackbar,
  TextField, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
  CheckCircleOutline as ApproveIcon, HighlightOff as RejectIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import PageHeader from '../../components/common/PageHeader';
import timesheetService from '../../services/timesheetService';
import { DailyTimesheets, TimesheetStatus } from '../../types/timesheet.types';
import { minutesToHM, minutesToPretty, dateKey } from '../../utils/timeFormat';

const INDIGO = '#4F46E5';

const statusStyles: Record<TimesheetStatus, { bg: string; fg: string; label: string }> = {
  DRAFT: { bg: '#F1F5F9', fg: '#64748B', label: 'Pending' },
  SUBMITTED: { bg: '#EEF0FF', fg: '#4338CA', label: 'Submitted' },
  APPROVED: { bg: '#E9F9EF', fg: '#15803D', label: 'Approved' },
  REJECTED: { bg: '#FDECEC', fg: '#B91C1C', label: 'Rejected' },
};

/** Admin daily review: everyone's entries for one day, approve/reject the week. */
const DailyTimesheetsPage = () => {
  const [selected, setSelected] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState<DailyTimesheets | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // userId being acted on
  const [rejectDialog, setRejectDialog] = useState<{ userId: string; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    timesheetService.getDaily(selected)
      .then((r) => setData(r.data?.data || null))
      .catch((err) => { setData(null); setSnack({ msg: err.response?.data?.message || 'Failed to load the day', severity: 'error' }); })
      .finally(() => setLoading(false));
  }, [selected]);
  useEffect(() => { load(); }, [load]);

  const shiftDay = (delta: number) => setSelected(dayjs(selected).add(delta, 'day').format('YYYY-MM-DD'));

  const review = async (userId: string, action: 'approve' | 'reject', note?: string) => {
    if (!data) return;
    setBusy(userId);
    try {
      await timesheetService.reviewWeek({ userId, isoYear: data.isoYear, isoWeek: data.isoWeek, action, note });
      setSnack({ msg: action === 'approve' ? 'Week approved — the user has been notified' : 'Week rejected — the user has been notified', severity: 'success' });
      load();
    } catch (err: any) {
      setSnack({ msg: err.response?.data?.message || 'Action failed', severity: 'error' });
    }
    setBusy(null);
  };

  const isToday = selected === dayjs().format('YYYY-MM-DD');
  const dayTotal = (data?.rows || []).reduce((s, r) => s + r.totalMinutes, 0);

  return (
    <Box>
      <PageHeader title="Daily Timesheets" subtitle="Everything logged by the team, day by day — approve or reject with one click" />

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
        <Box sx={{ flex: 1 }} />
        {data && (
          <Typography variant="body2" color="text.secondary">
            <strong>{minutesToPretty(dayTotal)}</strong> logged by <strong>{data.rows.length}</strong> {data.rows.length === 1 ? 'person' : 'people'}
          </Typography>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : !data ? null : (
        <>
          {data.rows.length === 0 && (
            <Card sx={{ mb: 2.5 }}>
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">Nobody has logged time on this day.</Typography>
              </Box>
            </Card>
          )}

          {data.rows.map((row) => {
            const status: TimesheetStatus = row.week?.status ?? 'DRAFT';
            const s = statusStyles[status];
            return (
              <Card key={row.user.id} sx={{ p: 0, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #EEF0F5', flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{row.user.name}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{row.user.email}</Typography>
                  </Box>
                  <Tooltip title={status === 'REJECTED' && row.week?.reviewNote ? row.week.reviewNote : ''} arrow disableHoverListener={!(status === 'REJECTED' && row.week?.reviewNote)}>
                    <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 600, fontSize: '0.72rem' }} />
                  </Tooltip>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontWeight: 800, color: INDIGO, fontVariantNumeric: 'tabular-nums', mr: 1 }}>{minutesToHM(row.totalMinutes)}</Typography>
                  <Button
                    size="small" variant="outlined" color="success" startIcon={<ApproveIcon />}
                    disabled={busy === row.user.id || status === 'APPROVED'}
                    onClick={() => review(row.user.id, 'approve')}
                    sx={{ textTransform: 'none' }}
                  >
                    Approve week
                  </Button>
                  <Button
                    size="small" variant="outlined" color="error" startIcon={<RejectIcon />}
                    disabled={busy === row.user.id || status === 'REJECTED'}
                    onClick={() => { setRejectNote(''); setRejectDialog({ userId: row.user.id, name: row.user.name }); }}
                    sx={{ textTransform: 'none' }}
                  >
                    Reject
                  </Button>
                </Box>
                {row.entries.map((e, i) => (
                  <Box key={e.id} sx={{ px: 2.5, py: 1.75, borderBottom: i < row.entries.length - 1 ? '1px solid #EEF0F5' : 'none', '&:hover': { bgcolor: '#F7F8FD' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{e.project.name}</Typography>
                      {e.source === 'AI_AGENT' && <Chip label="AI" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#EEF0FF', color: '#4338CA', border: '1px solid #DFE2FA' }} />}
                      {e.source === 'TIMER' && <Chip label="Timer" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                      {e.billable && <Chip label="Billable" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#E9F9EF', color: '#15803D' }} />}
                      <Tooltip title="When this entry was created" arrow>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>logged at {dayjs(e.createdAt).format('h:mm A')}</Typography>
                      </Tooltip>
                      <Box sx={{ flex: 1 }} />
                      <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(e.minutes)}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, whiteSpace: 'pre-line' }}>
                      {e.description || 'No description'}
                    </Typography>
                  </Box>
                ))}
              </Card>
            );
          })}

          {data.missing.length > 0 && (
            <Card sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F5' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Nothing logged
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    active team members with no entries on {dayjs(dateKey(data.date)).format('MMM D')}
                  </Typography>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 2.5, py: 2 }}>
                {data.missing.map((u) => (
                  <Tooltip key={u.id} title={u.email} arrow>
                    <Chip label={u.name} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600 }} />
                  </Tooltip>
                ))}
              </Box>
            </Card>
          )}
        </>
      )}

      {/* Reject note dialog */}
      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject {rejectDialog?.name}'s week</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            The whole week (containing this day) is marked rejected. The person is notified with your note and their AI can log corrected time for the current day.
          </Typography>
          <TextField
            fullWidth multiline minRows={2} autoFocus label="Reason (required)"
            value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
          <Button
            variant="contained" color="error"
            disabled={rejectNote.trim().length < 3 || !!busy}
            onClick={() => { if (rejectDialog) { review(rejectDialog.userId, 'reject', rejectNote.trim()); setRejectDialog(null); } }}
          >
            Reject week
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity || 'success'} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DailyTimesheetsPage;
