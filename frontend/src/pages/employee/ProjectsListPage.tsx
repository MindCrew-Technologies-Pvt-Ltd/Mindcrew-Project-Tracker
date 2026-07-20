import { useEffect, useState } from 'react';
import { Box, Grid, Button, MenuItem, Select, FormControl, InputLabel, ToggleButtonGroup, ToggleButton, Pagination, Skeleton, Snackbar, Alert, Typography, Avatar, IconButton, Tooltip } from '@mui/material';
import { GridView as GridViewIcon, List as ListIcon, Visibility as ViewIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk, setFilters, deleteProjectThunk } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import ProjectCard from '../../components/project/ProjectCard';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ProjectStatusChip from '../../components/project/ProjectStatusChip';
import PriorityChip from '../../components/project/PriorityChip';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { ROUTES } from '../../constants/routes';
import { ProjectStatus, ProjectPriority, Project } from '../../types/project.types';
import { formatDate } from '../../utils/formatters';

interface Props {
  /** When true the page is "My Projects" — locked to the user's own/team projects. */
  scopeMine?: boolean;
}

const ProjectsListPage = ({ scopeMine = false }: Props) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { list, filters, pagination, loading } = useAppSelector((s) => s.projects);
  // All Projects opens as the CRM table; My Projects opens as cards.
  const [view, setView] = useState<'grid' | 'list'>(scopeMine ? 'grid' : 'list');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The page's scope is fixed by the route (My Projects vs All Projects).
  // The component instance survives navigation between the two routes, so the
  // default view must be re-applied when the scope changes.
  useEffect(() => {
    dispatch(setFilters({ scope: scopeMine ? 'mine' : undefined, page: 1 }));
    setView(scopeMine ? 'grid' : 'list');
  }, [scopeMine, dispatch]);

  // List view mirrors the admin tables: load a big page and let the table
  // paginate client-side; grid view keeps server-side pagination.
  useEffect(() => {
    dispatch(setFilters({ pageSize: view === 'list' ? 200 : undefined, page: 1 }));
  }, [view, dispatch]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const result = await dispatch(deleteProjectThunk(toDelete.id));
    if (deleteProjectThunk.rejected.match(result)) setErrorMsg((result.payload as string) || 'Failed to delete project');
    else dispatch(fetchProjectsThunk(filters));
    setToDelete(null);
  };

  useEffect(() => {
    dispatch(setFilters({ search: debouncedSearch, page: 1 }));
  }, [debouncedSearch, dispatch]);

  // Scope is forced into every fetch from the prop — relying on the store's
  // filters alone races on first load (the initial fetch could run before the
  // scope effect lands, briefly showing ALL projects on My Projects).
  useEffect(() => {
    dispatch(fetchProjectsThunk({ ...filters, scope: scopeMine ? 'mine' : undefined }));
  }, [filters, scopeMine, dispatch]);

  const columns: Column<Project>[] = [
    {
      key: 'name', header: 'Project', width: '24%', sortable: true, value: (p) => p.name,
      render: (p) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', lineHeight: 1.3 }}>{p.name}</Typography>
          <Typography noWrap sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{p.clientName || '—'}</Typography>
        </Box>
      ),
    },
    {
      key: 'owner', header: 'Owner', width: '16%', sortable: true, value: (p) => p.owner?.name || '',
      render: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12, background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', color: '#fff' }}>{p.owner?.name?.charAt(0).toUpperCase()}</Avatar>
          <Typography noWrap sx={{ fontSize: '0.85rem' }}>{p.owner?.name || '—'}</Typography>
        </Box>
      ),
    },
    { key: 'status', header: 'Status', width: '11%', sortable: true, value: (p) => p.status, render: (p) => <ProjectStatusChip status={p.status} /> },
    { key: 'priority', header: 'Priority', width: '11%', sortable: true, value: (p) => p.priority, render: (p) => <PriorityChip priority={p.priority} /> },
    {
      key: 'startDate', header: 'Timeline', width: '16%', sortable: true, value: (p) => p.startDate || '',
      render: (p) => <Typography noWrap sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{formatDate(p.startDate) || '—'} – {formatDate(p.endDate) || 'Ongoing'}</Typography>,
    },
    { key: 'createdAt', header: 'Added', width: '12%', sortable: true, value: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
  ];

  const rowActions = (p: Project) => (
    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
      <Tooltip title="View project" arrow><IconButton size="small" sx={{ color: '#4F46E5' }} onClick={(e) => { e.stopPropagation(); navigate(ROUTES.PROJECT_DETAIL(p.id)); }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
      {(isAdmin || p.owner?.id === user?.id) && (
        <Tooltip title="Delete project" arrow><IconButton size="small" sx={{ color: '#DC2626' }} onClick={(e) => { e.stopPropagation(); setToDelete(p); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
      )}
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title={scopeMine ? 'My Projects' : 'All Projects'}
        subtitle={pagination.total + ' projects'}
        action={<Button variant="contained" onClick={() => navigate(ROUTES.PROJECT_NEW)}>+ New Project</Button>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status || ''} label="Status" onChange={(e) => dispatch(setFilters({ status: e.target.value as ProjectStatus || undefined, page: 1 }))}>
            <MenuItem value="">All</MenuItem>
            {(['DRAFT','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED'] as ProjectStatus[]).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={filters.priority || ''} label="Priority" onChange={(e) => dispatch(setFilters({ priority: e.target.value as ProjectPriority || undefined, page: 1 }))}>
            <MenuItem value="">All</MenuItem>
            {(['LOW','MEDIUM','HIGH','CRITICAL'] as ProjectPriority[]).map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>

        <Box sx={{ ml: 'auto' }}>
          <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, i) => <Grid item key={i} xs={12} sm={6} md={4}><Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} /></Grid>)}
        </Grid>
      ) : list.length === 0 ? (
        <EmptyState title="No projects found" description={scopeMine ? "You haven't created any projects yet, and you're not on any project team." : 'Try adjusting your filters or create the first project.'} action={<Button variant="contained" onClick={() => navigate(ROUTES.PROJECT_NEW)}>Create Project</Button>} />
      ) : view === 'grid' ? (
        <Grid container spacing={3}>
          {list.map(p => <Grid item key={p.id} xs={12} sm={6} md={4}><ProjectCard project={p} canDelete={isAdmin || p.owner?.id === user?.id} onDelete={setToDelete} /></Grid>)}
        </Grid>
      ) : (
        <DataTablePro
          rows={list}
          columns={columns}
          getId={(p) => p.id}
          loading={loading}
          emptyText="No projects found"
          onRowClick={(p) => navigate(ROUTES.PROJECT_DETAIL(p.id))}
          rowActions={rowActions}
        />
      )}

      {view === 'grid' && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pagination.totalPages} page={pagination.page} onChange={(_, p) => dispatch(setFilters({ page: p }))} color="primary" />
        </Box>
      )}

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

export default ProjectsListPage;
