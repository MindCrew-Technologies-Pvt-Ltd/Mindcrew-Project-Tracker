import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, Button, Grid, Snackbar, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchEditRequestsThunk, approveEditRequestThunk, rejectEditRequestThunk } from '../../store/slices/editRequestsSlice';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime } from '../../utils/formatters';
import { EditRequestStatus } from '../../types/editRequest.types';

const EditRequestsPage = () => {
  const dispatch = useAppDispatch();
  const { requests, loading } = useAppSelector((s) => s.editRequests);
  const [statusFilter, setStatusFilter] = useState<EditRequestStatus | ''>('PENDING');
  const [toast, setToast] = useState('');

  useEffect(() => {
    dispatch(fetchEditRequestsThunk({ status: statusFilter || undefined }));
  }, [statusFilter, dispatch]);

  const handleApprove = async (id: string) => {
    await dispatch(approveEditRequestThunk(id));
    setToast('Edit request approved');
  };

  const handleReject = async (id: string) => {
    await dispatch(rejectEditRequestThunk({ id, reason: 'Not approved by admin' }));
    setToast('Edit request rejected');
  };

  return (
    <Box>
      <PageHeader title="Edit Requests" subtitle="Manage project edit access requests" />

      <FormControl size="small" sx={{ mb: 3, minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value as EditRequestStatus | '')}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="APPROVED">Approved</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
        </Select>
      </FormControl>

      {loading ? <LoadingSpinner /> : requests.length === 0 ? (
        <EmptyState title="No edit requests" description="There are no edit requests matching your filter." />
      ) : (
        <Grid container spacing={2}>
          {requests.map(req => (
            <Grid item xs={12} md={6} key={req.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">{req.project?.name || 'Project'}</Typography>
                    <Chip label={req.status} size="small" color={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'error' : 'warning'} />
                  </Box>
                  <Typography variant="body2"><strong>Requested by:</strong> {req.requestedBy?.name}</Typography>
                  <Typography variant="body2"><strong>Reason:</strong> {req.reason}</Typography>
                  <Typography variant="body2"><strong>Duration:</strong> {req.duration}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDateTime(req.createdAt)}</Typography>
                  {req.status === 'PENDING' && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      <Button size="small" variant="contained" color="success" onClick={() => handleApprove(req.id)}>Approve</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleReject(req.id)}>Reject</Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
};

export default EditRequestsPage;
