import { useEffect, useState } from 'react';
import { Box, Typography, Snackbar, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip } from '@mui/material';
import { CheckCircleOutline as ApproveIcon, HighlightOff as RejectIcon, RemoveCircleOutline as RevokeIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchEditRequestsThunk, approveEditRequestThunk, rejectEditRequestThunk, revokeEditRequestThunk } from '../../store/slices/editRequestsSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';
import { formatDateTime } from '../../utils/formatters';
import { EditRequestStatus, EditRequest } from '../../types/editRequest.types';

const StatusPill = ({ status }: { status: EditRequestStatus }) => {
  const map = {
    PENDING: { bg: '#FEF3E2', color: '#B45309', label: 'Pending' },
    APPROVED: { bg: '#E9F9EF', color: '#15803D', label: 'Approved' },
    REJECTED: { bg: '#FDECEC', color: '#B91C1C', label: 'Rejected' },
    REVOKED: { bg: '#F1F5F9', color: '#64748B', label: 'Revoked' },
  }[status];
  return <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.5, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600, bgcolor: map.bg, color: map.color }}>{map.label}</Box>;
};

const EditRequestsPage = () => {
  const dispatch = useAppDispatch();
  const { requests, loading } = useAppSelector((s) => s.editRequests);
  const [statusFilter, setStatusFilter] = useState<EditRequestStatus | ''>('PENDING');
  const [toast, setToast] = useState('');

  useEffect(() => { dispatch(fetchEditRequestsThunk({ status: statusFilter || undefined })); }, [statusFilter, dispatch]);

  const handleApprove = async (id: string) => { await dispatch(approveEditRequestThunk(id)); setToast('Edit request approved'); };
  const handleReject = async (id: string) => { await dispatch(rejectEditRequestThunk({ id, reason: 'Not approved by admin' })); setToast('Edit request rejected'); };
  const handleRevoke = async (id: string) => { await dispatch(revokeEditRequestThunk(id)); setToast('Edit access revoked'); };

  const columns: Column<EditRequest>[] = [
    { key: 'project', header: 'Project', width: '20%', sortable: true, value: (r) => r.project?.name || '', render: (r) => <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>{r.project?.name || '—'}</Typography> },
    { key: 'requestedBy', header: 'Requested By', width: '16%', sortable: true, value: (r) => r.requestedBy?.name || '', render: (r) => r.requestedBy?.name || '—' },
    { key: 'reason', header: 'Reason', width: '38%', render: (r) => r.reason },
    { key: 'status', header: 'Status', width: '12%', sortable: true, value: (r) => r.status, render: (r) => <StatusPill status={r.status} /> },
    { key: 'createdAt', header: 'Date', width: '14%', sortable: true, value: (r) => r.createdAt, render: (r) => formatDateTime(r.createdAt) },
  ];

  const rowActions = (r: EditRequest) => {
    if (r.status === 'PENDING') return (
      <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
        <Tooltip title="Approve" arrow><IconButton size="small" sx={{ color: '#16A34A' }} onClick={() => handleApprove(r.id)}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Reject" arrow><IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleReject(r.id)}><RejectIcon fontSize="small" /></IconButton></Tooltip>
      </Box>
    );
    if (r.status === 'APPROVED') return (
      <Tooltip title="Revoke access" arrow><IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => handleRevoke(r.id)}><RevokeIcon fontSize="small" /></IconButton></Tooltip>
    );
    return <Box sx={{ color: 'text.disabled' }}>—</Box>;
  };

  return (
    <Box>
      <PageHeader title="Edit Requests" subtitle="Manage project edit access requests" />

      <FormControl size="small" sx={{ mb: 2.5, minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value as EditRequestStatus | '')}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="APPROVED">Approved</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
          <MenuItem value="REVOKED">Revoked</MenuItem>
        </Select>
      </FormControl>

      <DataTablePro
        rows={requests}
        columns={columns}
        getId={(r) => r.id}
        loading={loading}
        emptyText="No edit requests"
        minWidth={880}
        rowActions={rowActions}
      />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
};

export default EditRequestsPage;
