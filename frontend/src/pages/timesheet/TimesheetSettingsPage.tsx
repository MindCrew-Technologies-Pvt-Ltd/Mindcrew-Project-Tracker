import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Switch, FormControlLabel,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip, Snackbar, Alert,
  CircularProgress, Grid, Avatar, InputAdornment,
} from '@mui/material';
import { DeleteOutline as DeleteIcon, Add as AddIcon, Save as SaveIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import PageHeader from '../../components/common/PageHeader';
import timesheetService from '../../services/timesheetService';
import { TimesheetSettings, Holiday, RateUser } from '../../types/timesheet.types';

const TimesheetSettingsPage = () => {
  const [settings, setSettings] = useState<TimesheetSettings | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [rates, setRates] = useState<RateUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [targetInput, setTargetInput] = useState('40');
  const [savingTarget, setSavingTarget] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [savingRate, setSavingRate] = useState<string | null>(null);

  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const fail = (err: any, fallback: string) =>
    setSnack({ msg: err.response?.data?.message || fallback, severity: 'error' });

  useEffect(() => {
    Promise.all([
      timesheetService.getSettings(),
      timesheetService.listHolidays(),
      timesheetService.listRates(),
    ]).then(([s, h, r]) => {
      const st = s.data?.data as TimesheetSettings;
      setSettings(st);
      setTargetInput(String(st?.weeklyTargetHours ?? 40));
      setHolidays(h.data?.data || []);
      const users = (r.data?.data || []) as RateUser[];
      setRates(users);
      setRateInputs(Object.fromEntries(users.map((u) => [u.id, u.billableRate ? String(u.billableRate.hourlyRate) : ''])));
    }).catch((err) => fail(err, 'Failed to load timesheet settings'))
      .finally(() => setLoading(false));
  }, []);

  const saveTarget = async () => {
    const value = Number(targetInput);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      setSnack({ msg: 'Weekly target must be a whole number between 1 and 100', severity: 'error' });
      return;
    }
    setSavingTarget(true);
    try {
      const res = await timesheetService.updateSettings({ weeklyTargetHours: value });
      setSettings(res.data?.data);
      setSnack({ msg: 'Weekly target saved', severity: 'success' });
    } catch (err: any) { fail(err, 'Could not save the target'); }
    setSavingTarget(false);
  };

  const saveReminder = async (patch: { reminderEnabled?: boolean; reminderDay?: number; reminderHour?: number }) => {
    if (!settings) return;
    setSavingReminder(true);
    // Optimistic update so the switch/selects feel instant.
    setSettings({ ...settings, ...patch });
    try {
      const res = await timesheetService.updateSettings(patch);
      setSettings(res.data?.data);
    } catch (err: any) {
      setSettings(settings); // revert
      fail(err, 'Could not save the reminder settings');
    }
    setSavingReminder(false);
  };

  const saveMode = async (manualEntryEnabled: boolean) => {
    if (!settings) return;
    setSavingMode(true);
    setSettings({ ...settings, manualEntryEnabled }); // optimistic
    try {
      const res = await timesheetService.updateSettings({ manualEntryEnabled });
      setSettings(res.data?.data);
      setSnack({
        msg: manualEntryEnabled
          ? 'Manual entry enabled — people can add and edit their own time'
          : 'AI-only mode on — time is logged exclusively by connected AI assistants',
        severity: 'success',
      });
    } catch (err: any) {
      setSettings(settings); // revert
      fail(err, 'Could not save the entry mode');
    }
    setSavingMode(false);
  };

  const saveWorkdayStart = async (workdayStartHour: number) => {
    if (!settings) return;
    setSavingMode(true);
    setSettings({ ...settings, workdayStartHour }); // optimistic
    try {
      const res = await timesheetService.updateSettings({ workdayStartHour });
      setSettings(res.data?.data);
      setSnack({ msg: `Workday start saved — today's total is now capped from ${String(workdayStartHour).padStart(2, '0')}:00`, severity: 'success' });
    } catch (err: any) {
      setSettings(settings); // revert
      fail(err, 'Could not save the workday start');
    }
    setSavingMode(false);
  };

  const addHoliday = async () => {
    if (!holidayDate || holidayName.trim().length < 2) {
      setSnack({ msg: 'Pick a date and give the holiday a name (min 2 characters)', severity: 'error' });
      return;
    }
    setAddingHoliday(true);
    try {
      await timesheetService.addHoliday({ date: holidayDate, name: holidayName.trim() });
      const res = await timesheetService.listHolidays();
      setHolidays(res.data?.data || []);
      setHolidayDate('');
      setHolidayName('');
      setSnack({ msg: 'Holiday added', severity: 'success' });
    } catch (err: any) { fail(err, 'Could not add the holiday'); }
    setAddingHoliday(false);
  };

  const removeHoliday = async (id: string) => {
    try {
      await timesheetService.deleteHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      setSnack({ msg: 'Holiday removed', severity: 'success' });
    } catch (err: any) { fail(err, 'Could not remove the holiday'); }
  };

  const saveRate = async (user: RateUser) => {
    const raw = rateInputs[user.id] ?? '';
    const value = Number(raw);
    if (raw.trim() === '' || !isFinite(value) || value < 0) {
      setSnack({ msg: 'Enter a valid non-negative rate', severity: 'error' });
      return;
    }
    setSavingRate(user.id);
    try {
      const res = await timesheetService.setRate(user.id, { hourlyRate: value });
      setRates((prev) => prev.map((u) => (u.id === user.id ? { ...u, billableRate: res.data?.data } : u)));
      setSnack({ msg: `Rate saved for ${user.name}`, severity: 'success' });
    } catch (err: any) { fail(err, 'Could not save the rate'); }
    setSavingRate(null);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader title="Timesheet Settings" subtitle="Weekly target, reminders, holidays and billable rates" />

      <Grid container spacing={3}>
        {/* Weekly target */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Weekly target</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                The soft target used for the submit nudge and utilization reports.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                  size="small" type="number" label="Hours per week" value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  inputProps={{ min: 1, max: 100 }} sx={{ width: 160 }}
                />
                <Button variant="contained" size="small" startIcon={<SaveIcon />} disabled={savingTarget} onClick={saveTarget} sx={{ textTransform: 'none' }}>
                  Save
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily reminder */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Daily reminder</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Anyone with no time logged for the day gets an in-app nudge to say "fill my timesheet"
                before the 11:59 PM lock. Sent every day at this hour (org time); holidays are skipped.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.reminderEnabled ?? false}
                    disabled={savingReminder}
                    onChange={(e) => saveReminder({ reminderEnabled: e.target.checked })}
                  />
                }
                label="Send daily reminders"
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <FormControl size="small" sx={{ minWidth: 120 }} disabled={!settings?.reminderEnabled || savingReminder}>
                  <InputLabel>Hour</InputLabel>
                  <Select
                    value={settings?.reminderHour ?? 19} label="Hour"
                    onChange={(e) => saveReminder({ reminderHour: Number(e.target.value) })}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Entry mode (AI-only vs manual) */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Entry mode</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                When manual entry is off (AI-only mode), time is logged exclusively by each person's
                connected AI assistant — the Add entry, timer and Submit week controls disappear and the
                server rejects manual writes. Admins can always edit for corrections.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.manualEntryEnabled ?? false}
                    disabled={savingMode}
                    onChange={(e) => saveMode(e.target.checked)}
                  />
                }
                label="Allow manual time entry"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Workday start (anti-overcount cap) */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Workday start</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Nobody's logged total for today can exceed the time elapsed since this hour (org time).
                With an 08:00 start, at 4 PM at most 8h can be on the books — a full day can no longer
                appear at mid-day. Admin corrections are exempt.
              </Typography>
              <FormControl size="small" sx={{ minWidth: 140 }} disabled={savingMode}>
                <InputLabel>Starts at</InputLabel>
                <Select
                  value={settings?.workdayStartHour ?? 8} label="Starts at"
                  onChange={(e) => saveWorkdayStart(Number(e.target.value))}
                >
                  {Array.from({ length: 13 }, (_, h) => (
                    <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Holidays */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Holidays</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Marked with a red dot on the weekly grid and excluded from missing-timesheet checks.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField size="small" type="date" InputLabelProps={{ shrink: true }} label="Date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} sx={{ width: 160 }} />
                <TextField size="small" label="Name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} sx={{ flex: 1, minWidth: 140 }} />
                <Button size="small" variant="outlined" startIcon={<AddIcon />} disabled={addingHoliday} onClick={addHoliday} sx={{ textTransform: 'none' }}>
                  Add
                </Button>
              </Box>
              {holidays.length === 0 ? (
                <Typography variant="body2" color="text.disabled">No holidays configured yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 260, overflowY: 'auto' }}>
                  {holidays.map((h) => (
                    <Box key={h.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.75, border: '1px solid #EEF0F5', borderRadius: '8px' }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, minWidth: 100 }}>{dayjs(h.date.slice(0, 10)).format('MMM D, YYYY')}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', flex: 1 }} noWrap>{h.name}</Typography>
                      <Tooltip title="Remove" arrow>
                        <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => removeHoliday(h.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Billable rates */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Billable rates</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Hourly rates used for the cost column in utilization reports.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 380, overflowY: 'auto' }}>
                {rates.map((u) => (
                  <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, border: '1px solid #EEF0F5', borderRadius: '10px' }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 13, background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', color: '#fff' }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</Typography>
                      <Typography noWrap sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{u.email}</Typography>
                    </Box>
                    <TextField
                      size="small" type="number" placeholder="0"
                      value={rateInputs[u.id] ?? ''}
                      onChange={(e) => setRateInputs((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{u.billableRate?.currency || 'USD'}</InputAdornment>,
                      }}
                      inputProps={{ min: 0, style: { width: 70 } }}
                    />
                    <Button size="small" variant="outlined" disabled={savingRate === u.id} onClick={() => saveRate(u)} sx={{ textTransform: 'none' }}>
                      {savingRate === u.id ? <CircularProgress size={16} /> : 'Save'}
                    </Button>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity || 'success'} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TimesheetSettingsPage;
