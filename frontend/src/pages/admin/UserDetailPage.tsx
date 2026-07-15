import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, Avatar, Chip, Button, List, ListItem, ListItemText, Divider, CircularProgress } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchUserByIdThunk, deactivateUserThunk } from '../../store/slices/usersSlice';
import PageHeader from '../../components/common/PageHeader';
import { ROUTES } from '../../constants/routes';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useState } from 'react';
import axiosInstance from '../../services/axiosInstance';
import { ActivityLog } from '../../types/activityLog.types';
import { ProjectStatus, ProjectPriority } from '../../types/project.types';
import ProjectStatusChip from '../../components/project/ProjectStatusChip';
import PriorityChip from '../../components/project/PriorityChip';

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentUser: user, loading } = useAppSelector((s) => s.users);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (id) {
      dispatch(fetchUserByIdThunk(id));
      axiosInstance.get('/admin/activity-logs', { params: { userId: id, pageSize: 10 } }).then(r => setLogs(r.data?.data || [])).catch(() => {});
    }
  }, [id, dispatch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!user) return null;

  return (
    <Box>
      <PageHeader title={user.name} breadcrumbs={[{ label: 'Users', href: ROUTES.ADMIN_USERS }, { label: user.name }]} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 32 }}>
                {user.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6">{user.name}</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>{user.email}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Chip label={user.role} size="small" color={user.role === 'ADMIN' ? 'secondary' : 'default'} />
                <Chip label={user.isActive ? 'ACTIVE' : 'INACTIVE'} size="small" color={user.isActive ? 'success' : 'error'} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              {[
                { label: 'Phone', value: user.phone },
                { label: 'Department', value: user.department },
                { label: 'Designation', value: user.designation },
                { label: 'Joined', value: formatDate(user.createdAt) },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{value || '–'}</Typography>
                </Box>
              ))}
              {user.isActive && (
                <Button color="error" variant="outlined" fullWidth sx={{ mt: 1 }}
                  onClick={() => dispatch(deactivateUserThunk(user.id)).then(() => navigate(ROUTES.ADMIN_USERS))}>
                  Deactivate User
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Projects ({user.ownedProjects?.length ?? 0})
              </Typography>
              {!user.ownedProjects?.length ? (
                <Typography variant="body2" color="text.secondary">No projects created by this user</Typography>
              ) : (
                <List disablePadding>
                  {user.ownedProjects.map((p, i) => (
                    <Box key={p.id}>
                      {i > 0 && <Divider />}
                      <ListItem disablePadding sx={{ py: 1.25, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                        <ListItemText
                          sx={{ flex: '1 1 auto', minWidth: 0, my: 0 }}
                          primary={
                            <Typography
                              component="span"
                              variant="body2"
                              onClick={() => navigate(ROUTES.ADMIN_PROJECT_DETAIL(p.id))}
                              sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            >
                              {p.name}
                            </Typography>
                          }
                          secondary={`${p.clientName ? p.clientName + ' · ' : ''}Created ${formatDate(p.createdAt)}`}
                        />
                        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                          <ProjectStatusChip status={p.status as ProjectStatus} />
                          <PriorityChip priority={p.priority as ProjectPriority} />
                        </Box>
                      </ListItem>
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Recent Activity</Typography>
              {logs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No activity found</Typography>
              ) : (
                <List disablePadding>
                  {logs.map((log, i) => (
                    <Box key={log.id}>
                      {i > 0 && <Divider />}
                      <ListItem disablePadding sx={{ py: 1 }}>
                        <ListItemText
                          primary={<Box sx={{ display: 'flex', gap: 1 }}><Chip label={log.action} size="small" variant="outlined" /><Typography variant="body2">{log.description}</Typography></Box>}
                          secondary={formatDateTime(log.createdAt)}
                        />
                      </ListItem>
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserDetailPage;
