import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, IconButton, Popover, TextField, Switch, FormControlLabel, Autocomplete,
  Typography, Tooltip, Menu, MenuItem, Snackbar, Alert, CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon, Pause as PauseIcon, Stop as StopIcon, MoreVert as MoreIcon,
  AccessTime as TimerIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  fetchTimerThunk, startTimerThunk, pauseTimerThunk, resumeTimerThunk, stopTimerThunk, discardTimerThunk,
} from '../../store/slices/timesheetSlice';
import timesheetService from '../../services/timesheetService';
import { ProjectRef } from '../../types/timesheet.types';
import { minutesToHM, minutesToPretty } from '../../utils/timeFormat';

const INDIGO = '#4F46E5';

const TimerWidget = () => {
  const dispatch = useAppDispatch();
  const timer = useAppSelector((s) => s.timesheet.timer);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [project, setProject] = useState<ProjectRef | null>(null);
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [, setTick] = useState(0); // re-render every 30s so the elapsed label moves

  // Timestamp of the last server sync — the local display extrapolates from it.
  const syncedAtRef = useRef<number>(Date.now());

  useEffect(() => { dispatch(fetchTimerThunk()); }, [dispatch]);
  useEffect(() => { syncedAtRef.current = Date.now(); }, [timer]);

  // Running: tick locally every 30s + refetch the server state every 60s.
  useEffect(() => {
    if (!timer) return;
    const tickId = window.setInterval(() => setTick((t) => t + 1), 30_000);
    const pollId = window.setInterval(() => { dispatch(fetchTimerThunk()); }, 60_000);
    return () => { window.clearInterval(tickId); window.clearInterval(pollId); };
  }, [timer, dispatch]);

  // Recomputed on every render — the 30s tick above forces one while running.
  const elapsed = !timer
    ? 0
    : timer.isPaused
      ? timer.elapsedMinutes
      : timer.elapsedMinutes + Math.floor((Date.now() - syncedAtRef.current) / 60_000);

  const openPopover = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    if (projects.length === 0) {
      setProjectsLoading(true);
      timesheetService.getProjectOptions()
        .then(setProjects)
        .catch(() => setProjects([]))
        .finally(() => setProjectsLoading(false));
    }
  };

  const handleStart = async () => {
    if (!project) return;
    setBusy(true);
    const result = await dispatch(startTimerThunk({
      projectId: project.id,
      description: description.trim() || undefined,
      billable,
    }));
    setBusy(false);
    if (startTimerThunk.fulfilled.match(result)) {
      setAnchorEl(null);
      setDescription('');
      setBillable(true);
      setProject(null);
    } else {
      // 409 (a timer already exists) or any other failure: surface + resync.
      setSnack({ msg: (result.payload as string) || 'Could not start the timer', severity: 'error' });
      dispatch(fetchTimerThunk());
      setAnchorEl(null);
    }
  };

  const handlePauseResume = async () => {
    if (!timer) return;
    setBusy(true);
    const result = await dispatch(timer.isPaused ? resumeTimerThunk() : pauseTimerThunk());
    setBusy(false);
    if ((pauseTimerThunk.rejected.match(result) || resumeTimerThunk.rejected.match(result))) {
      setSnack({ msg: (result.payload as string) || 'Timer action failed', severity: 'error' });
      dispatch(fetchTimerThunk());
    }
  };

  const handleStop = async () => {
    if (!timer) return;
    const projectName = timer.project?.name || 'the project';
    setBusy(true);
    const result = await dispatch(stopTimerThunk());
    setBusy(false);
    if (stopTimerThunk.fulfilled.match(result)) {
      setSnack({ msg: `Saved ${minutesToPretty(result.payload.minutes)} to ${projectName}`, severity: 'success' });
    } else {
      setSnack({ msg: (result.payload as string) || 'Could not stop the timer', severity: 'error' });
      dispatch(fetchTimerThunk());
    }
  };

  const handleDiscard = async () => {
    setMenuEl(null);
    const result = await dispatch(discardTimerThunk());
    if (discardTimerThunk.rejected.match(result)) {
      setSnack({ msg: (result.payload as string) || 'Could not discard the timer', severity: 'error' });
      dispatch(fetchTimerThunk());
    }
  };

  return (
    <>
      {!timer ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<PlayIcon />}
          onClick={openPopover}
          sx={{
            borderColor: '#DFE2FA', color: INDIGO, textTransform: 'none', fontWeight: 600,
            borderRadius: '10px', px: 1.5, whiteSpace: 'nowrap',
            '&:hover': { borderColor: INDIGO, bgcolor: '#EEF0FF' },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Start timer</Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Timer</Box>
        </Button>
      ) : (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          border: '1px solid #DFE2FA', borderRadius: '10px', pl: 1.25, pr: 0.25, py: 0.25,
          bgcolor: timer.isPaused ? '#F8FAFC' : '#EEF0FF', maxWidth: 300,
        }}>
          <TimerIcon sx={{ fontSize: 16, color: timer.isPaused ? '#94A3B8' : INDIGO }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: timer.isPaused ? '#64748B' : INDIGO, fontVariantNumeric: 'tabular-nums' }}>
            {minutesToHM(elapsed)}
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.8rem', color: 'text.secondary', maxWidth: { xs: 60, sm: 120 } }} title={timer.project?.name}>
            {timer.project?.name}
          </Typography>
          {timer.isPaused && (
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#B45309', bgcolor: '#FEF3C7', px: 0.75, py: 0.1, borderRadius: 1 }}>
              Paused
            </Typography>
          )}
          <Tooltip title={timer.isPaused ? 'Resume' : 'Pause'} arrow>
            <span>
              <IconButton size="small" onClick={handlePauseResume} disabled={busy} sx={{ color: INDIGO }}>
                {timer.isPaused ? <PlayIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Stop & save" arrow>
            <span>
              <IconButton size="small" onClick={handleStop} disabled={busy} sx={{ color: '#DC2626' }}>
                <StopIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton size="small" onClick={(e) => setMenuEl(e.currentTarget)} sx={{ color: 'text.secondary' }}>
            <MoreIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
            <MenuItem onClick={handleDiscard} sx={{ color: 'error.main', fontSize: '0.875rem' }}>Discard timer</MenuItem>
          </Menu>
        </Box>
      )}

      <Popover
        open={Boolean(anchorEl) && !timer}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, p: 2, width: 300 } } }}
      >
        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Start timer</Typography>
        <Autocomplete
          size="small"
          options={projects}
          loading={projectsLoading}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={project}
          onChange={(_, v) => setProject(v)}
          renderInput={(params) => (
            <TextField
              {...params} label="Project" autoFocus
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {projectsLoading ? <CircularProgress size={14} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          sx={{ mb: 1.5 }}
        />
        <TextField
          size="small" fullWidth label="What are you working on?" value={description}
          onChange={(e) => setDescription(e.target.value)} sx={{ mb: 1 }}
        />
        <FormControlLabel
          control={<Switch size="small" checked={billable} onChange={(e) => setBillable(e.target.checked)} />}
          label={<Typography variant="body2">Billable</Typography>}
          sx={{ mb: 1 }}
        />
        <Button
          fullWidth variant="contained" startIcon={<PlayIcon />}
          disabled={!project || busy} onClick={handleStart}
        >
          {busy ? <CircularProgress size={20} color="inherit" /> : 'Start'}
        </Button>
      </Popover>

      <Snackbar
        open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity || 'success'} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </>
  );
};

export default TimerWidget;
