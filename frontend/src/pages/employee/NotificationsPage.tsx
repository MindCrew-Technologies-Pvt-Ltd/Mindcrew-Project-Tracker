import { Box, Card, CardContent, Typography, List, ListItem, ListItemText, Button, Divider, Chip, IconButton } from '@mui/material';
import { DoneAll as DoneAllIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
// import { useAppSelector } from '../../hooks/useAppSelector';
import { markAsReadThunk, markAllAsReadThunk } from '../../store/slices/notificationsSlice';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { formatRelative } from '../../utils/formatters';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationsPage = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount } = useNotifications();

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount + ' unread'}
        action={unreadCount > 0 ? <Button startIcon={<DoneAllIcon />} onClick={() => dispatch(markAllAsReadThunk())}>Mark all read</Button> : undefined}
      />
      <Card>
        <CardContent sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4 }}><EmptyState title="No notifications" description="You're all caught up!" /></Box>
          ) : (
            <List disablePadding>
              {notifications.map((n, i) => (
                <Box key={n.id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    sx={{ bgcolor: n.isRead ? 'transparent' : 'action.hover', py: 2 }}
                    secondaryAction={!n.isRead && (
                      <IconButton size="small" onClick={() => dispatch(markAsReadThunk(n.id))}><DoneAllIcon fontSize="small" /></IconButton>
                    )}
                  >
                    <ListItemText
                      primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={n.isRead ? 400 : 700}>{n.title}</Typography>
                        {!n.isRead && <Chip label="New" size="small" color="primary" />}
                      </Box>}
                      secondary={<><Typography variant="body2" color="text.secondary">{n.message}</Typography><Typography variant="caption" color="text.disabled">{formatRelative(n.createdAt)}</Typography></>}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationsPage;
