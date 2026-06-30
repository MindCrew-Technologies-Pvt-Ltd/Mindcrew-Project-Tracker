import { Card, CardContent, Typography, Box, Chip, LinearProgress, Grid, Divider, Collapse, Button } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { useState } from 'react';
import { WeeklyUpdate } from '../../types/weeklyUpdate.types';

const healthColor = (h: string) => ({ ON_TRACK: 'success', AT_RISK: 'warning', DELAYED: 'error', COMPLETED: 'info' }[h] || 'default') as any;

interface Props { update: WeeklyUpdate; onEdit?: () => void; onDelete?: () => void; canEdit?: boolean; }

const WeeklyUpdateCard = ({ update, onEdit, onDelete, canEdit }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>Week {update.weekNumber} / {update.year}</Typography>
            <Typography variant="caption" color="text.secondary">by {update.author?.name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={update.healthStatus?.replace('_', ' ')} color={healthColor(update.healthStatus)} size="small" />
            <Chip label={update.completionPercentage + '%'} color={update.completionPercentage >= 80 ? 'success' : update.completionPercentage >= 50 ? 'warning' : 'error'} size="small" />
          </Box>
        </Box>

        <LinearProgress variant="determinate" value={update.completionPercentage} sx={{ mb: 2, borderRadius: 1, height: 6 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{update.progressSummary}</Typography>

        {update.hoursLogged && (
          <Grid container spacing={1} sx={{ mb: 1.5 }}>
            <Grid item xs={6}><Typography variant="caption" color="text.secondary">Hours Logged</Typography><Typography variant="body2" fontWeight={600}>{update.hoursLogged}h</Typography></Grid>
          </Grid>
        )}

        <Button size="small" onClick={() => setExpanded(!expanded)} endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
          {expanded ? 'Show less' : 'Show more'}
        </Button>

        <Collapse in={expanded}>
          <Divider sx={{ my: 1 }} />
          {update.completedTasks?.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Completed Tasks</Typography>
              {update.completedTasks.map((t, i) => <Typography key={i} variant="body2" sx={{ mt: 0.25 }}>• {t}</Typography>)}
            </Box>
          )}
          {update.plannedTasks?.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Planned Tasks</Typography>
              {update.plannedTasks.map((t, i) => <Typography key={i} variant="body2" sx={{ mt: 0.25 }}>• {t}</Typography>)}
            </Box>
          )}
          {update.blockers && <Box sx={{ mb: 1.5 }}><Typography variant="caption" color="text.secondary" fontWeight={600}>Blockers</Typography><Typography variant="body2" sx={{ mt: 0.5 }}>{update.blockers}</Typography></Box>}
          {update.milestones && <Box sx={{ mb: 1.5 }}><Typography variant="caption" color="text.secondary" fontWeight={600}>Milestones</Typography><Typography variant="body2" sx={{ mt: 0.5 }}>{update.milestones}</Typography></Box>}

          {canEdit && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {onEdit && <Button size="small" variant="outlined" onClick={onEdit}>Edit</Button>}
              {onDelete && <Button size="small" variant="outlined" color="error" onClick={onDelete}>Delete</Button>}
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default WeeklyUpdateCard;
