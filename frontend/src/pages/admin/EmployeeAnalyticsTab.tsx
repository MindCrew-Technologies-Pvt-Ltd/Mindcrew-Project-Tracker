import { useEffect, useState, useMemo } from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress, Alert, Chip, CardActionArea, Divider } from '@mui/material';
import reportsService from '../../services/reportsService';
import PeopleIcon from '@mui/icons-material/esm/People';
import WorkIcon from '@mui/icons-material/esm/Work';
import FlightTakeoffIcon from '@mui/icons-material/esm/FlightTakeoff';
import EventAvailableIcon from '@mui/icons-material/esm/EventAvailable';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface EmployeeAnalyticsData {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  jobRoles: string[];
  activeProjects: { name: string; manager: string }[];
  leaveType: string | null;
  availabilityStatus: string;
  availabilityNote: string | null;
  minutesLogged: number;
}

type ViewType = 'ATTENDANCE' | 'LEAVES' | 'WORK' | 'BANDWIDTH';

const StatCard = ({ label, value, icon, bg, iconColor, active, onClick }: any) => (
  <Card sx={{ height: '100%', border: active ? `2px solid ${iconColor}` : '2px solid transparent', transition: 'all 0.2s' }}>
    <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2.5 }}>
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
    </CardActionArea>
  </Card>
);

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function EmployeeAnalyticsTab() {
  const [data, setData] = useState<EmployeeAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewType>('ATTENDANCE');

  useEffect(() => {
    reportsService.getEmployeeAnalytics()
      .then(res => setData(res.data.data || res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load employee analytics'))
      .finally(() => setLoading(false));
  }, []);

  const roleData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(user => {
      const primaryRole = user.designation || (user.jobRoles && user.jobRoles[0]) || 'Other';
      counts[primaryRole] = (counts[primaryRole] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const onLeave = data.filter(d => d.leaveType === 'FULL_DAY' || d.leaveType === 'HALF_DAY').length;
  const onWfh = data.filter(d => d.leaveType === 'WFH').length;
  const engagedCount = data.filter(d => d.activeProjects.length > 0).length;
  const availableCount = data.length - engagedCount;

  // -- Views Logic --
  let tableData: EmployeeAnalyticsData[] = [];
  let columns: Column<EmployeeAnalyticsData>[] = [];

  const renderStatus = (row: EmployeeAnalyticsData) => {
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
  };

  const baseCols = [
    { key: 'employeeId', header: 'ID', width: '80px', value: (row: EmployeeAnalyticsData) => row.employeeId || '-' },
    { key: 'name', header: 'Name', width: '150px', value: (row: EmployeeAnalyticsData) => row.name },
    { key: 'role', header: 'Job Role', width: '150px', value: (row: EmployeeAnalyticsData) => row.designation || (row.jobRoles && row.jobRoles.length > 0 ? row.jobRoles[0] : '-') },
  ];

  if (view === 'ATTENDANCE') {
    tableData = data;
    columns = [
      ...baseCols,
      { key: 'status', header: 'Status Today', width: '130px', render: renderStatus },
      {
        key: 'hoursLogged', header: 'Hours Logged', width: '120px',
        render: (row) => {
          const hours = Math.floor(row.minutesLogged / 60);
          const mins = row.minutesLogged % 60;
          const color = row.minutesLogged >= 420 ? 'success.main' : (row.minutesLogged > 0 ? 'warning.main' : 'text.secondary');
          return <Typography variant="body2" color={color} fontWeight={500}>{hours}h {mins}m</Typography>;
        }
      }
    ];
  } else if (view === 'LEAVES') {
    tableData = data.filter(d => d.leaveType);
    columns = [
      ...baseCols,
      { 
        key: 'leaveType', header: 'Leave Type', width: '150px', 
        render: (row) => (
          <Chip size="small" 
                label={row.leaveType === 'FULL_DAY' ? 'Full Day' : row.leaveType === 'HALF_DAY' ? 'Half Day' : 'Work From Home'} 
                color={row.leaveType === 'WFH' ? 'info' : row.leaveType === 'HALF_DAY' ? 'warning' : 'error'} 
          />
        )
      }
    ];
  } else if (view === 'WORK') {
    tableData = data.filter(d => d.activeProjects && d.activeProjects.length > 0);
    columns = [
      ...baseCols,
      {
        key: 'activeProjects', header: 'Active Projects', width: '200px',
        render: (row) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {row.activeProjects.map((p, i) => (
              <Typography key={i} variant="body2" sx={{ fontWeight: 500 }}>• {p.name}</Typography>
            ))}
          </Box>
        )
      },
      {
        key: 'managers', header: 'Managers', width: '180px',
        render: (row) => {
          const managers = Array.from(new Set(row.activeProjects.map(p => p.manager)));
          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {managers.map((m, i) => <Chip key={i} label={m} size="small" variant="outlined" />)}
            </Box>
          );
        }
      }
    ];
  } else if (view === 'BANDWIDTH') {
    tableData = data.filter(d => !d.activeProjects || d.activeProjects.length === 0);
    columns = [
      ...baseCols,
      {
        key: 'designation', header: 'Role', width: '150px',
        render: (row) => <Typography variant="body2">{row.designation || (row.jobRoles && row.jobRoles[0]) || 'Employee'}</Typography>
      },
      { key: 'availabilityNote', header: 'Note', width: '200px', value: (row) => row.availabilityNote || '-' }
    ];
  }

  const viewTitles = {
    ATTENDANCE: 'Daily Attendance & Timesheet',
    LEAVES: 'Employees on Leave / WFH Today',
    WORK: 'Active Project Allocations',
    BANDWIDTH: 'Available Resources (Bench)'
  };

  return (
    <Box>
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Attendance Report" value={data.length} icon={<PeopleIcon />} bg="#EEF0FF" iconColor="#4F46E5" 
                    active={view === 'ATTENDANCE'} onClick={() => setView('ATTENDANCE')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Leaves & WFH" value={onLeave + onWfh} icon={<FlightTakeoffIcon />} bg="#FDF0EE" iconColor="#C66A4B" 
                    active={view === 'LEAVES'} onClick={() => setView('LEAVES')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Work / Projects" value={engagedCount} icon={<WorkIcon />} bg="#FEF3E2" iconColor="#F59E0B" 
                    active={view === 'WORK'} onClick={() => setView('WORK')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Bandwidth (Bench)" value={availableCount} icon={<EventAvailableIcon />} bg="#E9F9EF" iconColor="#16A34A" 
                    active={view === 'BANDWIDTH'} onClick={() => setView('BANDWIDTH')} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" mb={2}>{viewTitles[view]} ({tableData.length})</Typography>
              <Box sx={{ flex: 1, minHeight: 300 }}>
                <DataTablePro columns={columns as any} rows={tableData} getId={(r: any) => r.id} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" mb={1}>Role Wise Analytics</Typography>
              <Typography variant="caption" color="text.secondary" mb={2} display="block">
                Employee distribution across different designations
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ height: 260 }}>
                {roleData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {roleData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} Employees`, 'Count']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                    <Typography color="text.secondary">No data available</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
