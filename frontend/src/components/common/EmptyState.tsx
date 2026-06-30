import { Box, Typography } from '@mui/material';
import { Inbox as InboxIcon } from '@mui/icons-material';
import { ReactNode } from 'react';

interface Props { title?: string; description?: string; action?: ReactNode; icon?: ReactNode; }

const EmptyState = ({ title = 'No data found', description, action, icon }: Props) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, px: 2 }}>
    <Box sx={{ color: 'text.disabled', mb: 2 }}>
      {icon || <InboxIcon sx={{ fontSize: 64 }} />}
    </Box>
    <Typography variant="h6" color="text.secondary" gutterBottom>{title}</Typography>
    {description && <Typography variant="body2" color="text.disabled" align="center" sx={{ maxWidth: 360 }}>{description}</Typography>}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
);

export default EmptyState;
