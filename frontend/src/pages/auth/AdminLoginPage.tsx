import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { loginThunk, clearError } from '../../store/slices/authSlice';
import { ROUTES } from '../../constants/routes';
import * as yup from 'yup';

const adminLoginSchema = yup.object({ email: yup.string().email('Invalid email').required('Email is required'), password: yup.string().required('Password is required') });

interface AdminLoginFormData { email: string; password: string; }

const AdminLoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [roleError, setRoleError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginFormData>({
    resolver: yupResolver(adminLoginSchema) as any,
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    dispatch(clearError());
    setRoleError('');
    const result = await dispatch(loginThunk(data));
    if (loginThunk.fulfilled.match(result)) {
      const role = result.payload?.data?.user?.role;
      if (role !== 'ADMIN') {
        setRoleError('Access denied. Admin accounts only.');
        return;
      }
      navigate(ROUTES.ADMIN_DASHBOARD);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Admin Login</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Restricted access — administrators only</Typography>

      {(error || roleError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => { dispatch(clearError()); setRoleError(''); }}>
          {roleError || error}
        </Alert>
      )}

      <TextField
        label="Email Address"
        fullWidth
        margin="normal"
        autoComplete="email"
        autoFocus
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Password"
        fullWidth
        margin="normal"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        error={!!errors.password}
        helperText={errors.password?.message}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        {...register('password')}
      />

      <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3, py: 1.5 }} disabled={loading}>
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
      </Button>
    </Box>
  );
};

export default AdminLoginPage;
