import { useState, useEffect } from 'react';
import { Box, Grid, TextField, MenuItem, Select, FormControl, InputLabel, Button } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectsThunk, setFilters } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import ProjectCard from '../../components/project/ProjectCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SearchBar from '../../components/common/SearchBar';
import { useDebounce } from '../../hooks/useDebounce';
import { TECHNOLOGY_OPTIONS } from '../../constants/status';
import { ProjectStatus } from '../../types/project.types';

const SearchPage = () => {
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.projects);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tech, setTech] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    dispatch(setFilters({ search: debouncedSearch, status: status as ProjectStatus || undefined, technology: tech || undefined, tags: tags.join(',') || undefined, page: 1 }));
  }, [debouncedSearch, status, tech, tags, dispatch]);

  useEffect(() => {
    dispatch(fetchProjectsThunk({ search: debouncedSearch, status: status as ProjectStatus || undefined, technology: tech || undefined }));
  }, [debouncedSearch, status, tech, dispatch]);

  const handleReset = () => { setSearch(''); setStatus(''); setTech(''); setTags([]); setStartDate(''); setEndDate(''); };

  return (
    <Box>
      <PageHeader title="Search Projects" subtitle="Find projects by name, client, technology, or tags" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or client..." fullWidth={false} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {(['DRAFT','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED'] as ProjectStatus[]).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Technology</InputLabel>
          <Select value={tech} label="Technology" onChange={(e) => setTech(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {TECHNOLOGY_OPTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Start After" type="date" size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <TextField label="End Before" type="date" size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button variant="outlined" onClick={handleReset}>Reset</Button>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <EmptyState title="No projects found" description="Try different search terms or filters." />
      ) : (
        <Grid container spacing={3}>
          {list.map(p => <Grid item key={p.id} xs={12} sm={6} md={4}><ProjectCard project={p} /></Grid>)}
        </Grid>
      )}
    </Box>
  );
};

export default SearchPage;
