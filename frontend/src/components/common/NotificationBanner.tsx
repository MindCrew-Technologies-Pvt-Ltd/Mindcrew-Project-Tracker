import { useState, useEffect } from 'react';
import { Alert, Button, Collapse, IconButton, Box } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/esm/Notifications';
import CloseIcon from '@mui/icons-material/esm/Close';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  requestNotificationPermission,
  checkPushSubscription,
} from '../../services/pushNotificationService';

const DISMISSED_KEY = 'push_notification_banner_dismissed';

/**
 * NotificationBanner
 * Shows a slim banner asking the user to enable push notifications.
 * - Only shows once: disappears permanently if the user clicks "Enable" or "Dismiss".
 * - Admin users are excluded (they don't receive reminders).
 * - Already-subscribed users never see it.
 */
const NotificationBanner = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Admins don't need push notifications (they get no reminders)
    if (!user || user.role === 'ADMIN') return;
    // Already dismissed by this user in this browser
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;
    // Browser doesn't support push
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) return;
    // Already has permission granted
    if (Notification.permission === 'granted') {
      // Make sure we have a subscription stored (could have been lost after refresh)
      checkPushSubscription().then((has) => {
        if (!has) setShow(true); // subscription lost, ask again
      });
      return;
    }
    // permission is 'default' (not asked yet)
    if (Notification.permission === 'default') {
      setShow(true);
    }
    // permission is 'denied' — we can't ask again, browser blocks it
  }, [user]);

  const handleEnable = async () => {
    setLoading(true);
    const result = await requestNotificationPermission();
    setLoading(false);
    if (result === 'subscribed') {
      setShow(false);
      localStorage.setItem(DISMISSED_KEY, 'true');
    } else if (result === 'denied') {
      setShow(false);
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  return (
    <Collapse in={show}>
      <Alert
        icon={<NotificationsIcon fontSize="small" />}
        severity="info"
        sx={{
          mb: 2,
          borderRadius: 2,
          alignItems: 'center',
          '& .MuiAlert-message': { flex: 1 },
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<NotificationsIcon sx={{ fontSize: 15 }} />}
              onClick={handleEnable}
              disabled={loading}
              sx={{ fontSize: '0.78rem', fontWeight: 600, py: 0.4, textTransform: 'none' }}
            >
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            <IconButton size="small" onClick={handleDismiss} title="Dismiss">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        Enable notifications to get leave request updates and daily timesheet reminders.
      </Alert>
    </Collapse>
  );
};

export default NotificationBanner;
