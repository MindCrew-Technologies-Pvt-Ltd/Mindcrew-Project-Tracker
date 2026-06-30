import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment, Checkbox, FormControlLabel, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { loginThunk, clearError } from '../../store/slices/authSlice';
import { loginSchema } from '../../utils/validators';
import { ROUTES } from '../../constants/routes';

interface LoginFormData { email: string; password: string; rememberMe?: boolean; }

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema) as any,
  });

  const onSubmit = async (data: LoginFormData) => {
    dispatch(clearError());
    const result = await dispatch(loginThunk(data));
    if (loginThunk.fulfilled.match(result)) {
      const role = result.payload?.data?.user?.role;
      navigate(role === 'ADMIN' ? ROUTES.ADMIN_DASHBOARD : ROUTES.DASHBOARD);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Welcome back</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Sign in to your account</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>{error}</Alert>}

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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <FormControlLabel
          control={<Checkbox size="small" {...register('rememberMe')} />}
          label={<Typography variant="body2">Remember me</Typography>}
        />
        <RouterLink to={ROUTES.FORGOT_PASSWORD} style={{ textDecoration: 'none' }}>
          <Typography variant="body2" color="primary">Forgot password?</Typography>
        </RouterLink>
      </Box>

      <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2, mb: 2, py: 1.5 }} disabled={loading}>
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
      </Button>

      <Typography variant="body2" align="center">
        Don't have an account?{' '}
        <RouterLink to={ROUTES.SIGNUP} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography component="span" variant="body2" color="primary" fontWeight={600}>Sign up</Typography>
        </RouterLink>
      </Typography>
    </Box>
  );
};

export default LoginPage;
