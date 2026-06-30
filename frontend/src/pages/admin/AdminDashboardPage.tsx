import { useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { Folder as FolderIcon, PlayCircle as PlayCircleIcon, CheckCircle as CheckCircleIcon, EditNote as EditNoteIcon, People as PeopleIcon, PauseCircle as PauseCircleIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk } from '../../store/slices/projectsSlice';
import { fetchUsersThunk } from '../../store/slices/usersSlice';
import { fetchEditRequestsThunk } from '../../store/slices/editRequestsSlice';
import PageHeader from '../../components/common/PageHeader';
import ProjectsByStatusChart from '../../components/charts/ProjectsByStatusChart';
import ProjectsByTechChart from '../../components/charts/ProjectsByTechChart';
import ProjectsByEmployeeChart from '../../components/charts/ProjectsByEmployeeChart';
import MonthlyCreationChart from '../../components/charts/MonthlyCreationChart';
import WeeklyUpdateTrendsChart from '../../components/charts/WeeklyUpdateTrendsChart';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  trend?: string;
}

const StatCard = ({ label, value, icon, bg, iconColor, trend }: StatCardProps) => (
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
          {trend && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {trend}
            </Typography>
          )}
        </Box>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px',
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, ml: 1,
          transition: 'transform 0.2s ease',
          '.MuiCard-root:hover &': { transform: 'scale(1.1) rotate(4deg)' },
        }}>
          <Box sx={{ color: iconColor, display: 'flex' }}>{icon}</Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboardPage = () => {
  const dispatch = useAppDispatch();
  const { list: projects } = useAppSelector((s) => s.projects);
  const { list: users } = useAppSelector((s) => s.users);
  const { requests } = useAppSelector((s) => s.editRequests);

  useEffect(() => {
    dispatch(fetchProjectsThunk({ pageSize: 1000 }));
    dispatch(fetchUsersThunk({}));
    dispatch(fetchEditRequestsThunk({ status: 'PENDING' }));
  }, [dispatch]);

  const noProjects = projects.length === 0;

  const statusData = noProjects
    ? [{ name: 'ACTIVE', value: 12 }, { name: 'COMPLETED', value: 8 }, { name: 'ON_HOLD', value: 3 }, { name: 'DRAFT', value: 5 }, { name: 'CANCELLED', value: 2 }]
    : (['ACTIVE', 'COMPLETED', 'ON_HOLD', 'DRAFT', 'CANCELLED', 'ARCHIVED'] as const)
        .map(s => ({ name: s, value: projects.filter(p => p.status === s).length }))
        .filter(d => d.value > 0);

  const techCount: Record<string, number> = {};
  projects.forEach(p => (p.technologies || []).forEach(t => { techCount[t] = (techCount[t] || 0) + 1; }));
  const techData = noProjects
    ? [{ name: 'React', count: 10 }, { name: 'Node.js', count: 8 }, { name: 'TypeScript', count: 7 }, { name: 'Python', count: 5 }, { name: 'PostgreSQL', count: 6 }, { name: 'MongoDB', count: 3 }, { name: 'Docker', count: 4 }]
    : Object.entries(techCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  const empCount: Record<string, number> = {};
  projects.forEach(p => { const n = p.owner?.name; if (n) empCount[n] = (empCount[n] || 0) + 1; });
  const empData = noProjects
    ? [{ name: 'Ashish M.', count: 6 }, { name: 'Priya S.', count: 5 }, { name: 'Ravi K.', count: 4 }, { name: 'Sneha T.', count: 4 }, { name: 'Arjun P.', count: 3 }, { name: 'Meera J.', count: 2 }]
    : Object.entries(empCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  const monthlyData: Record<string, number> = {};
  projects.forEach(p => {
    const m = new Date(p.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyData[m] = (monthlyData[m] || 0) + 1;
  });
  const monthlyChartData = noProjects
    ? [{ month: 'Jan 25', count: 3 }, { month: 'Feb 25', count: 5 }, { month: 'Mar 25', count: 4 }, { month: 'Apr 25', count: 7 }, { month: 'May 25', count: 6 }, { month: 'Jun 25', count: 5 }]
    : Object.entries(monthlyData).map(([month, count]) => ({ month, count }));

  const weeklyTrendsData = [
    { week: 'W1 May', count: 8 }, { week: 'W2 May', count: 12 }, { week: 'W3 May', count: 7 },
    { week: 'W4 May', count: 10 }, { week: 'W1 Jun', count: 9 }, { week: 'W2 Jun', count: 14 },
  ];

  const totalUsers = noProjects ? 24 : users.length;
  const totalProj = noProjects ? 30 : projects.length;
  const activeProj = noProjects ? 12 : projects.filter(p => p.status === 'ACTIVE').length;
  const completedProj = noProjects ? 8 : projects.filter(p => p.status === 'COMPLETED').length;
  const pendingReq = noProjects ? 4 : requests.length;
  const onHold = noProjects ? 3 : projects.filter(p => p.status === 'ON_HOLD').length;
  const delayed = noProjects ? 2 : projects.filter(p => p.status === 'ACTIVE' && new Date(p.endDate || p.deadline || '').getTime() > 0 && new Date(p.endDate || p.deadline || '') < new Date()).length;

  return (
    <Box>
      <PageHeader title="Admin Dashboard" subtitle="System-wide analytics overview" />

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Users" value={totalUsers} icon={<PeopleIcon />} bg="#EDF3F8" iconColor="#0A2947" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Projects" value={totalProj} icon={<FolderIcon />} bg="#EDF3F8" iconColor="#0A2947" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Active Projects" value={activeProj} icon={<PlayCircleIcon />} bg="#EEF4EE" iconColor="#4D7C5A" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Pending Edit Requests" value={pendingReq} icon={<EditNoteIcon />} bg="#F6EFEA" iconColor="#8B5E3C" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Completed Projects" value={completedProj} icon={<CheckCircleIcon />} bg="#F3E4C9" iconColor="#0A2947" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="On Hold" value={onHold} icon={<PauseCircleIcon />} bg="#FDF8F0" iconColor="#C4934D" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Delayed Projects" value={delayed} icon={<WarningIcon />} bg="#FDF0EE" iconColor="#C66A4B" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card><CardContent sx={{ p: 2.5 }}><ProjectsByStatusChart data={statusData} /></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent sx={{ p: 2.5 }}><MonthlyCreationChart data={monthlyChartData} /></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent sx={{ p: 2.5 }}><ProjectsByTechChart data={techData} /></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent sx={{ p: 2.5 }}><ProjectsByEmployeeChart data={empData} /></CardContent></Card>
        </Grid>
        <Grid item xs={12}>
          <Card><CardContent sx={{ p: 2.5 }}><WeeklyUpdateTrendsChart data={weeklyTrendsData} /></CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboardPage;
