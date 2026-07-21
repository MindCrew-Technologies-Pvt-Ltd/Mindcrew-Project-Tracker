import { Box, Button, Typography, Stack } from '@mui/material';
import { Login as LoginIcon, PersonAdd as PersonAddIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import BrandMark from '../../components/common/BrandMark';
import { ROUTES } from '../../constants/routes';

const NAVY = '#0F1729';

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
        background: `linear-gradient(135deg, ${NAVY} 0%, #312E81 100%)`,
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440, textAlign: 'center', color: '#fff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandMark size={64} />
        </Box>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#FFFFFF' }}>ProjectTracker</Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 5 }}>
          Internal Project Repository & Weekly Tracking
        </Typography>

        <Stack spacing={2} sx={{ maxWidth: 320, mx: 'auto' }}>
          <Button
            fullWidth size="large" variant="contained" startIcon={<LoginIcon />}
            onClick={() => navigate(ROUTES.LOGIN)}
            sx={{ py: 1.4, background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', color: '#FFFFFF', fontWeight: 600, boxShadow: '0 6px 20px rgba(79,70,229,0.4)', '&:hover': { background: '#4338CA' } }}
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
