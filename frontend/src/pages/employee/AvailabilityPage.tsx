import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Chip, Grid, Avatar, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Tabs, Tab, Divider, Stack, Tooltip, Alert, Snackbar
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  School as TrainingIcon,
  BeachAccess as LeaveIcon,
  WorkOff as BusyIcon,
  Today as TodayIcon,
  History as HistoryIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAppSelector } from '../../hooks/useAppSelector';
import availabilityService, { AvailabilityStatus, DailyAvailability } from '../../services/availabilityService';
import PageHeader from '../../components/common/PageHeader';

// ---- Status config ----
const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  FULLY_AVAILABLE:    { label: 'Fully Available',     color: '#10b981', bgColor: 'rgba(16,185,129,0.1)',  icon: <CheckIcon fontSize="small" /> },
  PARTIALLY_AVAILABLE:{ label: 'Partially Available', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)',  icon: <ScheduleIcon fontSize="small" /> },
  IN_TRAINING:        { label: 'In Training',         color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)',  icon: <TrainingIcon fontSize="small" /> },
  ON_LEAVE:           { label: 'On Leave',            color: '#f43f5e', bgColor: 'rgba(244,63,94,0.1)',   icon: <LeaveIcon fontSize="small" /> },
  BUSY:               { label: 'Busy',                color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.1)',  icon: <BusyIcon fontSize="small" /> },
};

const StatusChip = ({ status }: { status: AvailabilityStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <Chip
      icon={<Box sx={{ color: cfg.color, display: 'flex', alignItems: 'center' }}>{cfg.icon}</Box>}
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bgColor, color: cfg.color, fontWeight: 600, border: `1px solid ${cfg.color}30` }}
    />
  );
};

// ---- Employee View ----
const EmployeeView = () => {
  const [today, setToday] = useState<DailyAvailability | null>(null);
  const [history, setHistory] = useState<DailyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState('');

  const [form, setForm] = useState<{ status: AvailabilityStatus; note: string }>({
    status: 'FULLY_AVAILABLE',
    note: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, historyRes] = await Promise.all([
        availabilityService.getToday(),
        availabilityService.getMyHistory(),
      ]);
      const todayData = todayRes.data.data;
      setToday(todayData);
      setHistory(historyRes.data.data);
      if (todayData) {
        setForm({ status: todayData.status, note: todayData.note ?? '' });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await availabilityService.upsert({
        status: form.status,
        note: form.note.trim() || undefined,
      });
      setSnack("Today's update saved!");
      fetchData();
    } catch (e) { console.error(e); setSnack('Failed to save. Please try again.'); }
    setSaving(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<TodayIcon fontSize="small" />} iconPosition="start" label="Today's Update" />
        <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="My History" />
      </Tabs>

      {/* Today's Update Form */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                  {today ? 'Update Today\'s Status' : 'Post Today\'s Update'}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {dayjs().format('dddd, MMMM D, YYYY')}
                </Typography>

                {today && (
                  <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
                    You already posted an update today. You can update it below.
                  </Alert>
                )}

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Availability Status *</InputLabel>
                  <Select
                    value={form.status}
                    label="Availability Status *"
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value as AvailabilityStatus }))}
                  >
                    {(Object.entries(STATUS_CONFIG) as [AvailabilityStatus, any][]).map(([key, cfg]) => (
                      <MenuItem key={key} value={key}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                          {cfg.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="What are you working on today? (Optional)"
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="e.g. Completed onboarding docs, self-learning React, available for new tasks..."
                  value={form.note}
                  onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
                  sx={{ mb: 3 }}
                />

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleSave}
                  disabled={saving}
                  sx={{
                    py: 1.3,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
                  }}
                >
                  {saving ? <CircularProgress size={22} color="inherit" /> : today ? 'Update' : 'Post Update'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Current status preview */}
          {today && (
            <Grid item xs={12} md={6}>
              <Card sx={{ border: `2px solid ${STATUS_CONFIG[today.status].color}40`, borderRadius: 3, background: STATUS_CONFIG[today.status].bgColor }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.8 }}>
                    Current Status
                  </Typography>
                  <Box sx={{ mt: 1.5, mb: 2 }}>
                    <StatusChip status={today.status} />
                  </Box>
                  {today.note && (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                      "{today.note}"
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Last updated {dayjs(today.updatedAt).format('h:mm A')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* History Tab */}
      {tab === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{dayjs(r.date).format('MMM D, YYYY')}</Typography>
                    <Typography variant="caption" color="text.secondary">{dayjs(r.date).format('dddd')}</Typography>
                  </TableCell>
                  <TableCell><StatusChip status={r.status} /></TableCell>
                  <TableCell>
                    <Typography variant="body2" color={r.note ? 'text.primary' : 'text.secondary'}>
                      {r.note || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>No history yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
};

// ---- Manager / Admin View ----
const ManagerAdminView = () => {
  const [records, setRecords] = useState<DailyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await availabilityService.getAll({ date: selectedDate, status: statusFilter || undefined });
      setRecords(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [selectedDate, statusFilter]);

  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map((s) => [s, records.filter(r => r.status === s).length])
  ) as Record<AvailabilityStatus, number>;

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(Object.entries(STATUS_CONFIG) as [AvailabilityStatus, any][]).map(([key, cfg]) => (
          <Grid item xs={6} sm={4} md={2.4} key={key}>
            <Card
              sx={{
                border: `1px solid ${cfg.color}30`,
                borderRadius: 2,
                background: cfg.bgColor,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: statusFilter === key ? `2px solid ${cfg.color}` : 'none',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 },
              }}
              onClick={() => setStatusFilter(prev => prev === key ? '' : key)}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                <Box sx={{ color: cfg.color, mb: 0.5 }}>{cfg.icon}</Box>
                <Typography variant="h5" fontWeight={700} sx={{ color: cfg.color }}>{statusCounts[key]}</Typography>
                <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600, lineHeight: 1.2 }}>{cfg.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" gap={1}>
        <TextField
          type="date"
          label="Date"
          size="small"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {(Object.entries(STATUS_CONFIG) as [AvailabilityStatus, any][]).map(([key, cfg]) => (
              <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {records.length} {records.length === 1 ? 'employee' : 'employees'} updated for {dayjs(selectedDate).format('MMM D, YYYY')}
        </Typography>
      </Stack>

      {/* Resource Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : records.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <GroupIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">No availability updates for this date.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {records.map((record) => {
            const cfg = STATUS_CONFIG[record.status];
            return (
              <Grid item xs={12} sm={6} md={4} key={record.id}>
                <Card sx={{
                  border: `1px solid ${cfg.color}30`,
                  borderRadius: 3,
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
                      <Avatar sx={{
                        width: 42, height: 42, fontSize: 16, fontWeight: 700,
                        background: `linear-gradient(135deg, ${cfg.color} 0%, ${cfg.color}bb 100%)`,
                      }}>
                        {record.user?.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>{record.user?.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {record.user?.designation || record.user?.department || record.user?.employeeId || '—'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Box mb={1.5}>
                      <StatusChip status={record.status} />
                    </Box>
                    {record.note ? (
                      <Tooltip title={record.note} placement="bottom">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.8rem',
                            fontStyle: 'italic',
                          }}
                        >
                          "{record.note}"
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8rem' }}>No note added</Typography>
                    )}
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      Updated {dayjs(record.updatedAt).format('h:mm A')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

// ---- Main Page ----
export default function AvailabilityPage() {
  const { user } = useAppSelector((s) => s.auth);
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.jobRoles?.includes('Manager');

  return (
    <Box>
      <PageHeader
        title="Available Resources"
      />
      {isManagerOrAdmin ? <ManagerAdminView /> : <EmployeeView />}
    </Box>
  );
}
