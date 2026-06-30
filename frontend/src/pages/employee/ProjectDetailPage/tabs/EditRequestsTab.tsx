import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Alert } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { editRequestSchema } from '../../../../utils/validators';
import axiosInstance from '../../../../services/axiosInstance';
import { Project } from '../../../../types/project.types';
import { CreateEditRequestPayload, EditRequest } from '../../../../types/editRequest.types';
import { formatDateTime } from '../../../../utils/formatters';
import EmptyState from '../../../../components/common/EmptyState';

interface Props { project: Project; isOwner: boolean; isAdmin: boolean; }

const DURATION_OPTIONS = ['1 day', '3 days', '1 week', '2 weeks'];

const EditRequestsTab = ({ project, isOwner, isAdmin }: Props) => {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateEditRequestPayload>({
    resolver: yupResolver(editRequestSchema) as any,
  });

  useEffect(() => {
    axiosInstance.get('/edit-requests', { params: { projectId: project.id } })
      .then(r => setRequests(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [project.id]);

  const onSubmit = async (data: CreateEditRequestPayload) => {
    setSending(true);
    try {
      await axiosInstance.post('/projects/' + project.id + '/edit-request', data);
      setSuccess(true);
      reset();
    } catch {}
    setSending(false);
  };

  const handleApprove = async (id: string) => {
    await axiosInstance.put('/admin/edit-requests/' + id + '/approve');
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
  };

  const handleReject = async (id: string) => {
    await axiosInstance.put('/admin/edit-requests/' + id + '/reject', { reason: 'Rejected' });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
  };

  return (
    <Box>
      {!isOwner && !isAdmin && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Request Edit Access</Typography>
            {success ? (
              <Alert severity="success">Edit request submitted. You will be notified once approved.</Alert>
            ) : (
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <TextField label="Reason" fullWidth multiline rows={3} sx={{ mb: 2 }} error={!!errors.reason} helperText={errors.reason?.message} {...register('reason')} />
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Duration</InputLabel>
                  <Select label="Duration" defaultValue="" {...register('duration')}>
                    {DURATION_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Comments (optional)" fullWidth sx={{ mb: 2 }} {...register('comments')} />
                <Button type="submit" variant="contained" disabled={sending}>Submit Request</Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Typography variant="subtitle1" fontWeight={600} mb={2}>Edit Requests ({requests.length})</Typography>
      {requests.length === 0 ? (
        <EmptyState title="No edit requests" />
      ) : requests.map((r) => (
        <Card key={r.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>{r.requestedBy?.name}</Typography>
              <Chip label={r.status} size="small" color={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'error' : 'warning'} />
            </Box>
            <Typography variant="body2" color="text.secondary" mb={1}>{r.reason}</Typography>
            <Typography variant="caption" color="text.secondary">Duration: {r.duration} · {formatDateTime(r.createdAt)}</Typography>
            {isAdmin && r.status === 'PENDING' && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button size="small" variant="contained" color="success" onClick={() => handleApprove(r.id)}>Approve</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleReject(r.id)}>Reject</Button>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default EditRequestsTab;
