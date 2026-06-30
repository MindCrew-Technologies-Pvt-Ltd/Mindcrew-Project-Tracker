import { useEffect, useState } from 'react';
import { Box, TextField, MenuItem, Select, FormControl, InputLabel, Button, Chip } from '@mui/material';
import { ColDef } from 'ag-grid-community';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchActivityLogsThunk } from '../../store/slices/activityLogsSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/data-display/DataTable';
import { formatDateTime } from '../../utils/formatters';

const MODULES = ['AUTH', 'PROJECT', 'WEEKLY_UPDATE', 'DOCUMENT', 'EDIT_REQUEST', 'USER'];

const ActivityLogsPage = () => {
  const dispatch = useAppDispatch();
  const { logs, pagination, loading } = useAppSelector((s) => s.activityLogs);
  const [module, setModule] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    dispatch(fetchActivityLogsThunk({ module: module || undefined, userId: userId || undefined, startDate: startDate || undefined, endDate: endDate || undefined, pageSize: 50 }));
  }, [module, userId, startDate, endDate, dispatch]);

  const colDefs: ColDef[] = [
    { headerName: 'User', field: 'user', flex: 1.5, valueFormatter: (p: any) => p.value?.name },
    { headerName: 'Action', field: 'action', flex: 1, cellRenderer: (p: any) => <Chip label={p.value} size="small" variant="outlined" /> },
    { headerName: 'Module', field: 'module', flex: 1 },
    { headerName: 'Description', field: 'description', flex: 3 },
    { headerName: 'IP Address', field: 'ipAddress', flex: 1 },
    { headerName: 'Date', field: 'createdAt', flex: 1.5, valueFormatter: (p: any) => formatDateTime(p.value) },
  ];

  const handleReset = () => { setModule(''); setUserId(''); setStartDate(''); setEndDate(''); };

  return (
    <Box>
      <PageHeader title="Activity Logs" subtitle={pagination.total + ' records'} />

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Module</InputLabel>
          <Select value={module} label="Module" onChange={(e) => setModule(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {MODULES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Start Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <TextField label="End Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button variant="outlined" size="small" onClick={handleReset}>Reset</Button>
      </Box>

      <DataTable rowData={logs} columnDefs={colDefs} loading={loading} height={600} pagination={true} pageSize={50} />
    </Box>
  );
};

export default ActivityLogsPage;
