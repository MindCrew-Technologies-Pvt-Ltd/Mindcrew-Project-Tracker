import { useEffect, useState } from 'react';
import { Box, Grid, Button, MenuItem, Select, FormControl, InputLabel, ToggleButtonGroup, ToggleButton, Pagination, Skeleton } from '@mui/material';
import { GridView as GridViewIcon, List as ListIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk, setFilters } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import ProjectCard from '../../components/project/ProjectCard';
import DataTable from '../../components/data-display/DataTable';
import EmptyState from '../../components/common/EmptyState';
import ProjectStatusChip from '../../components/project/ProjectStatusChip';
import PriorityChip from '../../components/project/PriorityChip';
import { useDebounce } from '../../hooks/useDebounce';
import { ROUTES } from '../../constants/routes';
import { ProjectStatus, ProjectPriority } from '../../types/project.types';
import { formatDate } from '../../utils/formatters';

const ProjectsListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, filters, pagination, loading } = useAppSelector((s) => s.projects);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    dispatch(setFilters({ search: debouncedSearch, page: 1 }));
  }, [debouncedSearch, dispatch]);

  useEffect(() => {
    dispatch(fetchProjectsThunk(filters));
  }, [filters, dispatch]);

  const colDefs = [
    { field: 'name', headerName: 'Project', flex: 2 },
    { field: 'clientName', headerName: 'Client', flex: 1.5 },
    { field: 'status', headerName: 'Status', flex: 1, cellRenderer: (p: any) => <ProjectStatusChip status={p.value} /> },
    { field: 'priority', headerName: 'Priority', flex: 1, cellRenderer: (p: any) => <PriorityChip priority={p.value} /> },
    { field: 'startDate', headerName: 'Start', flex: 1, valueFormatter: (p: any) => formatDate(p.value) },
    { field: 'endDate', headerName: 'End', flex: 1, valueFormatter: (p: any) => formatDate(p.value) },
    { field: 'owner', headerName: 'Owner', flex: 1, valueFormatter: (p: any) => p.value?.name },
  ];

  return (
    <Box>
      <PageHeader
        title="Projects"
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
        <EmptyState title="No projects found" description="Try adjusting your filters or create your first project." action={<Button variant="contained" onClick={() => navigate(ROUTES.PROJECT_NEW)}>Create Project</Button>} />
      ) : view === 'grid' ? (
        <Grid container spacing={3}>
          {list.map(p => <Grid item key={p.id} xs={12} sm={6} md={4}><ProjectCard project={p} /></Grid>)}
        </Grid>
      ) : (
        <DataTable rowData={list} columnDefs={colDefs} onRowClicked={(p) => navigate(ROUTES.PROJECT_DETAIL(p.id))} />
      )}

      {view === 'grid' && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pagination.totalPages} page={pagination.page} onChange={(_, p) => dispatch(setFilters({ page: p }))} color="primary" />
        </Box>
      )}
    </Box>
  );
};

export default ProjectsListPage;
