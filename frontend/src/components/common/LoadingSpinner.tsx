import { Box, CircularProgress } from '@mui/material';

interface Props { fullScreen?: boolean; size?: number; }

const LoadingSpinner = ({ fullScreen = false, size = 40 }: Props) => {
  if (fullScreen) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={size} />
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
      <CircularProgress size={size} />
    </Box>
  );
};

export default LoadingSpinner;
