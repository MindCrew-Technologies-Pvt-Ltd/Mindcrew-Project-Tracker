import { Box, Paper, Typography, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom';
import BrandMark from '../common/BrandMark';
import { ROUTES } from '../../constants/routes';

const AuthLayout = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 480 }}>
        <Button
          startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.HOME)}
          sx={{ mb: 1, color: 'text.secondary', textTransform: 'none' }}
        >
          Back to home
        </Button>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.25 }}>
            <BrandMark size={44} />
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary">ProjectTracker</Typography>
          <Typography variant="body2" color="text.secondary">Internal Project Repository</Typography>
        </Box>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Outlet />
        </Paper>
      </Box>
    </Box>
  );
};

export default AuthLayout;
