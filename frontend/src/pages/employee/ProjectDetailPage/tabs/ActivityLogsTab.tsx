import { useEffect } from 'react';
import { Box, List, ListItem, ListItemText, Typography, Chip, Divider } from '@mui/material';
import axiosInstance from '../../../../services/axiosInstance';
import { useState } from 'react';
import { ActivityLog } from '../../../../types/activityLog.types';
import { formatDateTime } from '../../../../utils/formatters';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import EmptyState from '../../../../components/common/EmptyState';

interface Props { projectId: string; }

const ActivityLogsTab = ({ projectId }: Props) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/activity-logs', { params: { projectId } })
      .then(r => setLogs(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <LoadingSpinner />;
  if (logs.length === 0) return <EmptyState title="No activity yet" />;

  return (
    <List>
      {logs.map((log, i) => (
        <Box key={log.id}>
          {i > 0 && <Divider />}
          <ListItem>
            <ListItemText
              primary={<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Chip label={log.action} size="small" variant="outlined" /><Typography variant="body2">{log.description}</Typography></Box>}
              secondary={<Typography variant="caption" color="text.secondary">{log.user?.name} · {formatDateTime(log.createdAt)}</Typography>}
            />
          </ListItem>
        </Box>
      ))}
    </List>
  );
};

export default ActivityLogsTab;
