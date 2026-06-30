import { Box, Paper, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => (
  <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
    <Box sx={{ width: '100%', maxWidth: 480 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary">ProjectTracker</Typography>
        <Typography variant="body2" color="text.secondary">Internal Project Repository</Typography>
      </Box>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Outlet />
      </Paper>
    </Box>
  </Box>
);

export default AuthLayout;
