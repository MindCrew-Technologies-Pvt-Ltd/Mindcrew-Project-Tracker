import { useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, Button, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { Folder as FolderIcon, CheckCircle as CheckCircleIcon, PlayCircle as PlayCircleIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatRelative } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h4" fontWeight={700} mt={0.5}>{value}</Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: color + '20' }}>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: projects, loading } = useAppSelector((s) => s.projects);

  useEffect(() => {
    // The dashboard shows the employee's own numbers, not the whole company's.
    dispatch(fetchProjectsThunk({ pageSize: 100, scope: 'mine' }));
  }, [dispatch]);

  if (loading) return <LoadingSpinner />;

  const total = projects.length;
  const active = projects.filter(p => p.status === 'ACTIVE').length;
  const completed = projects.filter(p => p.status === 'COMPLETED').length;
  const recent = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  const upcoming = projects.filter(p => p.status === 'ACTIVE' && new Date(p.endDate || p.deadline || '') > new Date()).sort((a, b) => new Date(a.endDate || a.deadline || '').getTime() - new Date(b.endDate || b.deadline || '').getTime()).slice(0, 5);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your projects"
        action={<Button variant="contained" onClick={() => navigate(ROUTES.PROJECT_NEW)}>+ New Project</Button>}
      />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Projects" value={total} icon={<FolderIcon />} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Active Projects" value={active} icon={<PlayCircleIcon />} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Completed" value={completed} icon={<CheckCircleIcon />} color="#9c27b0" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="On Hold" value={projects.filter(p => p.status === 'ON_HOLD').length} icon={<WarningIcon />} color="#ed6c02" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Recent Activity</Typography>
                <Button size="small" onClick={() => navigate(ROUTES.PROJECTS)}>View all</Button>
              </Box>
              {recent.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No recent projects</Typography>
              ) : (
                <List disablePadding>
                  {recent.map((p, i) => (
                    <Box key={p.id}>
                      {i > 0 && <Divider />}
                      <ListItem disablePadding sx={{ py: 1, cursor: 'pointer' }} onClick={() => navigate(ROUTES.PROJECT_DETAIL(p.id))}>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={500}>{p.name}</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">Updated {formatRelative(p.updatedAt)}</Typography>}
                        />
                        <Chip label={p.status} size="small" sx={{ ml: 1 }} />
                      </ListItem>
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Upcoming Deadlines</Typography>
              {upcoming.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No upcoming deadlines</Typography>
              ) : (
                <List disablePadding>
                  {upcoming.map((p, i) => {
                    const daysLeft = Math.ceil((new Date(p.endDate || p.deadline || '').getTime() - Date.now()) / 86400000);
                    return (
                      <Box key={p.id}>
                        {i > 0 && <Divider />}
                        <ListItem disablePadding sx={{ py: 1, cursor: 'pointer' }} onClick={() => navigate(ROUTES.PROJECT_DETAIL(p.id))}>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={500}>{p.name}</Typography>}
                            secondary={<Typography variant="caption">{formatDate(p.endDate || p.deadline || '')}</Typography>}
                          />
                          <Chip label={daysLeft <= 7 ? 'Urgent' : daysLeft + 'd'} size="small" color={daysLeft <= 7 ? 'error' : daysLeft <= 30 ? 'warning' : 'default'} />
                        </ListItem>
                      </Box>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
