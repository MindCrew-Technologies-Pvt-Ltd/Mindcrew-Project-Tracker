import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, Divider, Tooltip, IconButton } from '@mui/material';
import { NavLink } from 'react-router-dom';
import BrandMark from '../common/BrandMark';
import {
  Dashboard as DashboardIcon, Folder as FolderIcon, FolderCopy as FolderCopyIcon, People as PeopleIcon,
  Assessment as AssessmentIcon, EditNote as EditNoteIcon,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  AccessTime as AccessTimeIcon, FactCheck as FactCheckIcon, Insights as InsightsIcon,
  Tune as TuneIcon, SmartToyOutlined as AiIcon,
} from '@mui/icons-material';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';

export const DRAWER_WIDTH = 248;
export const DRAWER_WIDTH_COLLAPSED = 64;

const NAVY = '#0F1729';
const SAND = '#4F46E5';

const employeeNav = [
  { label: 'My Dashboard', icon: <DashboardIcon fontSize="small" />, to: ROUTES.DASHBOARD },
  { label: 'My Projects', icon: <FolderIcon fontSize="small" />, to: ROUTES.MY_PROJECTS },
  { label: 'All Projects', icon: <FolderCopyIcon fontSize="small" />, to: ROUTES.PROJECTS },
];

// Employees log/see their own time; admins never fill a timesheet — they get
// the daily review view instead of My Timesheet.
const timesheetNav = [
  { label: 'My Timesheet', icon: <AccessTimeIcon fontSize="small" />, to: ROUTES.TIMESHEET },
  { label: 'Approvals', icon: <FactCheckIcon fontSize="small" />, to: ROUTES.TIMESHEET_APPROVALS },
  { label: 'Time Reports', icon: <InsightsIcon fontSize="small" />, to: ROUTES.TIMESHEET_REPORTS },
  { label: 'AI Integrations', icon: <AiIcon fontSize="small" />, to: ROUTES.INTEGRATIONS },
];

const adminTimesheetNav = [
  { label: 'Daily Timesheets', icon: <AccessTimeIcon fontSize="small" />, to: ROUTES.TIMESHEET_DAILY },
  { label: 'Approvals', icon: <FactCheckIcon fontSize="small" />, to: ROUTES.TIMESHEET_APPROVALS },
  { label: 'Time Reports', icon: <InsightsIcon fontSize="small" />, to: ROUTES.TIMESHEET_REPORTS },
  { label: 'AI Integrations', icon: <AiIcon fontSize="small" />, to: ROUTES.INTEGRATIONS },
];

const adminNav = [
  { label: 'Users', icon: <PeopleIcon fontSize="small" />, to: ROUTES.ADMIN_USERS },
  { label: 'Edit Requests', icon: <EditNoteIcon fontSize="small" />, to: ROUTES.ADMIN_EDIT_REQUESTS },
  { label: 'Reports', icon: <AssessmentIcon fontSize="small" />, to: ROUTES.ADMIN_REPORTS },
  { label: 'Timesheet Settings', icon: <TuneIcon fontSize="small" />, to: ROUTES.TIMESHEET_SETTINGS },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItemSx = (collapsed: boolean) => ({
  mx: collapsed ? 0.75 : 1.5,
  px: collapsed ? 1 : 1.5,
  borderRadius: '10px',
  mb: 0.5,
  justifyContent: collapsed ? 'center' : 'flex-start',
  minHeight: 40,
  color: 'rgba(255,255,255,0.72)',
  transition: 'all 0.2s ease',
  '& .MuiListItemIcon-root': {
    color: 'rgba(255,255,255,0.56)',
    minWidth: collapsed ? 'unset' : 36,
    transition: 'color 0.2s ease',
    justifyContent: 'center',
  },
  '&:hover': {
    background: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    '& .MuiListItemIcon-root': { color: '#FFFFFF' },
    transform: collapsed ? 'scale(1.05)' : 'translateX(2px)',
  },
  '&.active': {
    background: `linear-gradient(135deg, ${SAND} 0%, #6366F1 100%)`,
    color: '#FFFFFF',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
    '& .MuiListItemIcon-root': { color: '#FFFFFF' },
    '&:hover': { background: '#4338CA', transform: collapsed ? 'scale(1.05)' : 'translateX(2px)' },
  },
  '&:active': { transform: 'scale(0.97)' },
});

interface ContentProps { onClose?: () => void; collapsed: boolean; onToggleCollapse: () => void; }

const SidebarContent = ({ onClose, collapsed, onToggleCollapse }: ContentProps) => {
  const { isAdmin } = useAuth();

  const NavItem = ({ item }: { item: { label: string; icon: React.ReactNode; to: string } }) => {
    const btn = (
      <ListItemButton
        component={NavLink}
        to={item.to}
        onClick={onClose}
        sx={navItemSx(collapsed)}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{ fontSize: 13.5, fontWeight: 'inherit', noWrap: true }}
          />
        )}
      </ListItemButton>
    );

    if (collapsed) {
      return (
        <ListItem disablePadding>
          <Tooltip title={item.label} placement="right" arrow>
            {btn}
          </Tooltip>
        </ListItem>
      );
    }
    return <ListItem disablePadding>{btn}</ListItem>;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: NAVY, overflow: 'hidden' }}>
      {/* Logo + collapse toggle. Collapsed: stacked vertically so nothing
          overflows the 64px rail. */}
      <Box sx={{
        px: collapsed ? 0 : 2.5, py: 2,
        display: 'flex', alignItems: 'center',
        flexDirection: collapsed ? 'column' : 'row',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 1, minHeight: 64,
      }}>
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
            <BrandMark size={32} />
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#FFFFFF', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                ProjectTracker
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                Workspace
              </Typography>
            </Box>
          </Box>
        )}

        {collapsed && <BrandMark size={32} />}

        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right" arrow>
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              width: 26, height: 26,
              transition: 'all 0.2s ease',
              '&:hover': { color: '#FFFFFF', background: 'rgba(255,255,255,0.12)' },
              flexShrink: 0,
            }}
          >
            {collapsed ? <ChevronRightIcon sx={{ fontSize: 16 }} /> : <ChevronLeftIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Nav items */}
      <List sx={{ flex: 1, pt: 1.5, px: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && (
          <Typography variant="caption" sx={{ px: 2.5, display: 'block', mb: 0.5, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.07em', fontSize: '0.65rem' }}>
            NAVIGATION
          </Typography>
        )}

        {employeeNav.map((item) => <NavItem key={item.to} item={item} />)}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />
        {!collapsed && (
          <Typography variant="caption" sx={{ px: 2.5, display: 'block', mb: 0.5, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.07em', fontSize: '0.65rem' }}>
            TIMESHEET
          </Typography>
        )}
        {(isAdmin ? adminTimesheetNav : timesheetNav).map((item) => <NavItem key={item.to} item={item} />)}

        {isAdmin && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />
            {!collapsed && (
              <Typography variant="caption" sx={{ px: 2.5, display: 'block', mb: 0.5, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.07em', fontSize: '0.65rem' }}>
                ADMIN
              </Typography>
            )}
            {adminNav.map((item) => <NavItem key={item.to} item={item} />)}
          </>
        )}
      </List>

      {/* Footer */}
      {!collapsed && (
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>
            v1.0.0 · ProjectTracker
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const Sidebar = ({ mobileOpen, onClose, collapsed, onToggleCollapse }: Props) => {
  const width = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <>
      {/* Mobile: temporary drawer (always full width, no collapse) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', background: '#0F1729' },
        }}
      >
        <SidebarContent onClose={onClose} collapsed={false} onToggleCollapse={() => {}} />
      </Drawer>

      {/* Desktop: permanent drawer with collapse support */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width,
          flexShrink: 0,
          transition: 'width 0.25s ease',
          '& .MuiDrawer-paper': {
            width,
            border: 'none',
            background: '#0F1729',
            boxShadow: '2px 0 12px rgba(10,41,71,0.12)',
            overflowX: 'hidden',
            transition: 'width 0.25s ease',
          },
        }}
        open
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </Drawer>
    </>
  );
};

export default Sidebar;
