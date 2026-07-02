import { useEffect, useState } from 'react';
import { Box, Card, Typography, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import { Visibility as ViewIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk, setFilters, deleteProjectThunk } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ProjectStatusChip from '../../components/project/ProjectStatusChip';
import PriorityChip from '../../components/project/PriorityChip';
import { ROUTES } from '../../constants/routes';
import { ProjectStatus } from '../../types/project.types';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/formatters';

const cellSx = { py: 2, px: 3, fontSize: '0.875rem', color: 'text.secondary', borderBottom: '1px solid #EEF0F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;
const headSx = { py: 1.75, px: 3, textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '1px solid #E9EBF2' } as const;

const AdminProjectsListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, filters, pagination, loading } = useAppSelector((s) => s.projects);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { dispatch(setFilters({ search: debouncedSearch, page: 1 })); }, [debouncedSearch, dispatch]);
  useEffect(() => { dispatch(fetchProjectsThunk({ ...filters, pageSize: 100 })); }, [filters, dispatch]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const result = await dispatch(deleteProjectThunk(toDelete.id));
    if (deleteProjectThunk.rejected.match(result)) setErrorMsg((result.payload as string) || 'Failed to delete project');
    else dispatch(fetchProjectsThunk({ ...filters, pageSize: 100 }));
    setToDelete(null);
  };

  return (
    <Box>
      <PageHeader title="All Projects" subtitle={pagination.total + ' projects'} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status || ''} label="Status" onChange={(e) => dispatch(setFilters({ status: (e.target.value as ProjectStatus) || undefined, page: 1 }))}>
            <MenuItem value="">All</MenuItem>
            {(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as ProjectStatus[]).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Card sx={{ overflowX: 'auto', p: 0 }}>
        {loading ? (
          <Box sx={{ py: 6 }}><LoadingSpinner /></Box>
        ) : list.length === 0 ? (
          <Box sx={{ py: 6 }}><EmptyState title="No projects found" /></Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 820 }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ ...headSx, width: '26%' }}>Project</Box>
                <Box component="th" sx={{ ...headSx, width: '16%' }}>Owner</Box>
                <Box component="th" sx={{ ...headSx, width: '14%' }}>Status</Box>
                <Box component="th" sx={{ ...headSx, width: '12%' }}>Priority</Box>
                <Box component="th" sx={{ ...headSx, width: '22%' }}>Timeline</Box>
                <Box component="th" sx={{ ...headSx, width: '10%', textAlign: 'right' }}>Actions</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {list.map((p) => (
                <Box component="tr" key={p.id} sx={{ transition: 'background 0.15s ease', '&:hover': { bgcolor: '#F7F8FD' }, '&:last-of-type td': { borderBottom: 'none' } }}>
                  <Box component="td" sx={{ ...cellSx, whiteSpace: 'normal', cursor: 'pointer' }} onClick={() => navigate(ROUTES.ADMIN_PROJECT_DETAIL(p.id))}>
                    <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', lineHeight: 1.3 }}>{p.name}</Typography>
                    <Typography noWrap sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{p.clientName || '—'}</Typography>
                  </Box>
                  <Box component="td" sx={cellSx}>{p.owner?.name || '—'}</Box>
                  <Box component="td" sx={cellSx}><ProjectStatusChip status={p.status} /></Box>
                  <Box component="td" sx={cellSx}><PriorityChip priority={p.priority} /></Box>
                  <Box component="td" sx={cellSx}>{formatDate(p.startDate)} – {formatDate(p.endDate || p.deadline) || 'Ongoing'}</Box>
                  <Box component="td" sx={{ ...cellSx, textAlign: 'right', pr: 2 }}>
                    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                      <Tooltip title="View project" arrow>
                        <IconButton size="small" sx={{ color: '#4F46E5' }} onClick={() => navigate(ROUTES.ADMIN_PROJECT_DETAIL(p.id))}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete project" arrow>
                        <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => setToDelete({ id: p.id, name: p.name })}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete Project"
        message={`Permanently delete "${toDelete?.name}" and all its data? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <Snackbar open={!!errorMsg} autoHideDuration={5000} onClose={() => setErrorMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminProjectsListPage;
