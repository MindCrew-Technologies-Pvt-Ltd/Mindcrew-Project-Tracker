import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress, Alert, Chip } from '@mui/material';
import reportsService from '../../services/reportsService';
import PeopleIcon from '@mui/icons-material/esm/People';
import WorkIcon from '@mui/icons-material/esm/Work';
import FlightTakeoffIcon from '@mui/icons-material/esm/FlightTakeoff';
import HomeIcon from '@mui/icons-material/esm/Home';
import EventAvailableIcon from '@mui/icons-material/esm/EventAvailable';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';

interface EmployeeAnalyticsData {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  activeProjects: string[];
  leaveType: string | null;
  availabilityStatus: string;
  availabilityNote: string | null;
  minutesLogged: number;
}

const StatCard = ({ label, value, icon, bg, iconColor }: any) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ letterSpacing: '0.03em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mt: 0.5, lineHeight: 1.1 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px',
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, ml: 1,
        }}>
          <Box sx={{ color: iconColor, display: 'flex' }}>{icon}</Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function EmployeeAnalyticsTab() {
  const [data, setData] = useState<EmployeeAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsService.getEmployeeAnalytics()
      .then(res => setData(res.data.data || res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load employee analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const onLeave = data.filter(d => d.leaveType === 'FULL_DAY' || d.leaveType === 'HALF_DAY').length;
  const onWfh = data.filter(d => d.leaveType === 'WFH').length;
  const engagedCount = data.filter(d => d.activeProjects.length > 0).length;
  const availableCount = data.length - engagedCount;

  const assignedResources = data.filter(d => d.activeProjects.length > 0);
  const availableResources = data.filter(d => d.activeProjects.length === 0);

  const columns: Column<EmployeeAnalyticsData>[] = [
    { key: 'employeeId', header: 'ID', width: '80px', value: (row) => row.employeeId },
    { key: 'name', header: 'Name', width: '150px', value: (row) => row.name },
    { key: 'department', header: 'Dept', width: '120px', value: (row) => row.department },
    { 
      key: 'status', 
      header: 'Today\'s Status', 
      width: '120px',
      render: (row: EmployeeAnalyticsData) => {
        if (row.leaveType === 'FULL_DAY') return <Chip label="On Leave" color="error" size="small" />;
        if (row.leaveType === 'HALF_DAY') return <Chip label="Half Day" color="warning" size="small" />;
        if (row.leaveType === 'WFH') return <Chip label="WFH" color="info" size="small" />;
        
        const statusMap: any = {
          FULLY_AVAILABLE: { label: 'Available', color: 'success' },
          PARTIALLY_AVAILABLE: { label: 'Partial', color: 'warning' },
          ON_LEAVE: { label: 'On Leave', color: 'error' },
          BUSY: { label: 'Busy', color: 'default' },
          IN_TRAINING: { label: 'Training', color: 'info' }
        };
        const s = statusMap[row.availabilityStatus];
        if (s) return <Chip label={s.label} color={s.color} size="small" />;
        return <Chip label="Not Updated" size="small" variant="outlined" />;
      }
    },
    {
      key: 'activeProjects',
      header: 'Active Projects',
      width: '200px',
      render: (row: EmployeeAnalyticsData) => (
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.activeProjects.length > 0 ? row.activeProjects.join(', ') : '-'}
        </Typography>
      )
    },
    {
      key: 'hoursLogged',
      header: 'Today Hours',
      width: '120px',
      render: (row: EmployeeAnalyticsData) => {
        const hours = Math.floor(row.minutesLogged / 60);
        const mins = row.minutesLogged % 60;
        const color = row.minutesLogged >= 420 ? 'success.main' : (row.minutesLogged > 0 ? 'warning.main' : 'text.secondary');
        return <Typography variant="body2" color={color} fontWeight={500}>{hours}h {mins}m</Typography>;
      }
    }
  ];

  return (
    <Box>
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="Total Employees" value={data.length} icon={<PeopleIcon />} bg="#EEF0FF" iconColor="#4F46E5" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="Available (Bench)" value={availableCount} icon={<EventAvailableIcon />} bg="#E9F9EF" iconColor="#16A34A" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="Assigned (Engaged)" value={engagedCount} icon={<WorkIcon />} bg="#FEF3E2" iconColor="#F59E0B" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="On Leave Today" value={onLeave} icon={<FlightTakeoffIcon />} bg="#FDF0EE" iconColor="#C66A4B" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="WFH Today" value={onWfh} icon={<HomeIcon />} bg="#E0F2FE" iconColor="#0284C7" />
        </Grid>
      </Grid>

      <Typography variant="h6" mb={2} mt={4}>Assigned Resources ({assignedResources.length})</Typography>
      <Card sx={{ mb: 4 }}>
        <DataTablePro columns={columns} data={assignedResources} keyField="id" />
      </Card>

      <Typography variant="h6" mb={2}>Available Resources / Bench ({availableResources.length})</Typography>
      <Card>
        <DataTablePro columns={columns} data={availableResources} keyField="id" />
      </Card>
    </Box>
  );
}
