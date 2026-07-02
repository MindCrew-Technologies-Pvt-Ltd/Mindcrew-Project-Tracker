import { Box, Button, Typography, Stack } from '@mui/material';
import { Folder as FolderIcon, Login as LoginIcon, PersonAdd as PersonAddIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { ROUTES } from '../../constants/routes';

const NAVY = '#0A2947';
const SAND = '#F3E4C9';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  // A logged-in user shouldn't sit on the landing page.
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${NAVY} 0%, #123a63 100%)`,
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440, textAlign: 'center', color: '#fff' }}>
        <Box
          sx={{
            width: 64, height: 64, borderRadius: '16px', background: SAND, mx: 'auto', mb: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FolderIcon sx={{ color: NAVY, fontSize: 34 }} />
        </Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>ProjectTracker</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 5 }}>
          Internal Project Repository & Weekly Tracking
        </Typography>

        <Stack spacing={2} sx={{ maxWidth: 320, mx: 'auto' }}>
          <Button
            fullWidth size="large" variant="contained" startIcon={<LoginIcon />}
            onClick={() => navigate(ROUTES.LOGIN)}
            sx={{ py: 1.4, bgcolor: SAND, color: NAVY, fontWeight: 600, '&:hover': { bgcolor: '#EAD6B0' } }}
          >
            Employee Sign In
          </Button>
          <Button
            fullWidth size="large" variant="outlined" startIcon={<PersonAddIcon />}
            onClick={() => navigate(ROUTES.SIGNUP)}
            sx={{ py: 1.4, color: '#fff', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 600, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            Create an Account
          </Button>
          <Button
            fullWidth size="large" variant="text" startIcon={<AdminIcon />}
            onClick={() => navigate(ROUTES.ADMIN_LOGIN)}
            sx={{ py: 1.2, color: 'rgba(255,255,255,0.75)', fontWeight: 600, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            Admin Sign In
          </Button>
        </Stack>

        <Typography variant="caption" sx={{ display: 'block', mt: 5, color: 'rgba(255,255,255,0.4)' }}>
          v1.0.0 · ProjectTracker
        </Typography>
      </Box>
    </Box>
  );
};

export default LandingPage;
