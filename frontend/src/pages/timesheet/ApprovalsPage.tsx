import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Avatar, Tabs, Tab, TextField,
  Chip, IconButton, Tooltip, CircularProgress, Alert, Snackbar,
  Drawer, List, ListItem, ListItemText, Divider, Button, ToggleButtonGroup, ToggleButton,
  FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ViewIcon from '@mui/icons-material/esm/Visibility';
import ApproveIcon from '@mui/icons-material/esm/Check';
import RejectIcon from '@mui/icons-material/esm/Close';
import ReopenIcon from '@mui/icons-material/esm/LockOpen';
import CelebrationIcon from '@mui/icons-material/esm/Celebration';
import dayjs from 'dayjs';
import PageHeader from '../../components/common/PageHeader';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';
import EmptyState from '../../components/common/EmptyState';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchPendingThunk, approveWeekThunk, rejectWeekThunk, reopenWeekThunk,
} from '../../store/slices/timesheetSlice';
import timesheetService from '../../services/timesheetService';
import { PendingWeekRow, WeekDetail, MissingUser, TimeEntry, TimesheetWeek } from '../../types/timesheet.types';
import { minutesToHM, minutesToPretty, weekLabel, isoWeekOf, shiftIsoWeek, dateKey } from '../../utils/timeFormat';
import { formatDate } from '../../utils/formatters';

const EmployeeCell = ({ name, email, managerNames }: { name?: string; email?: string; managerNames?: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
    <Avatar sx={{ width: 36, height: 36, fontSize: 14, background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', color: '#fff' }}>
      {name?.charAt(0).toUpperCase()}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.3 }}>{name}</Typography>
      <Typography noWrap sx={{ fontSize: '0.78rem', color: 'text.secondary' }} title={email}>{email}</Typography>
      {managerNames && (
        <Typography noWrap sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }} title={managerNames}>
          RM: {managerNames}
        </Typography>
      )}
    </Box>
  </Box>
);

const ProjectChips = ({ projects }: { projects: { id: string; name: string }[] }) => (
  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
    {projects.slice(0, 3).map((p) => (
      <Chip key={p.id} label={p.name} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#EEF0FF', color: '#4338CA', maxWidth: 110 }} />
    ))}
    {projects.length > 3 && (
      <Chip label={`+${projects.length - 3}`} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#F1F5F9', color: '#64748B' }} />
    )}
  </Box>
);

const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const ApprovalsPage = () => {
  const dispatch = useAppDispatch();
  const { isAdmin } = useAuth();
  const { pending, pendingLoading } = useAppSelector((s) => s.timesheet);

  // Plain employees land on their own submissions; reviewers land on the queue.
  const [tab, setTab] = useState<'mine' | 'pending' | 'reviewed' | 'missing'>(isAdmin ? 'pending' : 'mine');
  const [reviewedStatus, setReviewedStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState('');

  // My submissions (read-only — where an employee tracks their own approval status)
  const [myWeeks, setMyWeeks] = useState<TimesheetWeek[]>([]);
  const [myWeeksLoading, setMyWeeksLoading] = useState(false);

  // Drawer with the week detail
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerReadOnly, setDrawerReadOnly] = useState(false);
  const [detail, setDetail] = useState<WeekDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reject dialog
  const [rejecting, setRejecting] = useState<string | null>(null); // week id
  const [rejectNote, setRejectNote] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // Missing tab
  const lastWeek = useMemo(() => {
    const now = isoWeekOf(new Date());
    return shiftIsoWeek(now.year, now.week, -1);
  }, []);
  const [missingDate, setMissingDate] = useState(() => dayjs(todayISO()).subtract(7, 'day').format('YYYY-MM-DD'));
  const [missingRef, setMissingRef] = useState(lastWeek);
  const [missing, setMissing] = useState<MissingUser[]>([]);
  const [missingLoading, setMissingLoading] = useState(false);

  const refetchQueue = useCallback(() => {
    const status = tab === 'pending' ? 'SUBMITTED' : reviewedStatus;
    dispatch(fetchPendingThunk({ status }));
  }, [dispatch, tab, reviewedStatus]);

  useEffect(() => {
    if (tab === 'pending' || tab === 'reviewed') refetchQueue();
  }, [tab, reviewedStatus, refetchQueue]);

  useEffect(() => {
    if (tab !== 'mine') return;
    setMyWeeksLoading(true);
    timesheetService.myWeeks()
      .then((r) => setMyWeeks(r.data?.data || []))
      .catch(() => setMyWeeks([]))
      .finally(() => setMyWeeksLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'missing') return;
    setMissingLoading(true);
    timesheetService.missing(missingRef.year, missingRef.week)
      .then((r) => setMissing(r.data?.data || []))
      .catch(() => setMissing([]))
      .finally(() => setMissingLoading(false));
  }, [tab, missingRef]);

  const openDrawer = (id: string, readOnly = false) => {
    setDrawerId(id);
    setDrawerReadOnly(readOnly);
    setDetail(null);
    setDetailLoading(true);
    timesheetService.weekDetail(id)
      .then((r) => setDetail(r.data?.data || null))
      .catch((err) => {
        setSnack({ msg: err.response?.data?.message || 'Could not load the timesheet', severity: 'error' });
        setDrawerId(null);
      })
      .finally(() => setDetailLoading(false));
  };

  const handleApprove = async (id: string) => {
    setActionBusy(true);
    const result = await dispatch(approveWeekThunk(id));
    setActionBusy(false);
    if (approveWeekThunk.fulfilled.match(result)) {
      setDrawerId(null);
      setSnack({ msg: 'Timesheet approved', severity: 'success' });
      refetchQueue();
    } else {
      setSnack({ msg: (result.payload as string) || 'Approve failed', severity: 'error' });
    }
  };

  const handleBulkApprove = async (selectedIds: string[], clearSelection: () => void) => {
    if (!window.confirm(`Approve ${selectedIds.length} timesheets?`)) return;
    setActionBusy(true);
    let successCount = 0;
    for (const id of selectedIds) {
      const result = await dispatch(approveWeekThunk(id));
      if (approveWeekThunk.fulfilled.match(result)) successCount++;
    }
    setActionBusy(false);
    clearSelection();
    setSnack({ msg: `Approved ${successCount} timesheets`, severity: 'success' });
    refetchQueue();
  };

  const handleBulkReject = (selectedIds: string[], clearSelection: () => void) => {
    const note = window.prompt(`Reject ${selectedIds.length} timesheets. Enter reason:`);
    if (!note || note.trim().length < 3) {
      alert("A reason (at least 3 characters) is required to reject timesheets.");
      return;
    }
    setActionBusy(true);
    const processRejects = async () => {
      let successCount = 0;
      for (const id of selectedIds) {
        const result = await dispatch(rejectWeekThunk({ id, note: note.trim() }));
        if (rejectWeekThunk.fulfilled.match(result)) successCount++;
      }
      setActionBusy(false);
      clearSelection();
      setSnack({ msg: `Rejected ${successCount} timesheets`, severity: 'success' });
      refetchQueue();
    };
    processRejects();
  };

  const uniqueManagers = useMemo(() => {
    const managers = new Set<string>();
    const extract = (managerNames?: string) => {
      if (!managerNames) return;
      managerNames.split(',').map(n => n.trim()).filter(Boolean).forEach(n => managers.add(n));
    };
    if (tab === 'pending' || tab === 'reviewed') {
      pending.items.forEach(r => extract((r.user as any)?.managerNames));
    } else if (tab === 'missing') {
      missing.forEach(u => extract(u.managerNames));
    }
    return Array.from(managers).sort();
  }, [pending.items, missing, tab]);

  const filteredPending = useMemo(() => {
    let result = pending.items;
    if (managerFilter) {
      result = result.filter(r => {
        const managers = (r.user as any)?.managerNames || '';
        return managers.includes(managerFilter);
      });
    }
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(r => r.user?.name?.toLowerCase().includes(lowerQ) || ((r.user as any)?.managerNames || '').toLowerCase().includes(lowerQ));
    }
    return result;
  }, [pending.items, searchQuery, managerFilter]);

  const filteredMissing = useMemo(() => {
    let result = missing;
    if (managerFilter) {
      result = result.filter(u => (u.managerNames || '').includes(managerFilter));
    }
    return result;
  }, [missing, managerFilter]);

  const handleReject = async () => {
    if (!rejecting || rejectNote.trim().length < 3) return;
    setActionBusy(true);
    const result = await dispatch(rejectWeekThunk({ id: rejecting, note: rejectNote.trim() }));
    setActionBusy(false);
    if (rejectWeekThunk.fulfilled.match(result)) {
      setRejecting(null);
      setRejectNote('');
      setDrawerId(null);
      setSnack({ msg: 'Timesheet rejected — the employee was notified', severity: 'success' });
      refetchQueue();
    } else {
      setSnack({ msg: (result.payload as string) || 'Reject failed', severity: 'error' });
    }
  };

  const handleReopen = async (id: string) => {
    setActionBusy(true);
    const result = await dispatch(reopenWeekThunk(id));
    setActionBusy(false);
    if (reopenWeekThunk.fulfilled.match(result)) {
      setSnack({ msg: 'Timesheet reopened for corrections', severity: 'success' });
      refetchQueue();
    } else {
      setSnack({ msg: (result.payload as string) || 'Reopen failed', severity: 'error' });
    }
  };

  const pendingColumns: Column<PendingWeekRow>[] = useMemo(() => [
    { key: 'user', header: 'Employee', width: '25%', sortable: true, value: (w) => w.user?.name || '', render: (w) => <EmployeeCell name={w.user?.name} email={w.user?.email} managerNames={(w.user as any).managerNames} /> },
    { key: 'week', header: 'Week', width: '15%', sortable: true, value: (w) => w.isoYear * 100 + w.isoWeek, render: (w) => <Typography sx={{ fontSize: '0.85rem' }}>{weekLabel(w.isoYear, w.isoWeek)}</Typography> },
    { key: 'hours', header: 'Hours', width: '8%', sortable: true, value: (w) => w.totalMinutes, render: (w) => <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(w.totalMinutes)}</Typography> },
    { key: 'billable', header: 'Billable', width: '8%', sortable: true, value: (w) => w.billableMinutes, render: (w) => <Typography sx={{ fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(w.billableMinutes)}</Typography> },
    { key: 'projects', header: 'Projects', width: '20%', render: (w) => <ProjectChips projects={w.projects || []} /> },
    { key: 'submittedAt', header: 'Submitted', width: '11%', sortable: true, value: (w) => w.submittedAt || '', render: (w) => formatDate(w.submittedAt) },
  ], []);

  const reviewedColumns: Column<PendingWeekRow>[] = useMemo(() => [
    { key: 'user', header: 'Employee', width: '25%', sortable: true, value: (w) => w.user?.name || '', render: (w) => <EmployeeCell name={w.user?.name} email={w.user?.email} managerNames={(w.user as any).managerNames} /> },
    { key: 'week', header: 'Week', width: '15%', sortable: true, value: (w) => w.isoYear * 100 + w.isoWeek, render: (w) => <Typography sx={{ fontSize: '0.85rem' }}>{weekLabel(w.isoYear, w.isoWeek)}</Typography> },
    { key: 'hours', header: 'Hours', width: '8%', sortable: true, value: (w) => w.totalMinutes, render: (w) => <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(w.totalMinutes)}</Typography> },
    { key: 'billable', header: 'Billable', width: '8%', sortable: true, value: (w) => w.billableMinutes, render: (w) => <Typography sx={{ fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(w.billableMinutes)}</Typography> },
    { key: 'projects', header: 'Projects', width: '20%', render: (w) => <ProjectChips projects={w.projects || []} /> },
    { key: 'reviewedBy', header: 'Reviewer', width: '12%', render: (w) => w.reviewedBy?.name || '—' },
    { key: 'reviewedAt', header: 'Reviewed', width: '11%', sortable: true, value: (w) => w.reviewedAt || '', render: (w) => formatDate(w.reviewedAt) },
  ], []);

  const pendingActions = (w: PendingWeekRow) => (
    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
      <Tooltip title="View week" arrow>
        <IconButton size="small" sx={{ color: '#4F46E5' }} onClick={(e) => { e.stopPropagation(); openDrawer(w.id); }}><ViewIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title="Approve" arrow>
        <IconButton size="small" sx={{ color: '#15803D' }} onClick={(e) => { e.stopPropagation(); handleApprove(w.id); }}><ApproveIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Tooltip title="Reject" arrow>
        <IconButton size="small" sx={{ color: '#DC2626' }} onClick={(e) => { e.stopPropagation(); setRejecting(w.id); setRejectNote(''); }}><RejectIcon fontSize="small" /></IconButton>
      </Tooltip>
    </Box>
  );

  const reviewedActions = (w: PendingWeekRow) => (
    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
      <Tooltip title="View week" arrow>
        <IconButton size="small" sx={{ color: '#4F46E5' }} onClick={(e) => { e.stopPropagation(); openDrawer(w.id); }}><ViewIcon fontSize="small" /></IconButton>
      </Tooltip>
      {isAdmin && w.status === 'APPROVED' && (
        <Tooltip title="Reopen for corrections" arrow>
          <IconButton size="small" sx={{ color: '#B45309' }} onClick={(e) => { e.stopPropagation(); handleReopen(w.id); }}><ReopenIcon fontSize="small" /></IconButton>
        </Tooltip>
      )}
    </Box>
  );

  // ---- Drawer: entries grouped by day ----
  const entriesByDay = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, TimeEntry[]>();
    for (const e of detail.entries) {
      const dk = dateKey(e.date);
      (map.get(dk) ?? map.set(dk, []).get(dk)!).push(e);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [detail]);

  const detailTotal = detail ? detail.entries.reduce((s, e) => s + e.minutes, 0) : 0;
  const detailBillable = detail ? detail.entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0) : 0;

  return (
    <Box>
      <PageHeader title="Timesheet Approvals" subtitle="Track your own submissions and review your project members' weeks" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: '1px solid #E9EBF2' }}>
        {!isAdmin && <Tab value="mine" label="My submissions" sx={{ textTransform: 'none', fontWeight: 600 }} />}
        <Tab value="pending" label="Pending review" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab value="reviewed" label="Reviewed" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab value="missing" label="Missing" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {tab === 'mine' && (
        <DataTablePro
          rows={myWeeks}
          columns={[
            {
              key: 'week', header: 'Week', width: '20%', sortable: true, value: (w: TimesheetWeek) => w.isoYear * 100 + w.isoWeek,
              render: (w: TimesheetWeek) => <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{weekLabel(w.isoYear, w.isoWeek)}</Typography>,
            },
            {
              key: 'hours', header: 'Hours', width: '10%', sortable: true, value: (w: TimesheetWeek) => w.totalMinutes,
              render: (w: TimesheetWeek) => <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(w.totalMinutes)}</Typography>,
            },
            {
              key: 'status', header: 'Status', width: '16%', sortable: true, value: (w: TimesheetWeek) => w.status,
              render: (w: TimesheetWeek) => (
                <Chip
                  label={w.status === 'SUBMITTED' ? 'Pending approval' : w.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: '0.7rem',
                    ...(w.status === 'SUBMITTED' ? { bgcolor: '#FEF3E2', color: '#B45309' }
                      : w.status === 'APPROVED' ? { bgcolor: '#E9F9EF', color: '#15803D' }
                        : { bgcolor: '#FDECEC', color: '#B91C1C' }),
                  }}
                />
              ),
            },
            {
              key: 'submittedAt', header: 'Submitted', width: '13%', sortable: true, value: (w: TimesheetWeek) => w.submittedAt || '',
              render: (w: TimesheetWeek) => formatDate(w.submittedAt),
            },
            {
              key: 'reviewedBy', header: 'Reviewed by', width: '14%',
              render: (w: TimesheetWeek) => (w.reviewedBy?.name ? `${w.reviewedBy.name} · ${formatDate(w.reviewedAt)}` : '—'),
            },
            {
              key: 'reviewNote', header: 'Note', width: '17%',
              render: (w: TimesheetWeek) => w.reviewNote
                ? <Typography noWrap sx={{ fontSize: '0.8rem', color: '#B45309' }} title={w.reviewNote}>{w.reviewNote}</Typography>
                : '—',
            },
          ] as Column<TimesheetWeek>[]}
          getId={(w) => w.id}
          loading={myWeeksLoading}
          emptyText="You haven't submitted any weeks yet — submit one from My Timesheet"
          onRowClick={(w) => openDrawer(w.id, true)}
          rowActions={(w) => (
            <Tooltip title="View week" arrow>
              <IconButton size="small" sx={{ color: '#4F46E5' }} onClick={(e) => { e.stopPropagation(); openDrawer(w.id, true); }}><ViewIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          minWidth={880}
        />
      )}

      {tab === 'pending' && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
            <TextField 
              size="small" 
              placeholder="Search employee..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 250 }}
            />
            {uniqueManagers.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Manager</InputLabel>
                <Select
                  value={managerFilter}
                  label="Filter by Manager"
                  onChange={(e: any) => setManagerFilter(e.target.value)}
                >
                  <MenuItem value="">All Managers</MenuItem>
                  {uniqueManagers.map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          <DataTablePro
            rows={filteredPending}
            columns={pendingColumns}
            getId={(w) => w.id}
            loading={pendingLoading}
            emptyText="No timesheets waiting for review"
            selectable
            bulkActions={(selectedIds, clearSelection) => (
              <>
                <Button size="small" color="success" variant="outlined" startIcon={<ApproveIcon fontSize="small" />} onClick={() => handleBulkApprove(selectedIds, clearSelection)}>
                  Approve
                </Button>
                <Button size="small" color="error" variant="outlined" startIcon={<RejectIcon fontSize="small" />} onClick={() => handleBulkReject(selectedIds, clearSelection)}>
                  Reject
                </Button>
              </>
            )}
            onRowClick={(w) => openDrawer(w.id)}
            rowActions={pendingActions}
            minWidth={960}
          />
        </Box>
      )}

      {tab === 'reviewed' && (
        <>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <ToggleButtonGroup
              size="small" exclusive value={reviewedStatus}
              onChange={(_, v) => { if (v) setReviewedStatus(v); }}
            >
              <ToggleButton value="APPROVED" sx={{ textTransform: 'none', px: 2 }}>Approved</ToggleButton>
              <ToggleButton value="REJECTED" sx={{ textTransform: 'none', px: 2 }}>Rejected</ToggleButton>
            </ToggleButtonGroup>
            
            {uniqueManagers.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Manager</InputLabel>
                <Select
                  value={managerFilter}
                  label="Filter by Manager"
                  onChange={(e: any) => setManagerFilter(e.target.value)}
                >
                  <MenuItem value="">All Managers</MenuItem>
                  {uniqueManagers.map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          <DataTablePro
            rows={filteredPending}
            columns={reviewedColumns}
            getId={(w) => w.id}
            loading={pendingLoading}
            emptyText={`No ${reviewedStatus.toLowerCase()} timesheets`}
            onRowClick={(w) => openDrawer(w.id)}
            rowActions={reviewedActions}
            minWidth={960}
          />
        </>
      )}

      {tab === 'missing' && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
            <TextField
              size="small" type="date" label="Any day of the week" InputLabelProps={{ shrink: true }}
              value={missingDate}
              onChange={(e) => {
                setMissingDate(e.target.value);
                if (e.target.value) {
                  const { week, year } = isoWeekOf(new Date(e.target.value));
                  setMissingRef({ year, week });
                }
              }}
            />
            <Typography sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
              {weekLabel(missingRef.year, missingRef.week)}
            </Typography>
            
            {uniqueManagers.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Manager</InputLabel>
                <Select
                  value={managerFilter}
                  label="Filter by Manager"
                  onChange={(e: any) => setManagerFilter(e.target.value)}
                >
                  <MenuItem value="">All Managers</MenuItem>
                  {uniqueManagers.map(m => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          {missingLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : filteredMissing.length === 0 ? (
            <EmptyState
              icon={<CelebrationIcon sx={{ fontSize: 64 }} />}
              title="Everyone has logged time 🎉"
              description={`Every active member logged time in ${weekLabel(missingRef.year, missingRef.week)}.`}
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredMissing.map((u) => (
                <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, bgcolor: '#fff', border: '1px solid #E9EBF2', borderRadius: '10px' }}>
                  <EmployeeCell name={u.name} email={u.email} managerNames={u.managerNames} />
                  <Box sx={{ flex: 1 }} />
                  <Chip label="No entries" size="small" sx={{ bgcolor: '#FDECEC', color: '#B91C1C', fontWeight: 600, fontSize: '0.72rem' }} />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Week detail drawer */}
      <Drawer
        anchor="right"
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
      >
        {detailLoading || !detail ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #E9EBF2' }}>
              <EmployeeCell name={detail.user?.name} email={detail.user?.email} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>{weekLabel(detail.isoYear, detail.isoWeek)}</Typography>
                <Chip
                  label={detail.status} size="small"
                  sx={{
                    fontWeight: 700, fontSize: '0.68rem',
                    ...(detail.status === 'SUBMITTED' ? { bgcolor: '#EEF0FF', color: '#4338CA' }
                      : detail.status === 'APPROVED' ? { bgcolor: '#E9F9EF', color: '#15803D' }
                        : { bgcolor: '#FDECEC', color: '#B91C1C' }),
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" mt={0.75}>
                Total <strong>{minutesToPretty(detailTotal)}</strong> · Billable <strong>{minutesToPretty(detailBillable)}</strong> · {detail.entries.length} entries
              </Typography>
              {detail.reviewNote && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>{detail.reviewNote}</Alert>
              )}
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
              {entriesByDay.map(([dk, dayEntries]) => (
                <Box key={dk} sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {dayjs(dk).format('ddd, MMM D')}
                    </Typography>
                    <Divider sx={{ flex: 1 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                      {minutesToHM(dayEntries.reduce((s, e) => s + e.minutes, 0))}
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {dayEntries.map((e) => (
                      <ListItem key={e.id} disableGutters sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: 220 }} title={e.project.name}>{e.project.name}</Typography>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(e.minutes)}</Typography>
                              {e.billable && <Chip label="Billable" size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#E9F9EF', color: '#15803D' }} />}
                              {e.source === 'AI_AGENT' && <Chip label="AI" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#EEF0FF', color: '#4338CA', border: '1px solid #DFE2FA' }} />}
                            </Box>
                          }
                          secondary={e.description || undefined}
                          secondaryTypographyProps={{ fontSize: '0.78rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Box>

            {detail.status === 'SUBMITTED' && drawerReadOnly && (
              <Box sx={{ px: 3, py: 2, borderTop: '1px solid #E9EBF2' }}>
                <Alert severity="info" sx={{ py: 0.5 }}>Waiting for the project owner's approval — no action needed from you.</Alert>
              </Box>
            )}
            {detail.status === 'SUBMITTED' && !drawerReadOnly && (
              <Box sx={{ px: 3, py: 2, borderTop: '1px solid #E9EBF2', display: 'flex', gap: 1.5 }}>
                <Button
                  fullWidth variant="contained" color="success" startIcon={<ApproveIcon />}
                  disabled={actionBusy} onClick={() => handleApprove(detail.id)}
                >
                  Approve
                </Button>
                <Button
                  fullWidth variant="outlined" color="error" startIcon={<RejectIcon />}
                  disabled={actionBusy} onClick={() => { setRejecting(detail.id); setRejectNote(''); }}
                >
                  Reject
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      {/* Reject dialog (note required) */}
      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Timesheet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Explain what needs fixing — the note is sent to the employee and shown on their week.
          </Typography>
          <TextField
            autoFocus fullWidth multiline rows={3} label="Rejection note (required)"
            value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
            error={rejectNote.length > 0 && rejectNote.trim().length < 3}
            helperText={rejectNote.length > 0 && rejectNote.trim().length < 3 ? 'At least 3 characters' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)} disabled={actionBusy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={actionBusy || rejectNote.trim().length < 3}>
            Reject
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

export default ApprovalsPage;
