import { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, CardActionArea, Chip, Button } from '@mui/material';
import FolderIcon from '@mui/icons-material/esm/Folder';
import PlayCircleIcon from '@mui/icons-material/esm/PlayCircle';
import CheckCircleIcon from '@mui/icons-material/esm/CheckCircle';
import EditNoteIcon from '@mui/icons-material/esm/EditNote';
import PeopleIcon from '@mui/icons-material/esm/People';
import PauseCircleIcon from '@mui/icons-material/esm/PauseCircle';
import WarningIcon from '@mui/icons-material/esm/Warning';
import ArrowBackIcon from '@mui/icons-material/esm/ArrowBack';

import { useAppSelector } from '../../hooks/useAppSelector';
import ProjectsByStatusChart from '../../components/charts/ProjectsByStatusChart';
import ProjectsByTechChart from '../../components/charts/ProjectsByTechChart';
import ProjectsByEmployeeChart from '../../components/charts/ProjectsByEmployeeChart';
import MonthlyCreationChart from '../../components/charts/MonthlyCreationChart';
import WeeklyUpdateTrendsChart from '../../components/charts/WeeklyUpdateTrendsChart';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';
import reportsService from '../../services/reportsService';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  active?: boolean;
  onClick?: () => void;
}

const StatCard = ({ label, value, icon, bg, iconColor, active, onClick }: StatCardProps) => (
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

type ViewType = 'CHARTS' | 'USERS' | 'PROJECTS' | 'ACTIVE_PROJECTS' | 'PENDING_REQUESTS' | 'COMPLETED' | 'ON_HOLD' | 'DELAYED';

export default function ProjectAnalyticsTab() {
  const { list: projects, loading: projectsLoading } = useAppSelector((s) => s.projects);
  const { list: users } = useAppSelector((s) => s.users);
  const { requests } = useAppSelector((s) => s.editRequests);

  const [view, setView] = useState<ViewType>('CHARTS');
  const [weeklyTrendsData, setWeeklyTrendsData] = useState<{week: string, count: number}[]>([]);

  useEffect(() => {
    reportsService.getReport('WEEKLY_UPDATE', {}).then(res => {
      const data = res.data.data || [];
      const weeklyData: Record<string, number> = {};
      data.forEach((u: any) => {
        const d = new Date(u.createdAt);
        // get ISO week
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        const w = `W${weekNum}`;
        weeklyData[w] = (weeklyData[w] || 0) + 1;
      });
      // Sort keys (e.g. W1, W2, W3) and get last 4
      const trendData = Object.keys(weeklyData)
        .sort((a, b) => parseInt(a.replace('W', '')) - parseInt(b.replace('W', '')))
        .map(week => ({ week, count: weeklyData[week] }));
      setWeeklyTrendsData(trendData.slice(-4));
    }).catch(console.error);
  }, []);

  // If initial load is happening, show global loading
  if (projectsLoading && projects.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  // --- Stats Calculations ---
  const delayedProjects = projects.filter(p => p.status === 'ACTIVE' && p.deadline && new Date(p.deadline) < new Date());

  const stats = {
    users: users.length,
    totalProj: projects.length,
    activeProj: projects.filter(p => p.status === 'ACTIVE').length,
    completedProj: projects.filter(p => p.status === 'COMPLETED').length,
    pendingReq: requests.length,
    onHold: projects.filter(p => p.status === 'ON_HOLD').length,
    delayed: delayedProjects.length
  };

  // --- Charts Calculations ---
  const statusData = (['ACTIVE', 'COMPLETED', 'ON_HOLD', 'DRAFT', 'CANCELLED', 'ARCHIVED'] as const)
    .map(s => ({ name: s, value: projects.filter(p => p.status === s).length }))
    .filter(d => d.value > 0);

  const techCount: Record<string, number> = {};
  projects.forEach(p => (p.technologies || []).forEach(t => { techCount[t] = (techCount[t] || 0) + 1; }));
  const techData = Object.entries(techCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  const empCount: Record<string, number> = {};
  projects.forEach(p => { const n = p.owner?.name; if (n) empCount[n] = (empCount[n] || 0) + 1; });
  const empData = Object.entries(empCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  const monthlyData: Record<string, number> = {};
  projects.forEach(p => {
    const m = new Date(p.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyData[m] = (monthlyData[m] || 0) + 1;
  });
  const monthlyChartData = Object.entries(monthlyData).map(([month, count]) => ({ month, count }));

  // Weekly trends data is now fetched from the database on mount

  // --- Table Columns ---
  const userCols: Column<any>[] = [
    { key: 'name', header: 'Name', value: r => r.name },
    { key: 'email', header: 'Email', value: r => r.email },
    { key: 'role', header: 'Role', value: r => r.designation || (r.jobRoles && r.jobRoles[0]) || 'Employee' },
    { key: 'dept', header: 'Department', value: r => r.department || '-' },
  ];

  const projectCols: Column<any>[] = [
    { key: 'name', header: 'Project Name', value: r => r.name },
    { key: 'client', header: 'Client', value: r => r.clientName || '-' },
    { 
      key: 'status', header: 'Status', 
      render: r => {
        const colors: any = { ACTIVE: 'success', COMPLETED: 'info', ON_HOLD: 'warning', DRAFT: 'default', CANCELLED: 'error', ARCHIVED: 'default' };
        return <Chip label={r.status} color={colors[r.status] || 'default'} size="small" />;
      }
    },
    { 
      key: 'priority', header: 'Priority',
      render: r => <Chip label={r.priority} color={r.priority === 'HIGH' || r.priority === 'CRITICAL' ? 'error' : 'default'} size="small" variant="outlined" />
    },
    { key: 'deadline', header: 'Deadline', value: r => r.deadline ? new Date(r.deadline).toLocaleDateString() : '-' },
  ];

  const reqCols: Column<any>[] = [
    { key: 'project', header: 'Project', value: r => r.project?.name || '-' },
    { key: 'by', header: 'Requested By', value: r => r.requestedBy?.name || '-' },
    { key: 'reason', header: 'Reason', value: r => r.reason },
    { key: 'date', header: 'Date', value: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  // --- Render Table View ---
  const renderTableView = () => {
    let tableData: any[] = [];
    let columns: Column<any>[] = [];
    let title = '';

    switch (view) {
      case 'USERS': tableData = users; columns = userCols; title = 'All Users'; break;
      case 'PROJECTS': tableData = projects; columns = projectCols; title = 'All Projects'; break;
      case 'ACTIVE_PROJECTS': tableData = projects.filter(p => p.status === 'ACTIVE'); columns = projectCols; title = 'Active Projects'; break;
      case 'COMPLETED': tableData = projects.filter(p => p.status === 'COMPLETED'); columns = projectCols; title = 'Completed Projects'; break;
      case 'ON_HOLD': tableData = projects.filter(p => p.status === 'ON_HOLD'); columns = projectCols; title = 'On Hold Projects'; break;
      case 'DELAYED': tableData = delayedProjects; columns = projectCols; title = 'Delayed Projects'; break;
      case 'PENDING_REQUESTS': tableData = requests; columns = reqCols; title = 'Pending Edit Requests'; break;
      default: return null;
    }

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{title} ({tableData.length})</Typography>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setView('CHARTS')} variant="outlined" size="small">
              Back to Charts
            </Button>
          </Box>
          <DataTablePro columns={columns} rows={tableData} getId={r => r.id} />
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Users" value={stats.users} icon={<PeopleIcon />} bg="#EEF0FF" iconColor="#4F46E5" active={view === 'USERS'} onClick={() => setView(view === 'USERS' ? 'CHARTS' : 'USERS')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Projects" value={stats.totalProj} icon={<FolderIcon />} bg="#EEF0FF" iconColor="#4F46E5" active={view === 'PROJECTS'} onClick={() => setView(view === 'PROJECTS' ? 'CHARTS' : 'PROJECTS')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Active Projects" value={stats.activeProj} icon={<PlayCircleIcon />} bg="#E9F9EF" iconColor="#16A34A" active={view === 'ACTIVE_PROJECTS'} onClick={() => setView(view === 'ACTIVE_PROJECTS' ? 'CHARTS' : 'ACTIVE_PROJECTS')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Pending Edit Requests" value={stats.pendingReq} icon={<EditNoteIcon />} bg="#EDE9FE" iconColor="#7C3AED" active={view === 'PENDING_REQUESTS'} onClick={() => setView(view === 'PENDING_REQUESTS' ? 'CHARTS' : 'PENDING_REQUESTS')} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Completed Projects" value={stats.completedProj} icon={<CheckCircleIcon />} bg="#EEF0FF" iconColor="#4F46E5" active={view === 'COMPLETED'} onClick={() => setView(view === 'COMPLETED' ? 'CHARTS' : 'COMPLETED')} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="On Hold" value={stats.onHold} icon={<PauseCircleIcon />} bg="#FEF3E2" iconColor="#F59E0B" active={view === 'ON_HOLD'} onClick={() => setView(view === 'ON_HOLD' ? 'CHARTS' : 'ON_HOLD')} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Delayed Projects" value={stats.delayed} icon={<WarningIcon />} bg="#FDF0EE" iconColor="#C66A4B" active={view === 'DELAYED'} onClick={() => setView(view === 'DELAYED' ? 'CHARTS' : 'DELAYED')} />
        </Grid>
      </Grid>

      {view === 'CHARTS' ? (
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
      ) : (
        renderTableView()
      )}
    </Box>
  );
}
