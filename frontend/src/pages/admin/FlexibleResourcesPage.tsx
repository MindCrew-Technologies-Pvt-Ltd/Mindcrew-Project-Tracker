import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Autocomplete, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Alert, Avatar, Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/esm/Delete';
import PageHeader from '../../components/common/PageHeader';
import usersService from '../../services/usersService';
import flexibleResourceService, { FlexibleResource } from '../../services/flexibleResourceService';
import { User } from '../../types/user.types';
import { useAuth } from '../../hooks/useAuth';
import { isTimesheetAdmin } from '../../utils/roleGuards';
import { Navigate } from 'react-router-dom';

const FlexibleResourcesPage = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<FlexibleResource[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Role check: Only Admin and HR Manager can view this
  if (!isTimesheetAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, usersData] = await Promise.all([
        flexibleResourceService.getFlexibleResources(),
        usersService.getUsers({ isActive: true, limit: 1000 })
      ]);
      setResources(resData.data.data);
      setAllUsers(usersData.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setError(null);
    try {
      await flexibleResourceService.addFlexibleResource(selectedUser.id);
      setSelectedUser(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add flexible resource');
    }
    setActionLoading(false);
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user from flexible resources?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await flexibleResourceService.removeFlexibleResource(userId);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove flexible resource');
    }
    setActionLoading(false);
  };

  // Filter out users who are already flexible resources
  const availableUsers = useMemo(() => {
    const existingIds = new Set(resources.map(r => r.userId));
    return allUsers.filter(u => !existingIds.has(u.id));
  }, [allUsers, resources]);

  return (
    <Box>
      <PageHeader title="Flexible Resources" />
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Add New Flexible Resource
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a user to mark them as a flexible resource. Flexible resources are available for assignment across various projects.
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
              options={availableUsers}
              getOptionLabel={(option) => `${option.name} (${option.employeeId || 'No ID'})`}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              disabled={loading || actionLoading}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Select User" 
                  placeholder="Type to search..." 
                  size="medium"
                />
              )}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleAdd}
              disabled={!selectedUser || actionLoading}
              sx={{ minWidth: 120, py: 1.8, borderRadius: 2 }}
            >
              Add Resource
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, mt: 4 }}>
        Current Flexible Resources
      </Typography>
      
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Designation</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : resources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    No flexible resources found. Add one above.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              resources.map((resource) => (
                <TableRow key={resource.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar alt={resource.user.name} sx={{ width: 36, height: 36 }}>
                        {resource.user.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>{resource.user.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{resource.user.employeeId || '-'}</TableCell>
                  <TableCell>{resource.user.department || '-'}</TableCell>
                  <TableCell>{resource.user.designation || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="error" 
                      onClick={() => handleRemove(resource.userId)}
                      disabled={actionLoading}
                      size="small"
                      title="Remove from flexible resources"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default FlexibleResourcesPage;
