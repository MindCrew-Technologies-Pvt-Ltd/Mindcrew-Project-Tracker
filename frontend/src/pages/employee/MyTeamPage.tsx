import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Avatar, Button, TextField, Autocomplete, CircularProgress, Alert, Snackbar, Paper } from '@mui/material';
import GroupAddIcon from '@mui/icons-material/esm/GroupAdd';
import usersService from '../../services/usersService';
import { User } from '../../types/user.types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAppSelector } from '../../hooks/useAppSelector';
import PersonIcon from '@mui/icons-material/esm/Person';
import WorkIcon from '@mui/icons-material/esm/Work';

const MyTeamPage = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [team, setTeam] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTeam = async () => {
    try {
      const res = await usersService.getMyTeam();
      setTeam(res.data.data);
    } catch (e: any) {
      setError('Failed to load team members');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await usersService.getUsers({ pageSize: 1000 }); // Getting a list to search from
      setAllUsers(res.data.data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchTeam(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selectedUser?.employeeId) {
      setError('Selected user must have an Employee ID to be assigned');
      return;
    }
    setAssigning(true);
    setError('');
    try {
      await usersService.assignReportee(selectedUser.employeeId);
      setSuccess('Employee successfully assigned to your team!');
      setSelectedUser(null);
      await fetchTeam();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to assign employee');
    }
    setAssigning(false);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <Box>
      <PageHeader title="My Team" />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Assign New Reportee */}
        <Grid item xs={12} md={4}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Add to Your Team
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Search and assign employees to report directly to you.
              </Typography>

              {!user?.employeeId ? (
                <Alert severity="warning">
                  You must set your own Employee ID in your Profile before you can assign reportees.
                </Alert>
              ) : (
                <Box>
                  <Autocomplete
                    options={allUsers.filter((u) => u.id !== user?.id && !team.some((t) => t.id === u.id))}
                    getOptionLabel={(option) => `${option.name} (${option.employeeId || 'No Emp ID'})`}
                    value={selectedUser}
                    onChange={(_, newValue) => setSelectedUser(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Search Employee" placeholder="Type a name..." />
                    )}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={assigning ? <CircularProgress size={20} color="inherit" /> : <GroupAddIcon />}
                    sx={{ mt: 3, py: 1.2, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 600 }}
                    onClick={handleAssign}
                    disabled={!selectedUser || assigning}
                  >
                    Assign to Me
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Team List */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }} elevation={0}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Direct Reportees ({team.length})
            </Typography>

            {team.length === 0 ? (
              <Box textAlign="center" py={5}>
                <Typography color="text.secondary">You have no employees assigned to your team yet.</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {team.map((member) => (
                  <Grid item xs={12} sm={6} key={member.id}>
                    <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2 }}>
                        <Avatar sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', fontWeight: 600 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box flex={1} overflow="hidden">
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {member.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                            <WorkIcon sx={{ fontSize: 14 }} /> {member.designation || 'No Designation'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                            <PersonIcon sx={{ fontSize: 14 }} /> ID: {member.employeeId || 'N/A'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')} message={success} />
    </Box>
  );
};

export default MyTeamPage;
