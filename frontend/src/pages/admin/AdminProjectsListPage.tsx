import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import { Visibility as ViewIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk, setFilters, deleteProjectThunk } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ProjectStatusChip from '../../components/project/ProjectStatusChip';
import PriorityChip from '../../components/project/PriorityChip';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';
import { ROUTES } from '../../constants/routes';
import { ProjectStatus, ProjectPriority, Project } from '../../types/project.types';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/formatters';

const AdminProjectsListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, filters, loading } = useAppSelector((s) => s.projects);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const debouncedSearch = useDebounce(search);
  const [toDelete, setToDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { dispatch(setFilters({ search: debouncedSearch, page: 1 })); }, [debouncedSearch, dispatch]);
  useEffect(() => { dispatch(fetchProjectsThunk({ ...filters, pageSize: 200 })); }, [filters, dispatch]);

  const filtered = useMemo(() => list.filter((p) => !priorityFilter || p.priority === priorityFilter), [list, priorityFilter]);

  const doDelete = async () => {
    if (!toDelete) return;
    const results = await Promise.all(toDelete.ids.map((id) => dispatch(deleteProjectThunk(id))));
    const failed = results.filter((r) => deleteProjectThunk.rejected.match(r));
    if (failed.length) setErrorMsg((failed[0].payload as string) || `${failed.length} could not be deleted`);
    dispatch(fetchProjectsThunk({ ...filters, pageSize: 200 }));
    setToDelete(null);
  };

  const columns: Column<Project>[] = [
    {
      key: 'name', header: 'Project', width: '26%', sortable: true, value: (p) => p.name,
      render: (p) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', lineHeight: 1.3 }}>{p.name}</Typography>
          <Typography noWrap sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{p.clientName || '—'}</Typography>
        </Box>
      ),
    },
    { key: 'owner', header: 'Owner', width: '14%', sortable: true, value: (p) => p.owner?.name || '', render: (p) => p.owner?.name || '—' },
    { key: 'status', header: 'Status', width: '12%', sortable: true, value: (p) => p.status, render: (p) => <ProjectStatusChip status={p.status} /> },
    { key: 'priority', header: 'Priority', width: '11%', sortable: true, value: (p) => p.priority, render: (p) => <PriorityChip priority={p.priority} /> },
    { key: 'startDate', header: 'Timeline', width: '17%', sortable: true, value: (p) => p.startDate, render: (p) => `${formatDate(p.startDate)} – ${formatDate(p.endDate || p.deadline) || 'Ongoing'}` },
    { key: 'createdAt', header: 'Added', width: '12%', sortable: true, value: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
  ];

  const rowActions = (p: Project) => (
    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
      <Tooltip title="View project" arrow><IconButton size="small" sx={{ color: '#4F46E5' }} onClick={(e) => { e.stopPropagation(); navigate(ROUTES.ADMIN_PROJECT_DETAIL(p.id)); }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete project" arrow><IconButton size="small" sx={{ color: '#DC2626' }} onClick={(e) => { e.stopPropagation(); setToDelete({ ids: [p.id], label: `"${p.name}"` }); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
    </Box>
  );

  return (
    <Box>
      <PageHeader title="All Projects" subtitle={filtered.length + ' projects'} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status || ''} label="Status" onChange={(e) => dispatch(setFilters({ status: (e.target.value as ProjectStatus) || undefined, page: 1 }))}>
            <MenuItem value="">All</MenuItem>
            {(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as ProjectStatus[]).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as ProjectPriority[]).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <DataTablePro
        rows={filtered}
        columns={columns}
        getId={(p) => p.id}
        loading={loading}
        emptyText="No projects found"
        minWidth={860}
        selectable
        onRowClick={(p) => navigate(ROUTES.ADMIN_PROJECT_DETAIL(p.id))}
        rowActions={rowActions}
        onBulkDelete={(ids) => setToDelete({ ids, label: `${ids.length} project(s)` })}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete Project"
        message={`Permanently delete ${toDelete?.label} and all their data? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
      <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminProjectsListPage;
