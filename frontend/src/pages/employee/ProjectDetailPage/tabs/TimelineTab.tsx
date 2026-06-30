import { Box, Typography, Paper } from '@mui/material';
import { FiberManualRecord as FiberManualRecordIcon } from '@mui/icons-material';
import { Project } from '../../../../types/project.types';
import { formatDateTime } from '../../../../utils/formatters';

interface Props { project: Project; }

interface TimelineEvent { label: string; date: string; color?: string; }

const TimelineTab = ({ project }: Props) => {
  const events: TimelineEvent[] = [
    { label: 'Project Created', date: project.createdAt, color: '#1976d2' },
    { label: 'Project Started', date: project.startDate, color: '#2e7d32' },
    { label: 'End Date', date: project.endDate || project.deadline || '', color: '#ed6c02' },
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Box sx={{ position: 'relative', pl: 3 }}>
      <Box sx={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, bgcolor: 'divider' }} />
      {events.map((event, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, position: 'relative' }}>
          <FiberManualRecordIcon sx={{ position: 'absolute', left: -14, color: event.color || 'primary.main', fontSize: 18 }} />
          <Paper sx={{ p: 2, ml: 2, flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>{event.label}</Typography>
            <Typography variant="caption" color="text.secondary">{formatDateTime(event.date)}</Typography>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default TimelineTab;
