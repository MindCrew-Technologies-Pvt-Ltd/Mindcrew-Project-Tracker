import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Grid, TextField, Button, Card, CardContent, Alert, CircularProgress, Slider, Typography, MenuItem, Chip } from '@mui/material';
import { useState } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { createWeeklyUpdateThunk } from '../../store/slices/weeklyUpdatesSlice';
import { weeklyUpdateSchema } from '../../utils/validators';
import PageHeader from '../../components/common/PageHeader';
import { ROUTES } from '../../constants/routes';
import { CreateWeeklyUpdatePayload } from '../../types/weeklyUpdate.types';

// ISO-8601 week number + week-year for any given date.
const isoWeek = (date: Date): { week: number; year: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = d.getTime();
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = 1 + Math.round(((firstThursday - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getUTCDay() + 6) % 7)) / 7);
  return { week, year: d.getUTCFullYear() };
};

const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const WeeklyUpdateNewPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.weeklyUpdates);
  const [taskInput, setTaskInput] = useState('');
  const [plannedInput, setPlannedInput] = useState('');
  const [weekDate, setWeekDate] = useState(todayISO());

  const initial = isoWeek(new Date());
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateWeeklyUpdatePayload>({
    resolver: yupResolver(weeklyUpdateSchema) as any,
    defaultValues: {
      weekNumber: initial.week,
      year: initial.year,
      completionPercentage: 0,
      healthStatus: 'ON_TRACK',
      completedTasks: [],
      plannedTasks: [],
    },
  });

  // Pick any day → derive the ISO week number + year for that week.
  const handleWeekDateChange = (value: string) => {
    setWeekDate(value);
    if (!value) return;
    const { week, year } = isoWeek(new Date(value));
    setValue('weekNumber', week, { shouldValidate: true });
    setValue('year', year, { shouldValidate: true });
  };

  const completion = watch('completionPercentage');
  const completedTasks = watch('completedTasks') || [];
  const plannedTasks = watch('plannedTasks') || [];

  const addTask = (type: 'completed' | 'planned') => {
    if (type === 'completed' && taskInput.trim()) { setValue('completedTasks', [...completedTasks, taskInput.trim()]); setTaskInput(''); }
    if (type === 'planned' && plannedInput.trim()) { setValue('plannedTasks', [...plannedTasks, plannedInput.trim()]); setPlannedInput(''); }
  };
  const removeTask = (type: 'completed' | 'planned', i: number) => {
    if (type === 'completed') setValue('completedTasks', completedTasks.filter((_, idx) => idx !== i));
    if (type === 'planned') setValue('plannedTasks', plannedTasks.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (data: CreateWeeklyUpdatePayload) => {
    if (!projectId) return;
    const result = await dispatch(createWeeklyUpdateThunk({ projectId, payload: data }));
    if (createWeeklyUpdateThunk.fulfilled.match(result)) navigate(ROUTES.PROJECT_DETAIL(projectId));
  };

  return (
    <Box>
      <PageHeader title="Add Weekly Update" breadcrumbs={[{ label: 'Projects', href: ROUTES.PROJECTS }, { label: 'Project', href: ROUTES.PROJECT_DETAIL(projectId || '') }, { label: 'Add Update' }]} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card><CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Select Week (pick any day in the week)" fullWidth type="date"
                InputLabelProps={{ shrink: true }}
                value={weekDate} onChange={(e) => handleWeekDateChange(e.target.value)}
                helperText="Opens a calendar — the week number & year are set automatically"
              />
            </Grid>
            <Grid item xs={12} sm={6}><TextField label="Week Number" fullWidth type="number" InputProps={{ readOnly: true }} error={!!errors.weekNumber} helperText={errors.weekNumber?.message} {...register('weekNumber', { valueAsNumber: true })} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Year" fullWidth type="number" InputProps={{ readOnly: true }} error={!!errors.year} helperText={errors.year?.message} {...register('year', { valueAsNumber: true })} /></Grid>

            <Grid item xs={12}><TextField label="Progress Summary" fullWidth multiline rows={4} placeholder="Summarize this week's progress..." error={!!errors.progressSummary} helperText={errors.progressSummary?.message} {...register('progressSummary')} /></Grid>

            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} mb={1}>Completed Tasks</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" fullWidth placeholder="Add a completed task and press Enter" value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask('completed'); } }} />
                <Button variant="outlined" onClick={() => addTask('completed')}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{completedTasks.map((t, i) => <Chip key={i} label={t} onDelete={() => removeTask('completed', i)} size="small" />)}</Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} mb={1}>Planned Tasks (Next Week)</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField size="small" fullWidth placeholder="Add a planned task and press Enter" value={plannedInput} onChange={e => setPlannedInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask('planned'); } }} />
                <Button variant="outlined" onClick={() => addTask('planned')}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{plannedTasks.map((t, i) => <Chip key={i} label={t} onDelete={() => removeTask('planned', i)} size="small" />)}</Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Health Status" fullWidth select defaultValue="ON_TRACK" error={!!errors.healthStatus} helperText={errors.healthStatus?.message} {...register('healthStatus')}>
                {['ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETED'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField label="Hours Logged" fullWidth type="number" inputProps={{ min: 0, max: 168 }} {...register('hoursLogged', { valueAsNumber: true })} /></Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Completion: {completion}%</Typography>
              <Slider value={completion} onChange={(_, v) => setValue('completionPercentage', v as number)} min={0} max={100} step={5} marks valueLabelDisplay="auto" />
            </Grid>

            <Grid item xs={12}><TextField label="Blockers (optional)" fullWidth multiline rows={2} {...register('blockers')} /></Grid>
            <Grid item xs={12}><TextField label="Milestones (optional)" fullWidth multiline rows={2} {...register('milestones')} /></Grid>
          </Grid>
          <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate(ROUTES.PROJECT_DETAIL(projectId || ''))} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Submit Update'}
            </Button>
          </Box>
        </Box>
      </CardContent></Card>
    </Box>
  );
};

export default WeeklyUpdateNewPage;
