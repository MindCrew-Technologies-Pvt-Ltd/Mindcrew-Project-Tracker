import { IconButton, Badge, Popover, Box, Typography, List, ListItemButton, ListItemText, Button, Divider, CircularProgress } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { markAsReadThunk, markAllAsReadThunk } from '../../store/slices/notificationsSlice';
import { formatRelative } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { notifications, unreadCount, loading } = useNotifications();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const recent = notifications.slice(0, 5);

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480 } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={() => dispatch(markAllAsReadThunk())}>Mark all read</Button>
          )}
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        ) : recent.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>No notifications</Typography>
        ) : (
          <List disablePadding>
            {recent.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => dispatch(markAsReadThunk(n.id))}
                sx={{ bgcolor: n.isRead ? 'transparent' : 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={n.isRead ? 400 : 600}>{n.title}</Typography>}
                  secondary={<><Typography variant="caption" display="block">{n.message}</Typography><Typography variant="caption" color="text.disabled">{formatRelative(n.createdAt)}</Typography></>}
                />
              </ListItemButton>
            ))}
          </List>
        )}
        <Divider />
        <Box sx={{ p: 1 }}>
          <Button fullWidth size="small" onClick={() => { navigate(ROUTES.NOTIFICATIONS); setAnchorEl(null); }}>View all notifications</Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
