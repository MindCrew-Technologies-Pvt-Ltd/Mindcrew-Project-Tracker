import { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
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
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<EditRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const canReview = isOwner || isAdmin;

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreateEditRequestPayload>({
    resolver: yupResolver(editRequestSchema) as any,
    defaultValues: { duration: '' as any },
  });

  const loadRequests = useCallback(() => {
    axiosInstance.get('/edit-requests', { params: { projectId: project.id } })
      .then(r => setRequests(r.data?.data || []))
      .catch(() => {});
  }, [project.id]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const onSubmit = async (data: CreateEditRequestPayload) => {
    setSending(true);
    setErrorMsg(null);
    try {
      await axiosInstance.post('/projects/' + project.id + '/edit-request', data);
      setSuccess(true);
      reset();
      loadRequests();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Could not submit the request');
    }
    setSending(false);
  };

  const handleApprove = async (id: string) => {
    setErrorMsg(null);
    try {
      await axiosInstance.put('/edit-requests/' + id + '/approve');
      loadRequests();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Could not approve the request');
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    setErrorMsg(null);
    try {
      await axiosInstance.put('/edit-requests/' + rejecting.id + '/reject', rejectReason.trim() ? { reason: rejectReason.trim() } : {});
      setRejecting(null);
      setRejectReason('');
      loadRequests();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Could not reject the request');
    }
  };

  return (
    <Box>
      {errorMsg && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

      {!canReview && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Request Edit Access</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Your request goes to the project owner ({project.owner?.name || 'the owner'}) for approval.
            </Typography>
            {success ? (
              <Alert severity="success">Edit request submitted. You will be notified once the owner reviews it.</Alert>
            ) : (
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <TextField label="Reason" fullWidth multiline rows={3} sx={{ mb: 2 }} error={!!errors.reason} helperText={errors.reason?.message} {...register('reason')} />
                <FormControl fullWidth size="small" sx={{ mb: 2 }} error={!!errors.duration}>
                  <InputLabel>Duration</InputLabel>
                  <Controller
                    name="duration"
                    control={control}
                    render={({ field }) => (
                      <Select label="Duration" {...field} value={field.value || ''}>
                        {DURATION_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                      </Select>
                    )}
                  />
                  {errors.duration && <Typography variant="caption" color="error" sx={{ mt: 0.5, mx: 1.75 }}>{errors.duration.message}</Typography>}
                </FormControl>
                <TextField label="Comments (optional)" fullWidth sx={{ mb: 2 }} {...register('comments')} />
                <Button type="submit" variant="contained" disabled={sending}>Submit Request</Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        {canReview ? `Edit Requests (${requests.length})` : `My Requests (${requests.length})`}
      </Typography>
      {requests.length === 0 ? (
        <EmptyState
          title={canReview ? 'No edit requests' : 'No requests yet'}
          description={canReview
            ? 'Requests from other users to edit this project will appear here for your approval.'
            : 'Once you submit a request, its status will show here.'}
        />
      ) : requests.map((r) => (
        <Card key={r.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>{r.requestedBy?.name}</Typography>
              <Chip label={r.status} size="small" color={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'error' : 'warning'} />
            </Box>
            <Typography variant="body2" color="text.secondary" mb={1}>{r.reason}</Typography>
            <Typography variant="caption" color="text.secondary">Duration: {r.duration} · {formatDateTime(r.createdAt)}</Typography>
            {canReview && r.status === 'PENDING' && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button size="small" variant="contained" color="success" onClick={() => handleApprove(r.id)}>Approve</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => { setRejecting(r); setRejectReason(''); }}>Reject</Button>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Edit Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Rejecting {rejecting?.requestedBy?.name}'s request. You can add an optional reason — it is sent to the requester.
          </Typography>
          <TextField autoFocus label="Reason (optional)" fullWidth multiline rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleReject}>Reject Request</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditRequestsTab;
