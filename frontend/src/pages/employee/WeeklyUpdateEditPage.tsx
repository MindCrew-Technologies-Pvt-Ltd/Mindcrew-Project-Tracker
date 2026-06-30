import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Grid, TextField, Button, Card, CardContent, Alert, CircularProgress, Slider, Typography, MenuItem, Chip } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { updateWeeklyUpdateThunk } from '../../store/slices/weeklyUpdatesSlice';
import { weeklyUpdateSchema } from '../../utils/validators';
import PageHeader from '../../components/common/PageHeader';
import { ROUTES } from '../../constants/routes';
import { CreateWeeklyUpdatePayload } from '../../types/weeklyUpdate.types';

const WeeklyUpdateEditPage = () => {
  const { id: projectId, updateId } = useParams<{ id: string; updateId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { updates, loading, error } = useAppSelector((s) => s.weeklyUpdates);
  const update = updates[projectId || '']?.find(u => u.id === updateId);
  const [taskInput, setTaskInput] = useState('');
  const [plannedInput, setPlannedInput] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateWeeklyUpdatePayload>({
    resolver: yupResolver(weeklyUpdateSchema) as any,
  });

  const completion = watch('completionPercentage') ?? 0;
  const completedTasks = watch('completedTasks') || [];
  const plannedTasks = watch('plannedTasks') || [];

  useEffect(() => {
    if (update) reset({
      weekNumber: update.weekNumber, year: update.year,
      progressSummary: update.progressSummary,
      completedTasks: update.completedTasks || [],
      plannedTasks: update.plannedTasks || [],
      blockers: update.blockers, milestones: update.milestones,
      healthStatus: update.healthStatus,
      completionPercentage: update.completionPercentage,
      hoursLogged: update.hoursLogged,
    });
  }, [update, reset]);

  const addTask = (type: 'completed' | 'planned') => {
    if (type === 'completed' && taskInput.trim()) { setValue('completedTasks', [...completedTasks, taskInput.trim()]); setTaskInput(''); }
    if (type === 'planned' && plannedInput.trim()) { setValue('plannedTasks', [...plannedTasks, plannedInput.trim()]); setPlannedInput(''); }
  };
  const removeTask = (type: 'completed' | 'planned', i: number) => {
    if (type === 'completed') setValue('completedTasks', completedTasks.filter((_, idx) => idx !== i));
    if (type === 'planned') setValue('plannedTasks', plannedTasks.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (data: CreateWeeklyUpdatePayload) => {
    if (!projectId || !updateId) return;
    const result = await dispatch(updateWeeklyUpdateThunk({ projectId, updateId, payload: data }));
    if (updateWeeklyUpdateThunk.fulfilled.match(result)) navigate(ROUTES.PROJECT_DETAIL(projectId));
  };

  return (
    <Box>
      <PageHeader title="Edit Weekly Update" breadcrumbs={[{ label: 'Projects', href: ROUTES.PROJECTS }, { label: 'Project', href: ROUTES.PROJECT_DETAIL(projectId || '') }, { label: 'Edit Update' }]} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card><CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}><TextField label="Week Number" fullWidth type="number" inputProps={{ min: 1, max: 53 }} error={!!errors.weekNumber} helperText={errors.weekNumber?.message} {...register('weekNumber', { valueAsNumber: true })} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Year" fullWidth type="number" {...register('year', { valueAsNumber: true })} /></Grid>
            <Grid item xs={12}><TextField label="Progress Summary" fullWidth multiline rows={4} error={!!errors.progressSummary} helperText={errors.progressSummary?.message} {...register('progressSummary')} /></Grid>

            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} mb={1}>Completed Tasks</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" fullWidth value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask('completed'); } }} />
                <Button variant="outlined" onClick={() => addTask('completed')}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{completedTasks.map((t, i) => <Chip key={i} label={t} onDelete={() => removeTask('completed', i)} size="small" />)}</Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} mb={1}>Planned Tasks</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" fullWidth value={plannedInput} onChange={e => setPlannedInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask('planned'); } }} />
                <Button variant="outlined" onClick={() => addTask('planned')}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{plannedTasks.map((t, i) => <Chip key={i} label={t} onDelete={() => removeTask('planned', i)} size="small" />)}</Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Health Status" fullWidth select error={!!errors.healthStatus} {...register('healthStatus')}>
                {['ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETED'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField label="Hours Logged" fullWidth type="number" {...register('hoursLogged', { valueAsNumber: true })} /></Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Completion: {completion}%</Typography>
              <Slider value={completion} onChange={(_, v) => setValue('completionPercentage', v as number)} min={0} max={100} step={5} marks valueLabelDisplay="auto" />
            </Grid>
            <Grid item xs={12}><TextField label="Blockers" fullWidth multiline rows={2} {...register('blockers')} /></Grid>
            <Grid item xs={12}><TextField label="Milestones" fullWidth multiline rows={2} {...register('milestones')} /></Grid>
          </Grid>
          <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate(ROUTES.PROJECT_DETAIL(projectId || ''))} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </CardContent></Card>
    </Box>
  );
};

export default WeeklyUpdateEditPage;
