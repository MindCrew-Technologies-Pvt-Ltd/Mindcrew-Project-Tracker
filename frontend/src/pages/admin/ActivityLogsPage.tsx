import { useEffect, useState } from 'react';
import { Box, Card, Typography, TextField, MenuItem, Select, FormControl, InputLabel, Button } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchActivityLogsThunk } from '../../store/slices/activityLogsSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatDateTime } from '../../utils/formatters';

const MODULES = ['AUTH', 'PROJECT', 'WEEKLY_UPDATE', 'DOCUMENT', 'EDIT_REQUEST', 'USER'];

const cellSx = { py: 1.75, px: 3, fontSize: '0.875rem', color: 'text.secondary', borderBottom: '1px solid #EEF0F5', verticalAlign: 'top' } as const;
const headSx = { py: 1.75, px: 3, textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '1px solid #E9EBF2' } as const;

const ActionPill = ({ action }: { action: string }) => (
  <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: 2, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em', bgcolor: '#EEF0FF', color: '#4338CA' }}>
    {action}
  </Box>
);

const ActivityLogsPage = () => {
  const dispatch = useAppDispatch();
  const { logs, pagination, loading } = useAppSelector((s) => s.activityLogs);
  const [module, setModule] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    dispatch(fetchActivityLogsThunk({ module: module || undefined, startDate: startDate || undefined, endDate: endDate || undefined, pageSize: 50 }));
  }, [module, startDate, endDate, dispatch]);

  const handleReset = () => { setModule(''); setStartDate(''); setEndDate(''); };

  return (
    <Box>
      <PageHeader title="Activity Logs" subtitle={pagination.total + ' records'} />

      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Module</InputLabel>
          <Select value={module} label="Module" onChange={(e) => setModule(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Start Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <TextField label="End Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button variant="outlined" size="small" onClick={handleReset}>Reset</Button>
      </Box>

      <Card sx={{ overflowX: 'auto', p: 0 }}>
        {loading ? (
          <Box sx={{ py: 6 }}><LoadingSpinner /></Box>
        ) : logs.length === 0 ? (
          <Box sx={{ py: 6 }}><EmptyState title="No activity yet" /></Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={headSx}>User</Box>
                <Box component="th" sx={headSx}>Action</Box>
                <Box component="th" sx={headSx}>Module</Box>
                <Box component="th" sx={headSx}>Description</Box>
                <Box component="th" sx={headSx}>Date</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {logs.map((log: any) => (
                <Box component="tr" key={log.id} sx={{ transition: 'background 0.15s ease', '&:hover': { bgcolor: '#F7F8FD' }, '&:last-of-type td': { borderBottom: 'none' } }}>
                  <Box component="td" sx={{ ...cellSx, whiteSpace: 'nowrap' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary' }}>{log.user?.name || '—'}</Typography>
                  </Box>
                  <Box component="td" sx={{ ...cellSx, whiteSpace: 'nowrap' }}><ActionPill action={log.action} /></Box>
                  <Box component="td" sx={{ ...cellSx, whiteSpace: 'nowrap' }}>{log.module}</Box>
                  <Box component="td" sx={{ ...cellSx, minWidth: 260, color: 'text.primary' }}>{log.description}</Box>
                  <Box component="td" sx={{ ...cellSx, whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default ActivityLogsPage;
