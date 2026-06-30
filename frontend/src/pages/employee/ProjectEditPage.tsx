import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Grid, TextField, Button, MenuItem, Select, FormControl, InputLabel, Chip, OutlinedInput, Typography, Alert, CircularProgress, Card, CardContent } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectByIdThunk, updateProjectThunk } from '../../store/slices/projectsSlice';
import { projectSchema } from '../../utils/validators';
import { TECHNOLOGY_OPTIONS, TAG_OPTIONS } from '../../constants/status';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ROUTES } from '../../constants/routes';
import { CreateProjectPayload, ProjectStatus, ProjectPriority } from '../../types/project.types';

const ProjectEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentProject: project, loading, error } = useAppSelector((s) => s.projects);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreateProjectPayload>({
    resolver: yupResolver(projectSchema) as any,
  });

  useEffect(() => { if (id) dispatch(fetchProjectByIdThunk(id)); }, [id, dispatch]);

  useEffect(() => {
    if (project) reset({
      name: project.name, clientName: project.clientName, description: project.description,
      startDate: project.startDate?.slice(0, 10), endDate: (project.endDate || project.deadline)?.slice(0, 10),
      status: project.status, priority: project.priority, technologies: project.technologies,
      tags: project.tags, repositoryUrl: project.repositoryUrl, liveUrl: project.liveUrl,
    });
  }, [project, reset]);

  if (loading && !project) return <LoadingSpinner />;
  if (!project) return null;

  const onSubmit = async (data: CreateProjectPayload) => {
    const result = await dispatch(updateProjectThunk({ id: project.id, payload: data }));
    if (updateProjectThunk.fulfilled.match(result)) navigate(ROUTES.PROJECT_DETAIL(project.id));
  };

  return (
    <Box>
      <PageHeader
        title="Edit Project"
        breadcrumbs={[{ label: 'Projects', href: ROUTES.PROJECTS }, { label: project.name, href: ROUTES.PROJECT_DETAIL(project.id) }, { label: 'Edit' }]}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Project Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField label="Project Name" fullWidth error={!!errors.name} helperText={errors.name?.message} {...register('name')} /></Grid>
                  <Grid item xs={12}><TextField label="Description" fullWidth multiline rows={3} error={!!errors.description} helperText={errors.description?.message} {...register('description')} /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Start Date" fullWidth type="date" InputLabelProps={{ shrink: true }} {...register('startDate')} /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="End Date" fullWidth type="date" InputLabelProps={{ shrink: true }} {...register('endDate')} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth><InputLabel>Status</InputLabel>
                      <Controller name="status" control={control} render={({ field }) => (
                        <Select {...field} label="Status">
                          {(['DRAFT','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED'] as ProjectStatus[]).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth><InputLabel>Priority</InputLabel>
                      <Controller name="priority" control={control} render={({ field }) => (
                        <Select {...field} label="Priority">
                          {(['LOW','MEDIUM','HIGH','CRITICAL'] as ProjectPriority[]).map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth><InputLabel>Technology Stack</InputLabel>
                      <Controller name="technologies" control={control} render={({ field }) => (
                        <Select {...field} multiple label="Technology Stack" input={<OutlinedInput label="Technology Stack" />}
                          renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map(v => <Chip key={v} label={v} size="small" />)}</Box>}
                        >
                          {TECHNOLOGY_OPTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth><InputLabel>Tags</InputLabel>
                      <Controller name="tags" control={control} render={({ field }) => (
                        <Select {...field} multiple label="Tags" input={<OutlinedInput label="Tags" />}
                          renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map(v => <Chip key={v} label={v} size="small" />)}</Box>}
                        >
                          {TAG_OPTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}><TextField label="Repository URL" fullWidth {...register('repositoryUrl')} /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Live URL" fullWidth {...register('liveUrl')} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Client Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField label="Client Name" fullWidth error={!!errors.clientName} helperText={errors.clientName?.message} {...register('clientName')} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(ROUTES.PROJECT_DETAIL(project.id))} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectEditPage;
