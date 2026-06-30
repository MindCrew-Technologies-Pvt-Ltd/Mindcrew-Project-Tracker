import { useEffect, useState } from 'react';
import { Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ColDef } from 'ag-grid-community';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk, setFilters } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/data-display/DataTable';
import SearchBar from '../../components/common/SearchBar';
import ProjectStatusChip from '../../components/project/ProjectStatusChip';
import PriorityChip from '../../components/project/PriorityChip';
import { ROUTES } from '../../constants/routes';
import { ProjectStatus, Project } from '../../types/project.types';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/formatters';

const AdminProjectsListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, filters, pagination, loading } = useAppSelector((s) => s.projects);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => { dispatch(setFilters({ search: debouncedSearch, page: 1 })); }, [debouncedSearch, dispatch]);
  useEffect(() => { dispatch(fetchProjectsThunk({ ...filters, pageSize: 100 })); }, [filters, dispatch]);

  const colDefs: ColDef[] = [
    { headerName: 'Project', field: 'name', flex: 2 },
    { headerName: 'Client', field: 'clientName', flex: 1.5 },
    { headerName: 'Owner', field: 'owner', flex: 1.5, valueFormatter: (p: any) => p.value?.name },
    { headerName: 'Status', field: 'status', flex: 1, cellRenderer: (p: any) => <ProjectStatusChip status={p.value} /> },
    { headerName: 'Priority', field: 'priority', flex: 1, cellRenderer: (p: any) => <PriorityChip priority={p.value} /> },
    { headerName: 'Start', field: 'startDate', flex: 1, valueFormatter: (p: any) => formatDate(p.value) },
    { headerName: 'End', field: 'endDate', flex: 1, valueFormatter: (p: any) => formatDate(p.value) },
  ];

  return (
    <Box>
      <PageHeader title="All Projects" subtitle={pagination.total + ' projects'} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status || ''} label="Status" onChange={(e) => dispatch(setFilters({ status: e.target.value as ProjectStatus || undefined, page: 1 }))}>
            <MenuItem value="">All</MenuItem>
            {(['DRAFT','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED'] as ProjectStatus[]).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <DataTable rowData={list} columnDefs={colDefs} loading={loading} onRowClicked={(p: Project) => navigate(ROUTES.ADMIN_PROJECT_DETAIL(p.id))} />
    </Box>
  );
};

export default AdminProjectsListPage;
