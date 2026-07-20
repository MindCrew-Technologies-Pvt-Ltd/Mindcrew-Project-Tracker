import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem, Divider, Tooltip } from '@mui/material';
import { Menu as MenuIcon, AccountCircle as AccountCircleIcon, Logout as LogoutIcon, Lock as LockIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { } from './Sidebar';
import NotificationBell from '../common/NotificationBell';
import TimerWidget from '../timesheet/TimerWidget';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logoutThunk } from '../../store/slices/authSlice';
import { ROUTES } from '../../constants/routes';

interface Props { onMenuClick: () => void; sidebarWidth?: number; }

const Topbar = ({ onMenuClick, sidebarWidth = 248 }: Props) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await dispatch(logoutThunk());
    navigate(ROUTES.LOGIN);
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${sidebarWidth}px)` },
        ml: { md: `${sidebarWidth}px` },
        transition: 'width 0.25s ease, margin-left 0.25s ease',
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { md: 'none' }, color: 'text.primary' }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        <TimerWidget />

        <NotificationBell />

        <Tooltip title={user?.name || 'Account'} arrow>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
            <Avatar
              sx={{
                width: 34, height: 34,
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                fontSize: 13, fontWeight: 700, color: '#fff',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'scale(1.05)', boxShadow: '0 2px 10px rgba(79,70,229,0.4)' },
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 200 } } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { navigate(ROUTES.PROFILE); setAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2 }}>
            <AccountCircleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2">Profile</Typography>
          </MenuItem>
          <MenuItem onClick={() => { navigate(ROUTES.CHANGE_PASSWORD); setAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2 }}>
            <LockIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2">Change Password</Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.2, color: 'error.main', '&:hover': { bgcolor: 'rgba(181,71,71,0.06)' } }}>
            <LogoutIcon fontSize="small" />
            <Typography variant="body2" color="inherit">Logout</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
