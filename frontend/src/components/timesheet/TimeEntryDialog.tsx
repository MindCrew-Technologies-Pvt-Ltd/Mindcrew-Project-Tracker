import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid,
  FormControlLabel, Switch, Autocomplete, CircularProgress, Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { timeEntrySchema } from '../../utils/validators';
import timesheetService from '../../services/timesheetService';
import { CreateTimeEntryPayload, TimeEntry, ProjectRef } from '../../types/timesheet.types';
import { dateKey } from '../../utils/timeFormat';

interface FormValues {
  projectId: string;
  date: string;
  hours: number;
  minutes: number;
  description?: string;
  billable?: boolean;
}

interface Props {
  open: boolean;
  /** When set, the dialog edits this entry; otherwise it creates a new one. */
  entry?: TimeEntry | null;
  /** Prefills for create mode. */
  defaultDate?: string;
  defaultProjectId?: string;
  /** Daily-lock rule: the date field is fixed (admins / rejected weeks may change it). */
  dateLocked?: boolean;
  saving?: boolean;
  errorMsg?: string | null;
  onSave: (payload: CreateTimeEntryPayload) => void;
  onClose: () => void;
}

const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const TimeEntryDialog = ({ open, entry, defaultDate, defaultProjectId, dateLocked, saving, errorMsg, onSave, onClose }: Props) => {
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: yupResolver(timeEntrySchema) as any,
    defaultValues: { projectId: '', date: todayISO(), hours: 0, minutes: 0, description: '', billable: true },
  });

  useEffect(() => {
    if (!open) return;
    setProjectsLoading(true);
    timesheetService.getProjectOptions()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      reset({
        projectId: entry.projectId,
        date: dateKey(entry.date),
        hours: Math.floor(entry.minutes / 60),
        minutes: entry.minutes % 60,
        description: entry.description || '',
        billable: entry.billable,
      });
    } else {
      reset({
        projectId: defaultProjectId || '',
        date: defaultDate || todayISO(),
        hours: 0,
        minutes: 0,
        description: '',
        billable: true,
      });
    }
  }, [open, entry, defaultDate, defaultProjectId, reset]);

  const submit = (data: FormValues) => {
    onSave({
      projectId: data.projectId,
      date: data.date,
      hours: data.hours,
      minutes: data.minutes,
      description: data.description || undefined,
      billable: data.billable ?? true,
    });
  };

  // The edited entry's project may not be in the picker options (e.g. archived) — merge it in.
  const options = entry && !projects.some((p) => p.id === entry.projectId)
    ? [entry.project, ...projects]
    : projects;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{entry ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
      <DialogContent>
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={options}
                  loading={projectsLoading}
                  getOptionLabel={(o) => o.name}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={options.find((p) => p.id === field.value) || null}
                  onChange={(_, v) => field.onChange(v?.id || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Project"
                      error={!!errors.projectId}
                      helperText={errors.projectId?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {projectsLoading ? <CircularProgress size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
              disabled={dateLocked}
              error={!!errors.date}
              helperText={errors.date?.message || (dateLocked ? 'Same-day entry — days lock at 11:59 PM' : undefined)}
              {...register('date')}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="Hours" type="number" fullWidth inputProps={{ min: 0, max: 24 }}
              error={!!errors.hours} helperText={errors.hours?.message}
              {...register('hours', { valueAsNumber: true })}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="Minutes" type="number" fullWidth inputProps={{ min: 0, max: 59 }}
              error={!!errors.minutes} helperText={errors.minutes?.message}
              {...register('minutes', { valueAsNumber: true })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description (optional)" fullWidth multiline rows={2}
              {...register('description')}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="billable"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value ?? true} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Billable"
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={saving}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TimeEntryDialog;
